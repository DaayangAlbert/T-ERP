import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { LeaveStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/leaves/:id/cancel — Annulation par l'ouvrier.
// Possible tant que la demande est PENDING (avant validation CC/RH).
export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const lr = await prisma.leaveRequest.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: { id: true, status: true },
  });
  if (!lr) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  if (lr.status !== LeaveStatus.PENDING) {
    return NextResponse.json(
      {
        error: "Seule une demande en attente peut être annulée",
        code: "CANNOT_CANCEL",
      },
      { status: 409 }
    );
  }

  await prisma.leaveRequest.update({
    where: { id: lr.id },
    data: { status: LeaveStatus.CANCELLED },
  });

  return NextResponse.json({ ok: true });
}
