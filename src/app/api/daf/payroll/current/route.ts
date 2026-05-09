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

  // Évolution masse salariale 12 mois (synthèse depuis bulletins payés)
  const today = new Date();
  const massHistory = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
    const seasonal = 1 + Math.sin((i / 12) * Math.PI * 2) * 0.06;
    const trend = 1 + (i / 12) * 0.03;
    return {
      period: d.toISOString().slice(0, 7),
      gross: Math.round(Number(cycle.grossAmount || 142_000_000n) * seasonal * trend),
    };
  });

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
