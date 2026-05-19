import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.ACCOUNTANT];

// Familles SYSCOHADA agrégées au 1er chiffre du compte.
// Charges (classe 6), Produits (classe 7).
const FAMILIES: Array<{ key: string; label: string; prefix: string; kind: "expense" | "revenue" }> = [
  { key: "purchases", label: "Achats consommés", prefix: "60", kind: "expense" },
  { key: "services", label: "Services extérieurs", prefix: "61", kind: "expense" },
  { key: "transport", label: "Transports", prefix: "62", kind: "expense" },
  { key: "other_external", label: "Autres charges externes", prefix: "63", kind: "expense" },
  { key: "taxes", label: "Impôts et taxes", prefix: "64", kind: "expense" },
  { key: "payroll", label: "Charges de personnel", prefix: "66", kind: "expense" },
  { key: "financial", label: "Charges financières", prefix: "67", kind: "expense" },
  { key: "depreciation", label: "Dot. amort. & prov.", prefix: "68", kind: "expense" },
  { key: "revenue", label: "Ventes / Production", prefix: "70", kind: "revenue" },
  { key: "subsidies", label: "Subventions / autres produits", prefix: "75", kind: "revenue" },
];

function previousYearPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return `${y - 1}-${String(m).padStart(2, "0")}`;
}

async function sumByFamily(
  tenantId: string,
  period: string
): Promise<Record<string, bigint>> {
  // On agrège par signe : charges (cl. 6) = solde débiteur, produits (cl. 7) = solde créditeur.
  const result: Record<string, bigint> = {};
  for (const f of FAMILIES) {
    const lines = await prisma.accountingLine.findMany({
      where: {
        account: { startsWith: f.prefix },
        entry: { tenantId, period, status: { not: "DRAFT" } },
      },
      select: { debit: true, credit: true },
    });
    const total = lines.reduce(
      (s, l) => s + (f.kind === "expense" ? l.debit - l.credit : l.credit - l.debit),
      0n
    );
    result[f.key] = total;
  }
  return result;
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG / Comptable" }, { status: 403 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
  const previousPeriod = previousYearPeriod(period);

  const [current, previous] = await Promise.all([
    sumByFamily(session.tenantId, period),
    sumByFamily(session.tenantId, previousPeriod),
  ]);

  const items = FAMILIES.map((f) => {
    const cur = current[f.key] ?? 0n;
    const prev = previous[f.key] ?? 0n;
    const delta = cur - prev;
    const pct = prev === 0n ? null : Number((delta * 10_000n) / (prev < 0n ? -prev : prev)) / 100;
    return {
      key: f.key,
      label: f.label,
      kind: f.kind,
      current: cur.toString(),
      previous: prev.toString(),
      delta: delta.toString(),
      pct, // null si N-1 = 0
    };
  });

  return NextResponse.json({ period, previousPeriod, items });
}
