import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const baseWhere = { tenantId: { in: scopeIds }, status: "ACTIVE" as const, role: { notIn: [Role.CANDIDATE] } };

  const [effectif, payroll, byDept, nouveaux, ouvriers] = await Promise.all([
    prisma.user.count({ where: baseWhere }),
    prisma.user.aggregate({ where: { ...baseWhere, baseSalary: { not: null } }, _sum: { baseSalary: true } }),
    prisma.user.groupBy({ by: ["department"], where: baseWhere, _count: { _all: true }, _sum: { baseSalary: true } }),
    prisma.user.count({ where: { ...baseWhere, hireDate: { gte: monthStart } } }),
    prisma.user.count({ where: { ...baseWhere, role: Role.WORKER } }),
  ]);

  const departements = byDept
    .map((d) => ({
      departement: d.department ?? "Non renseigné",
      effectif: d._count._all,
      masseSalariale: (d._sum.baseSalary ?? 0n).toString(),
    }))
    .sort((a, b) => b.effectif - a.effectif);

  return NextResponse.json({
    effectif,
    ouvriers,
    cadresEtBureau: effectif - ouvriers,
    masseSalariale: (payroll._sum.baseSalary ?? 0n).toString(),
    nouveauxCeMois: nouveaux,
    departements,
  });
}
