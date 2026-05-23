import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, ValidationStatus } from "@prisma/client";

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

  const [pendingByType, pendingTotal, sites, newMarkets, decidedThisMonth] = await Promise.all([
    prisma.validation.groupBy({
      by: ["type"],
      where: { tenantId: { in: scopeIds }, status: ValidationStatus.PENDING },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.validation.count({ where: { tenantId: { in: scopeIds }, status: ValidationStatus.PENDING } }),
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds }, status: { not: "ARCHIVED" } },
      select: { budget: true, contract: { select: { currentAmount: true } } },
    }),
    prisma.site.count({ where: { tenantId: { in: scopeIds }, createdAt: { gte: monthStart } } }),
    prisma.validation.count({
      where: { tenantId: { in: scopeIds }, status: { in: [ValidationStatus.APPROVED, ValidationStatus.REJECTED] }, decisionAt: { gte: monthStart } },
    }),
  ]);

  const valeurMarches = sites.reduce((s, x) => s + (x.contract?.currentAmount ?? x.budget), 0n);

  return NextResponse.json({
    decisions: {
      enAttente: pendingTotal,
      traiteesCeMois: decidedThisMonth,
      parType: pendingByType
        .map((t) => ({ type: t.type, count: t._count._all, montant: (t._sum.amount ?? 0n).toString() }))
        .sort((a, b) => b.count - a.count),
    },
    marches: {
      nombre: sites.length,
      valeurTotale: valeurMarches.toString(),
      nouveauxCeMois: newMarkets,
    },
  });
}
