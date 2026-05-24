import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, MeetingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

const TYPE_LABEL: Record<string, string> = {
  BOARD_MEETING: "Conseil d'administration",
  ORDINARY_AG: "Assemblée générale ordinaire",
  EXTRAORDINARY_AG: "Assemblée générale extraordinaire",
};

function agendaCount(agenda: unknown): number {
  if (Array.isArray(agenda)) return agenda.length;
  if (agenda && typeof agenda === "object" && Array.isArray((agenda as { points?: unknown[] }).points)) {
    return (agenda as { points: unknown[] }).points.length;
  }
  return 0;
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.governanceMeeting.findMany({
      where: { tenantId: session.tenantId, scheduledAt: { gte: now }, status: { in: [MeetingStatus.SCHEDULED, MeetingStatus.POSTPONED] } },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    }),
    prisma.governanceMeeting.findMany({
      where: { tenantId: session.tenantId, status: MeetingStatus.COMPLETED },
      orderBy: { scheduledAt: "desc" },
      take: 10,
      include: { decisions: { select: { id: true } } },
    }),
  ]);

  const map = (m: { id: string; type: string; scheduledAt: Date; location: string; agenda: unknown; status: string }, joursRestants?: number, nbDecisions?: number) => ({
    id: m.id,
    type: TYPE_LABEL[m.type] ?? m.type,
    date: m.scheduledAt.toISOString(),
    lieu: m.location,
    nbPoints: agendaCount(m.agenda),
    statut: m.status,
    joursRestants,
    nbDecisions,
  });

  return NextResponse.json({
    aVenir: upcoming.map((m) => map(m, Math.ceil((m.scheduledAt.getTime() - now.getTime()) / 86_400_000))),
    passees: past.map((m) => map(m, undefined, m.decisions.length)),
  });
}
