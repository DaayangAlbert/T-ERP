import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";

export const dynamic = "force-dynamic";

// GET /api/ouv/missions/:id — Détail (utilisé par MissionDetailDrawer).
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const m = await prisma.missionAssignment.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
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
      updatedAt: true,
      site: { select: { id: true, code: true, name: true } },
      assignedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });
  if (!m) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });

  return NextResponse.json({
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
    updatedAt: m.updatedAt.toISOString(),
    site: m.site,
    assignedBy: {
      ...m.assignedBy,
      fullName: `${m.assignedBy.firstName} ${m.assignedBy.lastName}`,
    },
  });
}
