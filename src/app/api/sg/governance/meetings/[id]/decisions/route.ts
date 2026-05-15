import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgMutation } from "@/lib/rbac/sg-guard";
import { DecisionType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(3),
  decisionType: z.nativeEnum(DecisionType),
  votingResult: z.any().optional(),
  followUpUserId: z.string().cuid().optional(),
  followUpStatus: z.string().optional(),
});

// POST /api/sg/governance/meetings/:id/decisions — ajoute une décision (numéro auto)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgMutation("canManageCorporateGovernance");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const m = await prisma.governanceMeeting.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, _count: { select: { decisions: true } } },
  });
  if (!m) return NextResponse.json({ error: "Réunion introuvable" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const nextNumber = m._count.decisions + 1;
    const created = await prisma.meetingDecision.create({
      data: {
        meetingId: m.id,
        decisionNumber: nextNumber,
        title: data.title,
        description: data.description,
        decisionType: data.decisionType,
        votingResult: data.votingResult,
        followUpUserId: data.followUpUserId,
        followUpStatus: data.followUpStatus,
        decidedAt: new Date(),
      },
      select: { id: true, decisionNumber: true },
    });

    return NextResponse.json({ ok: true, id: created.id, decisionNumber: created.decisionNumber }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
