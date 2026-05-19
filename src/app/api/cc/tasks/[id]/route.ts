import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateTaskSchema } from "@/schemas/cc-planning";

export const dynamic = "force-dynamic";

async function loadTask(id: string, userId: string) {
  const task = await prisma.ccPlanningTask.findUnique({
    where: { id },
    include: { site: { select: { id: true, tenantId: true } } },
  });
  if (!task) return null;
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  const allowed = new Set([
    ...(me?.assignedSiteIds ?? []),
    ...(me?.managedSites ?? []).map((s) => s.id),
  ]);
  if (!allowed.has(task.siteId)) return "forbidden" as const;
  return task;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await loadTask(id, session.sub);
  if (!existing) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  if (existing === "forbidden") return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });

  try {
    const body = updateTaskSchema.parse(await req.json());

    if (body.teamId) {
      const team = await prisma.ccPlanningTeam.findUnique({
        where: { id: body.teamId },
        select: { id: true, siteId: true },
      });
      if (!team || team.siteId !== existing.siteId) {
        return NextResponse.json({ error: "Équipe invalide" }, { status: 400 });
      }
    }

    // Status DONE → completedAt auto, autre statut → completedAt null
    let completedAt: Date | null | undefined = undefined;
    let progressPercent = body.progressPercent;
    if (body.status === "DONE") {
      completedAt = new Date();
      progressPercent = progressPercent ?? 100;
    } else if (body.status) {
      completedAt = null;
    }

    const updated = await prisma.ccPlanningTask.update({
      where: { id },
      data: {
        teamId: body.teamId === undefined ? undefined : body.teamId,
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        location: body.location ?? undefined,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
        plannedStartTime: body.plannedStartTime ?? undefined,
        plannedEndTime: body.plannedEndTime ?? undefined,
        status: body.status ?? undefined,
        priority: body.priority ?? undefined,
        progressPercent: progressPercent ?? undefined,
        assigneeUserIds: body.assigneeUserIds ?? undefined,
        blockedReason: body.blockedReason ?? undefined,
        completedAt: completedAt === undefined ? undefined : completedAt,
      },
      select: { id: true, status: true, progressPercent: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Payload invalide", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[PATCH /api/cc/tasks/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await loadTask(id, session.sub);
  if (!existing) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  if (existing === "forbidden") return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });

  await prisma.ccPlanningTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
