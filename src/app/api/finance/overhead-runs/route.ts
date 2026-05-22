import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { overheadPreviewSchema } from "@/schemas/finance";
import { computeOverheadBasis } from "@/lib/cpt/analytical";
import { Role, OverheadRunStatus, type Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

// GET — historique des répartitions de charges siège.
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const runs = await prisma.overheadRun.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { period: "desc" },
    take: 24,
  });

  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      period: r.period,
      totalAmount: r.totalAmount.toString(),
      status: r.status,
      basis: r.basis,
      executedAt: r.executedAt?.toISOString() ?? null,
    })),
  });
}

// POST — calcule et enregistre une répartition en attente (PENDING) pour la
// période. N'applique aucun mouvement : prévisualisation persistée.
export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  try {
    const data = overheadPreviewSchema.parse(await req.json());
    const total = BigInt(data.totalAmount);
    const scopeIds = await getTenantScopeIds(session.tenantId);

    const existing = await prisma.overheadRun.findUnique({
      where: { tenantId_period: { tenantId: session.tenantId, period: data.period } },
      select: { id: true, status: true },
    });
    if (existing && existing.status === OverheadRunStatus.APPLIED) {
      return NextResponse.json({ error: "Une répartition est déjà appliquée pour cette période" }, { status: 409 });
    }

    const accounts = await prisma.projectAccount.findMany({
      where: { tenantId: { in: scopeIds }, isActive: true },
      include: {
        site: {
          select: { id: true, code: true, name: true, budget: true, contract: { select: { currentAmount: true } } },
        },
      },
    });
    if (accounts.length === 0) {
      return NextResponse.json({ error: "Aucun compte projet actif à répartir" }, { status: 400 });
    }

    const { lines, totalMarket } = computeOverheadBasis(
      accounts.map((a) => ({
        id: a.id,
        siteId: a.siteId,
        code: a.site.code,
        name: a.site.name,
        marketAmount: a.site.contract?.currentAmount ?? a.site.budget,
      })),
      total,
    );

    const basis = { totalMarket: totalMarket.toString(), lines } as unknown as Prisma.InputJsonValue;

    const run = existing
      ? await prisma.overheadRun.update({
          where: { id: existing.id },
          data: { totalAmount: total, basis, status: OverheadRunStatus.PENDING },
        })
      : await prisma.overheadRun.create({
          data: { tenantId: session.tenantId, period: data.period, totalAmount: total, basis, status: OverheadRunStatus.PENDING },
        });

    return NextResponse.json({
      id: run.id,
      period: run.period,
      totalAmount: run.totalAmount.toString(),
      status: run.status,
      basis: run.basis,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/finance/overhead-runs]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
