import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { Role, CashDirection, CptEntryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [
  Role.DAF,
  Role.ACCOUNTANT,
  Role.DG,
  Role.TECH_DIRECTOR,
  Role.TENANT_ADMIN,
  Role.SUPER_ADMIN,
];

const PAGE_SIZE = 50;

type SourceType = "ENTRY" | "CASHBOX";

interface UnifiedMovement {
  id: string;
  source: SourceType;
  sourceLabel: string; // "521000 · UBA" pour banque, "Caisse CHT-2026-018" pour caisse
  direction: "IN" | "OUT";
  amount: string;
  label: string;
  reference: string | null;
  counterparty: string | null;
  siteId: string | null;
  siteCode: string | null;
  occurredAt: string;
}

const ACCOUNT_LABELS: Record<string, string> = {
  "521": "Banque",
  "531": "Caisse siège",
  "532": "Caisse chantier",
};

function accountLabel(accountCode: string): string {
  const prefix3 = accountCode.slice(0, 3);
  return ACCOUNT_LABELS[prefix3] ?? `Compte ${accountCode}`;
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const role = session.role as Role;
  if (!ALLOWED.includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const direction = url.searchParams.get("direction"); // IN | OUT
  const source = url.searchParams.get("source") as SourceType | null;
  const siteIdFilter = url.searchParams.get("siteId");
  const q = url.searchParams.get("q")?.trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  const allowedSites = await getAccessibleSiteIds(session.sub);
  const isTechDirector = role === Role.TECH_DIRECTOR;
  const requireSite = isTechDirector;

  // ─── Source 1 : Écritures comptables validées avec une ligne classe 5 ──
  // Sens OHADA : ligne sur 5xx avec debit > 0  = entrée  d'argent (5 augmente)
  //              ligne sur 5xx avec credit > 0 = sortie  d'argent (5 diminue)
  let entryLines: Array<{
    id: string;
    accountCode: string;
    description: string;
    debit: bigint;
    credit: bigint;
    siteId: string | null;
    entry: {
      id: string;
      reference: string;
      description: string;
      entryDate: Date;
      siteId: string | null;
    };
  }> = [];
  if (source !== "CASHBOX") {
    const where: Record<string, unknown> = {
      accountCode: { startsWith: "5" },
      entry: {
        tenantId: session.tenantId,
        status: CptEntryStatus.VALIDATED,
        ...(fromDate || toDate
          ? {
              entryDate: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
    };
    if (requireSite) {
      (where.entry as Record<string, unknown>).siteId = { not: null };
    }
    if (allowedSites !== null) {
      (where.entry as Record<string, unknown>).siteId = { in: allowedSites };
    }
    if (siteIdFilter) {
      (where.entry as Record<string, unknown>).siteId = siteIdFilter;
    }

    entryLines = await prisma.entryLine.findMany({
      where,
      orderBy: { entry: { entryDate: "desc" } },
      take: 500,
      include: {
        entry: {
          select: {
            id: true,
            reference: true,
            description: true,
            entryDate: true,
            siteId: true,
          },
        },
      },
    });
  }

  // ─── Source 2 : Mouvements caisse chantier ──────────────────────────
  let cashboxMovements: Array<{
    id: string;
    direction: CashDirection;
    amount: bigint;
    reason: string;
    reference: string | null;
    occurredAt: Date;
    cashbox: { siteId: string; site: { code: string; name: string } };
  }> = [];
  if (source !== "ENTRY") {
    const where: Record<string, unknown> = {
      cashbox: { site: { tenantId: session.tenantId } },
    };
    if (fromDate || toDate) {
      where.occurredAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    }
    if (direction === "IN") where.direction = CashDirection.IN;
    if (direction === "OUT") where.direction = CashDirection.OUT;
    if (allowedSites !== null) {
      where.cashbox = { site: { tenantId: session.tenantId }, siteId: { in: allowedSites } };
    }
    if (siteIdFilter) {
      where.cashbox = { ...(where.cashbox as object), siteId: siteIdFilter };
    }

    cashboxMovements = await prisma.cashboxMovement.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 500,
      include: {
        cashbox: {
          select: { siteId: true, site: { select: { code: true, name: true } } },
        },
      },
    });
  }

  // ─── Filtrage par sens sur les lignes d'écriture ────────────────────
  const filteredEntryLines = direction
    ? entryLines.filter((l) =>
        direction === "IN" ? l.debit > 0n : l.credit > 0n
      )
    : entryLines;

  // ─── Lookup siteCode batch ──────────────────────────────────────────
  const siteIds = new Set<string>();
  for (const l of filteredEntryLines) {
    if (l.siteId) siteIds.add(l.siteId);
    if (l.entry.siteId) siteIds.add(l.entry.siteId);
  }
  const sites = siteIds.size
    ? await prisma.site.findMany({
        where: { id: { in: Array.from(siteIds) } },
        select: { id: true, code: true },
      })
    : [];
  const codeBySiteId = new Map(sites.map((s) => [s.id, s.code]));

  // ─── Fusion ─────────────────────────────────────────────────────────
  const unified: UnifiedMovement[] = [
    ...filteredEntryLines.map((l): UnifiedMovement => {
      const isIn = l.debit > 0n;
      const amount = isIn ? l.debit : l.credit;
      const siteId = l.siteId ?? l.entry.siteId;
      return {
        id: `entry-${l.id}`,
        source: "ENTRY",
        sourceLabel: `${l.accountCode} · ${accountLabel(l.accountCode)}`,
        direction: isIn ? "IN" : "OUT",
        amount: amount.toString(),
        label: l.entry.description || l.description,
        reference: l.entry.reference,
        counterparty: l.description !== l.entry.description ? l.description : null,
        siteId,
        siteCode: siteId ? codeBySiteId.get(siteId) ?? null : null,
        occurredAt: l.entry.entryDate.toISOString(),
      };
    }),
    ...cashboxMovements.map((m): UnifiedMovement => ({
      id: `cash-${m.id}`,
      source: "CASHBOX",
      sourceLabel: `Caisse ${m.cashbox.site.code}`,
      direction: m.direction === CashDirection.IN ? "IN" : "OUT",
      amount: m.amount.toString(),
      label: m.reason,
      reference: m.reference,
      counterparty: null,
      siteId: m.cashbox.siteId,
      siteCode: m.cashbox.site.code,
      occurredAt: m.occurredAt.toISOString(),
    })),
  ];

  // ─── Recherche textuelle ────────────────────────────────────────────
  const filtered = q
    ? unified.filter(
        (u) =>
          u.label.toLowerCase().includes(q) ||
          (u.counterparty?.toLowerCase().includes(q) ?? false) ||
          (u.reference?.toLowerCase().includes(q) ?? false) ||
          u.sourceLabel.toLowerCase().includes(q)
      )
    : unified;

  filtered.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  // ─── Summary ────────────────────────────────────────────────────────
  let totalIn = 0n;
  let totalOut = 0n;
  for (const u of filtered) {
    if (u.direction === "IN") totalIn += BigInt(u.amount);
    else totalOut += BigInt(u.amount);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return NextResponse.json({
    items: pageItems,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages,
    summary: {
      totalIn: totalIn.toString(),
      totalOut: totalOut.toString(),
      net: (totalIn - totalOut).toString(),
      countEntry: filteredEntryLines.length,
      countCashbox: cashboxMovements.length,
    },
    scope: {
      role,
      restrictedToSites: requireSite,
      isDirection: allowedSites === null,
    },
  });
}
