import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateTeamSchema } from "@/schemas/cc-planning";

export const dynamic = "force-dynamic";

async function loadTeam(id: string, userId: string) {
  const team = await prisma.ccPlanningTeam.findUnique({
    where: { id },
    include: {
      site: { select: { id: true, tenantId: true, code: true, name: true } },
      leader: { select: { id: true, firstName: true, lastName: true, role: true } },
      members: {
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      },
    },
  });
  if (!team) return null;
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  const allowed = new Set([
    ...(me?.assignedSiteIds ?? []),
    ...(me?.managedSites ?? []).map((s) => s.id),
  ]);
  if (!allowed.has(team.siteId)) return "forbidden" as const;
  return team;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await loadTeam(id, session.sub);
  if (!existing) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
  if (existing === "forbidden") return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });

  try {
    const body = updateTeamSchema.parse(await req.json());

    if (body.leaderId) {
      const leader = await prisma.user.findUnique({
        where: { id: body.leaderId },
        select: { id: true, tenantId: true },
      });
      if (!leader || leader.tenantId !== existing.site.tenantId) {
        return NextResponse.json({ error: "Chef d'équipe invalide" }, { status: 400 });
      }
    }

    const updated = await prisma.ccPlanningTeam.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        color: body.color === undefined ? undefined : body.color,
        leaderId: body.leaderId ?? undefined,
        active: body.active ?? undefined,
      },
      select: { id: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Payload invalide", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[PATCH /api/cc/teams/:id]", err);
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
  const existing = await loadTeam(id, session.sub);
  if (!existing) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
  if (existing === "forbidden") return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });

  // Si l'équipe a des tâches, on désactive plutôt que supprimer.
  const tasksCount = await prisma.ccPlanningTask.count({ where: { teamId: id } });
  if (tasksCount > 0) {
    await prisma.ccPlanningTeam.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true, deactivated: true });
  }

  await prisma.ccPlanningTeam.delete({ where: { id } });
  return NextResponse.json({ ok: true, deactivated: false });
}
