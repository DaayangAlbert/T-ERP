import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { SalaryAdvanceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/ouv/advances/:id — Détail d'une avance (lecture seule pour l'ouvrier).
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const advance = await prisma.salaryAdvanceRequest.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: {
      id: true,
      amountXAF: true,
      maxAllowedXAF: true,
      reason: true,
      status: true,
      validatedAt: true,
      validator: { select: { firstName: true, lastName: true, role: true } },
      payoutAt: true,
      payoutMethod: true,
      rejectionReason: true,
      recoveryMonth: true,
      recoveredAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!advance) return NextResponse.json({ error: "Avance introuvable" }, { status: 404 });

  return NextResponse.json({
    id: advance.id,
    amountXAF: Number(advance.amountXAF),
    maxAllowedXAF: Number(advance.maxAllowedXAF),
    reason: advance.reason,
    status: advance.status,
    validatedAt: advance.validatedAt?.toISOString() ?? null,
    validatorName: advance.validator
      ? `${advance.validator.firstName} ${advance.validator.lastName}`
      : null,
    validatorRole: advance.validator?.role ?? null,
    payoutAt: advance.payoutAt?.toISOString() ?? null,
    payoutMethod: advance.payoutMethod,
    rejectionReason: advance.rejectionReason,
    recoveryMonth: advance.recoveryMonth,
    recoveredAt: advance.recoveredAt?.toISOString() ?? null,
    createdAt: advance.createdAt.toISOString(),
    updatedAt: advance.updatedAt.toISOString(),
  });
}

// DELETE /api/ouv/advances/:id — Annulation par l'ouvrier (uniquement si PENDING).
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const advance = await prisma.salaryAdvanceRequest.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: { id: true, status: true },
  });
  if (!advance) return NextResponse.json({ error: "Avance introuvable" }, { status: 404 });
  if (advance.status !== SalaryAdvanceStatus.PENDING) {
    return NextResponse.json(
      {
        error: "Seule une demande encore en attente peut être annulée",
        code: "CANNOT_CANCEL",
      },
      { status: 409 }
    );
  }

  await prisma.salaryAdvanceRequest.update({
    where: { id: advance.id },
    data: { status: SalaryAdvanceStatus.CANCELLED },
  });

  return NextResponse.json({ ok: true });
}
