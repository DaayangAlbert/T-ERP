import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgMutation } from "@/lib/rbac/sg-guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  items: z
    .array(
      z.object({
        num: z.number().int().positive(),
        title: z.string().min(2).max(200),
        duration: z.string().optional(),
      }),
    )
    .min(1),
  approveByDg: z.boolean().optional(),
});

// PATCH /api/sg/governance/meetings/:id/agenda — modifie l'ordre du jour.
// Si approveByDg=true et que l'utilisateur a le rôle DG, marque le verrouillage.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgMutation("canManageCorporateGovernance");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const m = await prisma.governanceMeeting.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, status: true, agendaApprovedAt: true },
  });
  if (!m) return NextResponse.json({ error: "Réunion introuvable" }, { status: 404 });
  if (m.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Ordre du jour modifiable uniquement avant tenue" }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Renormalise les numéros (1..N) pour autoriser le reorder côté client
    const normalized = data.items.map((it, idx) => ({ ...it, num: idx + 1 }));

    const approving = data.approveByDg && session.role === "DG";

    await prisma.governanceMeeting.update({
      where: { id: m.id },
      data: {
        agenda: { items: normalized },
        ...(approving ? { agendaApprovedAt: new Date(), agendaApprovedBy: session.sub } : {}),
      },
    });

    return NextResponse.json({ ok: true, itemsCount: normalized.length, approved: !!approving });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
