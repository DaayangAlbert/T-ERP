import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { MeetingType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET — agrège toutes les décisions de CA + AG du tenant pour produire un
// registre officiel des décisions (vue chronologique inversée).
export async function GET(req: Request) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const filter = url.searchParams.get("source"); // "BOARD" | "AG" | null

  const meetingTypeFilter =
    filter === "BOARD"
      ? { in: [MeetingType.BOARD_MEETING] }
      : filter === "AG"
        ? { in: [MeetingType.ORDINARY_AG, MeetingType.EXTRAORDINARY_AG] }
        : undefined;

  const decisions = await prisma.meetingDecision.findMany({
    where: {
      meeting: { tenantId, ...(meetingTypeFilter ? { type: meetingTypeFilter } : {}) },
    },
    orderBy: { decidedAt: "desc" },
    include: {
      meeting: { select: { id: true, type: true, scheduledAt: true, location: true } },
    },
    take: 200,
  });

  const byType = decisions.reduce<Record<string, number>>((acc, d) => {
    const key = d.meeting.type;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    total: decisions.length,
    countByMeetingType: byType,
    items: decisions.map((d) => ({
      id: d.id,
      decisionNumber: d.decisionNumber,
      title: d.title,
      description: d.description,
      decisionType: d.decisionType,
      decidedAt: d.decidedAt.toISOString(),
      followUpStatus: d.followUpStatus,
      meeting: {
        id: d.meeting.id,
        type: d.meeting.type,
        scheduledAt: d.meeting.scheduledAt.toISOString(),
        location: d.meeting.location,
      },
    })),
  });
}
