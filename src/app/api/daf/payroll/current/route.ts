import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const cycle = await prisma.payrollCycle.findFirst({
    where: { tenantId: session.tenantId },
    orderBy: { period: "desc" },
  });

  if (!cycle) {
    return NextResponse.json({ error: "Aucun cycle de paie trouvé" }, { status: 404 });
  }

  // Évolution masse salariale 12 mois — vraie agrégation des PayrollCycle
  // de chaque mois (grossAmount par période). On fallback à 0 pour les mois
  // sans cycle (au lieu d'inventer une saisonnalité fictive).
  const today = new Date();
  const past12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
    return d.toISOString().slice(0, 7);
  });
  const cycles = await prisma.payrollCycle.findMany({
    where: { tenantId: session.tenantId, period: { in: past12 } },
    select: { period: true, grossAmount: true },
  });
  const grossByPeriod = new Map(cycles.map((c) => [c.period, Number(c.grossAmount)]));
  const massHistory = past12.map((period) => ({
    period,
    gross: grossByPeriod.get(period) ?? 0,
  }));

  return NextResponse.json({
    id: cycle.id,
    period: cycle.period,
    status: cycle.status,
    totalBulletins: cycle.totalBulletins,
    grossAmount: cycle.grossAmount.toString(),
    employerCharges: cycle.employerCharges.toString(),
    netToPay: cycle.netToPay.toString(),
    startedAt: cycle.startedAt.toISOString(),
    calculatedAt: cycle.calculatedAt?.toISOString() ?? null,
    n1ValidatedAt: cycle.n1ValidatedAt?.toISOString() ?? null,
    n2ValidatedAt: cycle.n2ValidatedAt?.toISOString() ?? null,
    n3ValidatedAt: cycle.n3ValidatedAt?.toISOString() ?? null,
    paidAt: cycle.paidAt?.toISOString() ?? null,
    dipeSubmittedAt: cycle.dipeSubmittedAt?.toISOString() ?? null,
    warnings: cycle.warnings,
    massHistory,
  });
}
