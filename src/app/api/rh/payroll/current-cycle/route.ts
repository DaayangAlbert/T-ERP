/**
 * Cycle de paie courant (du mois). Si aucun cycle n'existe pour le mois en
 * cours, on crée un cycle DRAFT initialisé avec l'effectif réel actif.
 *
 * KPIs calculés depuis la BDD :
 *   - totalBulletins      = nb users actifs (potentiel de bulletins)
 *   - inputsSaved         = count PayrollInput réels sur le cycle
 *   - journaliersTotal    = count users contractType=JOURNALIER
 *   - overtimeHours       = sum des heures sup saisies
 *   - advancesCount       = count inputs catégorie="Avances"
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ContractType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const tenantId = session.tenantId;
  const period = new Date().toISOString().slice(0, 7);

  // Effectif actif → potentiel bulletins
  const activeHeadcount = await prisma.user.count({
    where: {
      tenantId,
      status: "ACTIVE",
      role: { notIn: ["CANDIDATE", "SUPER_ADMIN"] },
    },
  });

  // Création opportuniste du cycle s'il n'existe pas
  let cycle = await prisma.payrollCycle.findFirst({ where: { tenantId, period } });
  if (!cycle) {
    cycle = await prisma.payrollCycle.findFirst({
      where: { tenantId },
      orderBy: { period: "desc" },
    });
  }
  if (!cycle) {
    cycle = await prisma.payrollCycle.create({
      data: {
        tenantId,
        period,
        status: "DRAFT",
        startedAt: new Date(),
        totalBulletins: activeHeadcount,
      },
    });
  }

  // Stats réelles sur le cycle courant
  const [inputsCount, journaliersCount, overtimeAgg, advancesCount] = await Promise.all([
    prisma.payrollInput.count({ where: { payrollCycleId: cycle.id } }),
    prisma.user.count({
      where: { tenantId, status: "ACTIVE", contractType: ContractType.JOURNALIER },
    }),
    prisma.payrollInput.aggregate({
      where: { payrollCycleId: cycle.id },
      _sum: { overtimeHours: true },
    }),
    prisma.payrollInput.count({
      where: { payrollCycleId: cycle.id, advances: { gt: 0n } },
    }),
  ]);

  const totalBulletins = cycle.totalBulletins || activeHeadcount;

  return NextResponse.json({
    id: cycle.id,
    period: cycle.period,
    status: cycle.status,
    startedAt: cycle.startedAt.toISOString(),
    calculatedAt: cycle.calculatedAt?.toISOString() ?? null,
    n1ValidatedAt: cycle.n1ValidatedAt?.toISOString() ?? null,
    n2ValidatedAt: cycle.n2ValidatedAt?.toISOString() ?? null,
    n3ValidatedAt: cycle.n3ValidatedAt?.toISOString() ?? null,
    paidAt: cycle.paidAt?.toISOString() ?? null,
    totalBulletins,
    kpis: {
      totalBulletins,
      inputsSaved: inputsCount,
      journaliersTotal: journaliersCount,
      overtimeHours: Math.round(overtimeAgg._sum.overtimeHours ?? 0),
      advancesCount,
    },
  });
}
