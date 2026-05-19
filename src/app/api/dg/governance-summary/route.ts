import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG && session.role !== Role.SUPER_ADMIN && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86_400_000);
  const in180Days = new Date(now.getTime() + 180 * 86_400_000);

  const [upcomingMeetings, pendingDecisions, boardMembers] = await Promise.all([
    prisma.governanceMeeting.findMany({
      where: { tenantId: session.tenantId, scheduledAt: { gte: now, lte: in90Days }, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    }),
    prisma.meetingDecision.findMany({
      where: {
        meeting: { tenantId: session.tenantId },
        OR: [
          { followUpStatus: { in: ["PENDING", "IN_PROGRESS"] } },
          { followUpStatus: null },
        ],
      },
      include: { meeting: { select: { type: true, scheduledAt: true } } },
      orderBy: { decidedAt: "desc" },
      take: 30,
    }),
    prisma.boardMember.findMany({
      where: { tenantId: session.tenantId, status: "ACTIVE" },
      orderBy: { mandateEndDate: "asc" },
    }),
  ]);

  return NextResponse.json({
    summary: {
      upcomingMeetings: upcomingMeetings.length,
      pendingDecisions: pendingDecisions.length,
      mandatesExpiringSoon: boardMembers.filter((b) => b.mandateEndDate <= in180Days).length,
      totalActiveMembers: boardMembers.length,
    },
    meetings: upcomingMeetings.map((m) => ({
      id: m.id,
      type: m.type,
      scheduledAt: m.scheduledAt.toISOString(),
      location: m.location,
      status: m.status,
      daysUntil: Math.ceil((m.scheduledAt.getTime() - now.getTime()) / 86_400_000),
    })),
    decisions: pendingDecisions.map((d) => ({
      id: d.id,
      title: d.title,
      decisionType: d.decisionType,
      followUpStatus: d.followUpStatus,
      decidedAt: d.decidedAt.toISOString(),
      meetingType: d.meeting.type,
    })),
    boardMembers: boardMembers.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      function: m.function,
      isIndependent: m.isIndependent,
      mandateEndDate: m.mandateEndDate.toISOString(),
      daysUntilEnd: Math.ceil((m.mandateEndDate.getTime() - now.getTime()) / 86_400_000),
      expiringSoon: m.mandateEndDate <= in180Days,
    })),
  });
}
