import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { MissionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/ouv/missions
// Renvoie : mission active (IN_PROGRESS), nouvelles à accepter
// (PENDING_ACCEPTANCE et ACCEPTED), et historique (COMPLETED/CANCELLED).
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const all = await prisma.missionAssignment.findMany({
    where: { userId: session.sub },
    orderBy: [{ startDate: "desc" }],
    take: 50,
    select: {
      id: true,
      title: true,
      description: true,
      instructions: true,
      startDate: true,
      endDate: true,
      estimatedDays: true,
      progressPercent: true,
      priority: true,
      status: true,
      workerAcceptedAt: true,
      workerQuestionsRaised: true,
      completedAt: true,
      completionNotes: true,
      progressPhotoUrls: true,
      createdAt: true,
      site: { select: { id: true, code: true, name: true } },
      assignedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  const serialize = (m: (typeof all)[number]) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    instructions: m.instructions,
    startDate: m.startDate.toISOString(),
    endDate: m.endDate?.toISOString() ?? null,
    estimatedDays: m.estimatedDays,
    progressPercent: m.progressPercent,
    priority: m.priority,
    status: m.status,
    workerAcceptedAt: m.workerAcceptedAt?.toISOString() ?? null,
    workerQuestionsRaised: m.workerQuestionsRaised,
    completedAt: m.completedAt?.toISOString() ?? null,
    completionNotes: m.completionNotes,
    progressPhotoUrls: m.progressPhotoUrls,
    createdAt: m.createdAt.toISOString(),
    site: m.site,
    assignedBy: {
      id: m.assignedBy.id,
      firstName: m.assignedBy.firstName,
      lastName: m.assignedBy.lastName,
      role: m.assignedBy.role,
      fullName: `${m.assignedBy.firstName} ${m.assignedBy.lastName}`,
    },
  });

  const active = all.find((m) => m.status === MissionStatus.IN_PROGRESS) ?? null;
  const pending = all.filter(
    (m) => m.status === MissionStatus.PENDING_ACCEPTANCE || m.status === MissionStatus.ACCEPTED
  );
  const history = all.filter(
    (m) => m.status === MissionStatus.COMPLETED || m.status === MissionStatus.CANCELLED
  );

  return NextResponse.json({
    active: active ? serialize(active) : null,
    pending: pending.map(serialize),
    history: history.map(serialize),
    counts: {
      pendingAcceptance: all.filter((m) => m.status === MissionStatus.PENDING_ACCEPTANCE).length,
      inProgress: all.filter((m) => m.status === MissionStatus.IN_PROGRESS).length,
      completed: all.filter((m) => m.status === MissionStatus.COMPLETED).length,
    },
  });
}
