import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const m = await prisma.governanceMeeting.findFirst({
    where: { id: params.id, tenantId },
    include: {
      decisions: { orderBy: { decisionNumber: "asc" } },
    },
  });

  if (!m) return NextResponse.json({ error: "Réunion introuvable" }, { status: 404 });

  return NextResponse.json({
    id: m.id,
    type: m.type,
    scheduledAt: m.scheduledAt.toISOString(),
    location: m.location,
    status: m.status,
    convocationsSentAt: m.convocationsSentAt?.toISOString() ?? null,
    convocationsRecipients: m.convocationsRecipients,
    agenda: m.agenda,
    agendaApprovedBy: m.agendaApprovedBy,
    agendaApprovedAt: m.agendaApprovedAt?.toISOString() ?? null,
    attendees: m.attendees,
    quorum: m.quorum,
    pvDocumentUrl: m.pvDocumentUrl,
    pvSignedAt: m.pvSignedAt?.toISOString() ?? null,
    pvSignedBy: m.pvSignedBy,
    decisions: m.decisions.map((d) => ({
      id: d.id,
      decisionNumber: d.decisionNumber,
      title: d.title,
      description: d.description,
      decisionType: d.decisionType,
      votingResult: d.votingResult,
      followUpUserId: d.followUpUserId,
      followUpStatus: d.followUpStatus,
      decidedAt: d.decidedAt.toISOString(),
    })),
  });
}
