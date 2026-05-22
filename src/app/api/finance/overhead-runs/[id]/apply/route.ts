import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import {
  Role,
  OverheadRunStatus,
  CptDirection,
  ProjectAccountEntryType,
  type Prisma,
} from "@prisma/client";
import type { OverheadBasisLine } from "@/lib/cpt/analytical";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

/**
 * Applique une répartition PENDING : débite chaque compte projet de sa
 * quote-part (OVERHEAD_SALARY) et crédite le compte salaire global, de façon
 * atomique. Idempotent : une répartition déjà appliquée est refusée.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const run = await prisma.overheadRun.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!run) return NextResponse.json({ error: "Répartition introuvable" }, { status: 404 });
  if (run.status === OverheadRunStatus.APPLIED) {
    return NextResponse.json({ error: "Répartition déjà appliquée" }, { status: 409 });
  }

  const basis = run.basis as unknown as { totalMarket: string; lines: OverheadBasisLine[] };
  const lines = (basis?.lines ?? []).filter((l) => BigInt(l.share) > 0n);
  if (lines.length === 0) {
    return NextResponse.json({ error: "Rien à répartir (quote-parts nulles)" }, { status: 400 });
  }

  // Recharge les comptes projet pour calculer les soldes à jour.
  const scopeIds = await getTenantScopeIds(session.tenantId);
  const accounts = await prisma.projectAccount.findMany({
    where: { id: { in: lines.map((l) => l.accountId) }, tenantId: { in: scopeIds }, isActive: true },
    select: { id: true, balance: true, site: { select: { code: true } } },
  });
  const accById = new Map(accounts.map((a) => [a.id, a]));
  for (const l of lines) {
    if (!accById.has(l.accountId)) {
      return NextResponse.json(
        { error: `Compte projet ${l.code} introuvable ou clôturé — recalculez la répartition` },
        { status: 409 },
      );
    }
  }

  const salary = await prisma.salaryAccount.upsert({
    where: { tenantId: session.tenantId },
    create: { tenantId: session.tenantId },
    update: {},
    select: { id: true, balance: true },
  });

  const occurredAt = new Date();
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  let salaryBalance = salary.balance;
  let totalApplied = 0n;

  for (const l of lines) {
    const acc = accById.get(l.accountId)!;
    const share = BigInt(l.share);
    const projectBalanceAfter = acc.balance - share; // débit
    salaryBalance += share; // crédit côté compte salaire
    totalApplied += share;

    ops.push(
      prisma.projectAccountMovement.create({
        data: {
          accountId: acc.id,
          type: ProjectAccountEntryType.OVERHEAD_SALARY,
          direction: CptDirection.DEBIT,
          amount: share,
          reason: `Quote-part masse salariale siège ${run.period}`,
          reference: `OVH-${run.period}`,
          balanceAfter: projectBalanceAfter,
          occurredAt,
          recordedById: session.sub,
          overheadRunId: run.id,
        },
      }),
      prisma.projectAccount.update({
        where: { id: acc.id },
        data: { balance: projectBalanceAfter },
      }),
      prisma.salaryAccountMovement.create({
        data: {
          accountId: salary.id,
          direction: CptDirection.CREDIT,
          amount: share,
          reason: `Quote-part ${l.code} · ${run.period}`,
          reference: `OVH-${run.period}`,
          siteId: l.siteId,
          balanceAfter: salaryBalance,
          occurredAt,
          recordedById: session.sub,
          overheadRunId: run.id,
        },
      }),
    );
  }

  ops.push(
    prisma.salaryAccount.update({
      where: { id: salary.id },
      data: { balance: salaryBalance },
    }),
    prisma.overheadRun.update({
      where: { id: run.id },
      data: { status: OverheadRunStatus.APPLIED, executedById: session.sub, executedAt: occurredAt },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "cpt.overhead.apply",
        entityType: "OverheadRun",
        entityId: run.id,
        metadata: { period: run.period, total: totalApplied.toString(), projects: lines.length },
      },
    }),
  );

  await prisma.$transaction(ops);

  return NextResponse.json({
    ok: true,
    applied: totalApplied.toString(),
    projects: lines.length,
    salaryBalance: salaryBalance.toString(),
  });
}
