import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

/**
 * Échéancier / balance âgée par tiers (façon Sage).
 *
 *  - kind=supplier (401x) : dette fournisseur = Σ crédit − Σ débit par tiers,
 *    lignes non lettrées uniquement.
 *  - kind=client   (411x) : créance client = Σ débit − Σ crédit par tiers.
 *
 * Chaque ligne non lettrée est âgée à partir de sa date d'écriture et tombée
 * dans un bucket 0-30 / 31-60 / 61-90 / >90 jours. Le solde par tiers est
 * la somme des montants signés en attente.
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const kind = (new URL(req.url).searchParams.get("kind") ?? "supplier") as "supplier" | "client";
  const prefix = kind === "client" ? "41" : "40";

  // Périmètre : groupe entier + chantiers assignés si applicable.
  const scopeIds = await getTenantScopeIds(session.tenantId);
  const allowed = await getAccessibleSiteIds(session.sub);
  const entryWhere: Record<string, unknown> = { tenantId: { in: scopeIds } };
  if (allowed !== null) entryWhere.siteId = { in: allowed };

  const lines = await prisma.entryLine.findMany({
    where: {
      entry: entryWhere,
      accountCode: { startsWith: prefix },
      thirdPartyId: { not: null },
      lettering: null,
    },
    select: {
      thirdPartyId: true,
      debit: true,
      credit: true,
      entry: { select: { entryDate: true, reference: true } },
    },
  });

  const today = Date.now();
  type Bucket = "b0_30" | "b31_60" | "b61_90" | "b90p";
  interface TierAgg {
    tier: string;
    total: bigint;
    b0_30: bigint;
    b31_60: bigint;
    b61_90: bigint;
    b90p: bigint;
    oldestDays: number;
    lineCount: number;
  }
  const map = new Map<string, TierAgg>();

  for (const l of lines) {
    const tier = l.thirdPartyId!;
    const amount = kind === "supplier"
      ? BigInt(l.credit) - BigInt(l.debit) // dette fournisseur
      : BigInt(l.debit) - BigInt(l.credit); // créance client
    if (amount === 0n) continue;
    const ageDays = Math.max(0, Math.floor((today - l.entry.entryDate.getTime()) / 86_400_000));
    const bucket: Bucket = ageDays <= 30 ? "b0_30" : ageDays <= 60 ? "b31_60" : ageDays <= 90 ? "b61_90" : "b90p";
    const cur = map.get(tier) ?? { tier, total: 0n, b0_30: 0n, b31_60: 0n, b61_90: 0n, b90p: 0n, oldestDays: 0, lineCount: 0 };
    cur.total += amount;
    cur[bucket] += amount;
    cur.oldestDays = Math.max(cur.oldestDays, ageDays);
    cur.lineCount += 1;
    map.set(tier, cur);
  }

  // Résolution lisible : certaines anciennes écritures stockent l'ID du
  // fournisseur (cuid) dans thirdPartyId au lieu du nom. On remplace par le
  // nom quand on a une correspondance.
  let nameMap = new Map<string, string>();
  if (kind === "supplier") {
    const cuidTiers = Array.from(map.keys()).filter((t) => /^cm[a-z0-9]{20,}$/i.test(t));
    if (cuidTiers.length > 0) {
      const suppliers = await prisma.supplier.findMany({
        where: { id: { in: cuidTiers }, tenantId: { in: scopeIds } },
        select: { id: true, name: true },
      });
      nameMap = new Map(suppliers.map((s) => [s.id, s.name]));
    }
  }

  // Trie par solde décroissant (en valeur absolue).
  const items = Array.from(map.values())
    .filter((a) => a.total !== 0n)
    .sort((a, b) => (b.total > a.total ? 1 : b.total < a.total ? -1 : 0))
    .map((a) => ({
      tier: nameMap.get(a.tier) ?? a.tier,
      total: a.total.toString(),
      b0_30: a.b0_30.toString(),
      b31_60: a.b31_60.toString(),
      b61_90: a.b61_90.toString(),
      b90p: a.b90p.toString(),
      oldestDays: a.oldestDays,
      lineCount: a.lineCount,
    }));

  const totals = items.reduce(
    (s, i) => ({
      total: s.total + BigInt(i.total),
      b0_30: s.b0_30 + BigInt(i.b0_30),
      b31_60: s.b31_60 + BigInt(i.b31_60),
      b61_90: s.b61_90 + BigInt(i.b61_90),
      b90p: s.b90p + BigInt(i.b90p),
    }),
    { total: 0n, b0_30: 0n, b31_60: 0n, b61_90: 0n, b90p: 0n },
  );

  return NextResponse.json({
    kind,
    items,
    totals: {
      total: totals.total.toString(),
      b0_30: totals.b0_30.toString(),
      b31_60: totals.b31_60.toString(),
      b61_90: totals.b61_90.toString(),
      b90p: totals.b90p.toString(),
    },
    tierCount: items.length,
  });
}
