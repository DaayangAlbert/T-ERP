import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.ACCOUNTANT];

// Seuil au-delà duquel un montant "rond" devient suspect (1 M FCFA).
const ROUND_AMOUNT_THRESHOLD = 1_000_000n;
const ROUND_AMOUNT_MODULO = 1_000_000n;

type Severity = "danger" | "warning" | "info";

interface Anomaly {
  id: string;
  severity: Severity;
  category:
    | "UNBALANCED"
    | "DUPLICATE"
    | "SUSPENSE_UNCLEARED"
    | "POST_CLOSING"
    | "ROUND_AMOUNT";
  title: string;
  detail: string;
  reference?: string;
  entryId?: string;
  amount?: string;
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG / Comptable" }, { status: 403 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);

  const entries = await prisma.accountingEntry.findMany({
    where: { tenantId: session.tenantId, period },
    select: {
      id: true,
      reference: true,
      label: true,
      journal: true,
      date: true,
      totalDebit: true,
      totalCredit: true,
      createdAt: true,
      status: true,
    },
  });

  const closing = await prisma.monthlyClosingChecklist.findFirst({
    where: { tenantId: session.tenantId, period },
    select: { status: true, updatedAt: true },
  });
  const lockedAt = closing?.status === "CLOSED" ? closing.updatedAt : null;

  const anomalies: Anomaly[] = [];

  // 1) Écritures déséquilibrées
  for (const e of entries) {
    if (e.totalDebit !== e.totalCredit) {
      anomalies.push({
        id: `unb-${e.id}`,
        severity: "danger",
        category: "UNBALANCED",
        title: "Écriture déséquilibrée",
        detail: `${e.label} — Débit ${e.totalDebit} ≠ Crédit ${e.totalCredit}`,
        reference: e.reference,
        entryId: e.id,
        amount: e.totalDebit.toString(),
      });
    }
  }

  // 2) Doublons potentiels (même libellé + même montant + même date)
  const seen = new Map<string, { ref: string; id: string }[]>();
  for (const e of entries) {
    const key = `${e.label}|${e.totalDebit}|${e.date.toISOString().slice(0, 10)}`;
    const arr = seen.get(key) ?? [];
    arr.push({ ref: e.reference, id: e.id });
    seen.set(key, arr);
  }
  for (const [, arr] of seen) {
    if (arr.length > 1) {
      anomalies.push({
        id: `dup-${arr[0].id}`,
        severity: "warning",
        category: "DUPLICATE",
        title: `Doublon potentiel × ${arr.length}`,
        detail: `Mêmes libellé/montant/date : ${arr.map((x) => x.ref).join(", ")}`,
        entryId: arr[0].id,
      });
    }
  }

  // 3) Comptes de suspens 47x non soldés (somme nette ≠ 0)
  const suspenseLines = await prisma.accountingLine.findMany({
    where: {
      account: { startsWith: "47" },
      entry: { tenantId: session.tenantId, period },
    },
    select: { account: true, debit: true, credit: true },
  });
  const suspenseByAccount = new Map<string, bigint>();
  for (const l of suspenseLines) {
    suspenseByAccount.set(l.account, (suspenseByAccount.get(l.account) ?? 0n) + l.debit - l.credit);
  }
  for (const [account, balance] of suspenseByAccount) {
    if (balance !== 0n) {
      anomalies.push({
        id: `susp-${account}`,
        severity: "warning",
        category: "SUSPENSE_UNCLEARED",
        title: `Compte de suspens ${account} non soldé`,
        detail: `Solde ${balance.toString()} FCFA — à apurer avant clôture`,
        amount: balance.toString(),
      });
    }
  }

  // 4) Écritures saisies après verrouillage de la période
  if (lockedAt) {
    for (const e of entries) {
      if (e.createdAt > lockedAt) {
        anomalies.push({
          id: `post-${e.id}`,
          severity: "danger",
          category: "POST_CLOSING",
          title: "Écriture sur période clôturée",
          detail: `${e.label} créée le ${e.createdAt.toISOString().slice(0, 10)} — période verrouillée le ${lockedAt.toISOString().slice(0, 10)}`,
          reference: e.reference,
          entryId: e.id,
          amount: e.totalDebit.toString(),
        });
      }
    }
  }

  // 5) Montants ronds suspects (multiple de 1 M FCFA > seuil) en journal OD
  for (const e of entries) {
    if (
      e.journal === "OD" &&
      e.totalDebit >= ROUND_AMOUNT_THRESHOLD &&
      e.totalDebit % ROUND_AMOUNT_MODULO === 0n
    ) {
      anomalies.push({
        id: `round-${e.id}`,
        severity: "info",
        category: "ROUND_AMOUNT",
        title: "Montant rond en OD",
        detail: `${e.label} — ${e.totalDebit.toString()} FCFA (multiple exact de 1 M)`,
        reference: e.reference,
        entryId: e.id,
        amount: e.totalDebit.toString(),
      });
    }
  }

  // Tri : danger > warning > info, puis par titre
  const order: Record<Severity, number> = { danger: 0, warning: 1, info: 2 };
  anomalies.sort((a, b) => order[a.severity] - order[b.severity] || a.title.localeCompare(b.title));

  const countsBySeverity = anomalies.reduce(
    (acc, a) => {
      acc[a.severity] += 1;
      return acc;
    },
    { danger: 0, warning: 0, info: 0 } as Record<Severity, number>
  );

  return NextResponse.json({
    period,
    total: anomalies.length,
    countsBySeverity,
    items: anomalies.slice(0, 100),
  });
}
