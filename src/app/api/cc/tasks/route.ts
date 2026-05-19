import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CcPlanningTaskStatus, Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createTaskSchema } from "@/schemas/cc-planning";

export const dynamic = "force-dynamic";

async function getAllowedSiteIds(userId: string): Promise<string[]> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  return Array.from(
    new Set([...(me?.assignedSiteIds ?? []), ...(me?.managedSites ?? []).map((s) => s.id)]),
  );
}

/**
 * Filtres :
 *   ?date=YYYY-MM-DD          → tâches d'un jour
 *   ?from=YYYY-MM-DD&to=...   → plage (ex. semaine)
 *   ?teamId=...               → équipe précise
 *   ?status=PLANNED|...       → statut précis
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const allowed = await getAllowedSiteIds(session.sub);
  if (allowed.length === 0) return NextResponse.json({ items: [], summary: emptySummary() });

  const url = new URL(req.url);
  const siteIdFilter = url.searchParams.get("siteId");
  const dateFilter = url.searchParams.get("date");
  const fromFilter = url.searchParams.get("from");
  const toFilter = url.searchParams.get("to");
  const teamIdFilter = url.searchParams.get("teamId");
  const statusFilter = url.searchParams.get("status") as CcPlanningTaskStatus | null;

  const where: Prisma.CcPlanningTaskWhereInput = {
    siteId:
      siteIdFilter && allowed.includes(siteIdFilter) ? siteIdFilter : { in: allowed },
  };
  if (dateFilter) {
    const start = new Date(`${dateFilter}T00:00:00.000Z`);
    const end = new Date(`${dateFilter}T23:59:59.999Z`);
    where.scheduledDate = { gte: start, lte: end };
  } else if (fromFilter || toFilter) {
    where.scheduledDate = {
      gte: fromFilter ? new Date(`${fromFilter}T00:00:00.000Z`) : undefined,
      lte: toFilter ? new Date(`${toFilter}T23:59:59.999Z`) : undefined,
    };
  }
  if (teamIdFilter) where.teamId = teamIdFilter;
  if (statusFilter) where.status = statusFilter;

  const tasks = await prisma.ccPlanningTask.findMany({
    where,
    orderBy: [{ scheduledDate: "asc" }, { plannedStartTime: "asc" }, { priority: "desc" }],
    take: 300,
    include: {
      site: { select: { id: true, code: true, name: true } },
      team: { select: { id: true, name: true, color: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  // Hydrate assignee names (batch)
  const allAssigneeIds = Array.from(
    new Set(tasks.flatMap((t) => t.assigneeUserIds)),
  );
  const users = allAssigneeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: allAssigneeIds } },
        select: { id: true, firstName: true, lastName: true, role: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    items: tasks.map((t) => ({
      id: t.id,
      siteId: t.siteId,
      site: t.site,
      teamId: t.teamId,
      team: t.team,
      title: t.title,
      description: t.description,
      location: t.location,
      scheduledDate: t.scheduledDate.toISOString(),
      plannedStartTime: t.plannedStartTime,
      plannedEndTime: t.plannedEndTime,
      status: t.status,
      priority: t.priority,
      progressPercent: t.progressPercent,
      assigneeUserIds: t.assigneeUserIds,
      assignees: t.assigneeUserIds
        .map((uid) => userById.get(uid))
        .filter((u): u is NonNullable<typeof u> => !!u),
      blockedReason: t.blockedReason,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdBy: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    summary: {
      total: tasks.length,
      planned: tasks.filter((t) => t.status === "PLANNED").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      done: tasks.filter((t) => t.status === "DONE").length,
      blocked: tasks.filter((t) => t.status === "BLOCKED").length,
      cancelled: tasks.filter((t) => t.status === "CANCELLED").length,
    },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  try {
    const body = createTaskSchema.parse(await req.json());

    const allowed = await getAllowedSiteIds(session.sub);
    if (!allowed.includes(body.siteId)) {
      return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
    }

    const site = await prisma.site.findUnique({
      where: { id: body.siteId },
      select: { id: true, tenantId: true },
    });
    if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

    if (body.teamId) {
      const team = await prisma.ccPlanningTeam.findUnique({
        where: { id: body.teamId },
        select: { id: true, siteId: true },
      });
      if (!team || team.siteId !== body.siteId) {
        return NextResponse.json({ error: "Équipe invalide" }, { status: 400 });
      }
    }

    const created = await prisma.ccPlanningTask.create({
      data: {
        tenantId: site.tenantId,
        siteId: body.siteId,
        teamId: body.teamId ?? null,
        title: body.title,
        description: body.description ?? null,
        location: body.location ?? null,
        scheduledDate: new Date(body.scheduledDate),
        plannedStartTime: body.plannedStartTime ?? null,
        plannedEndTime: body.plannedEndTime ?? null,
        priority: body.priority ?? "NORMAL",
        assigneeUserIds: body.assigneeUserIds ?? [],
        createdById: session.sub,
      },
      select: { id: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Payload invalide", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/cc/tasks]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function emptySummary() {
  return { total: 0, planned: 0, inProgress: 0, done: 0, blocked: 0, cancelled: 0 };
}
