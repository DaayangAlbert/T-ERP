import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

/**
 * Annulation par l'employé de sa propre demande en attente.
 * Refuse l'annulation si déjà APPROVED/REJECTED (la suppression d'un
 * congé déjà validé passe par RH).
 */
export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const lr = await prisma.leaveRequest.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: { id: true, status: true },
  });
  if (!lr) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });

  if (lr.status !== "PENDING") {
    return NextResponse.json(
      { error: `Impossible d'annuler une demande ${lr.status}. Contacte RH si besoin.` },
      { status: 400 }
    );
  }

  await prisma.leaveRequest.update({
    where: { id: lr.id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json({ ok: true });
}
