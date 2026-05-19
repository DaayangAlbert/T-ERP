import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createTeamSchema } from "@/schemas/cc-planning";

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

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const allowed = await getAllowedSiteIds(session.sub);
  if (allowed.length === 0) return NextResponse.json({ items: [] });

  const url = new URL(req.url);
  const siteIdFilter = url.searchParams.get("siteId");
  const includeInactive = url.searchParams.get("includeInactive") === "true";

  const teams = await prisma.ccPlanningTeam.findMany({
    where: {
      siteId: siteIdFilter && allowed.includes(siteIdFilter) ? siteIdFilter : { in: allowed },
      active: includeInactive ? undefined : true,
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      site: { select: { id: true, code: true, name: true } },
      leader: { select: { id: true, firstName: true, lastName: true, role: true } },
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json({
    items: teams.map((t) => ({
      id: t.id,
      siteId: t.siteId,
      site: t.site,
      name: t.name,
      color: t.color,
      active: t.active,
      leader: {
        id: t.leader.id,
        firstName: t.leader.firstName,
        lastName: t.leader.lastName,
        role: t.leader.role,
      },
      members: t.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
      tasksCount: t._count.tasks,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  try {
    const body = createTeamSchema.parse(await req.json());

    const allowed = await getAllowedSiteIds(session.sub);
    if (!allowed.includes(body.siteId)) {
      return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
    }

    const site = await prisma.site.findUnique({
      where: { id: body.siteId },
      select: { id: true, tenantId: true },
    });
    if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

    // Vérifier que le chef d'équipe existe et appartient au tenant
    const leader = await prisma.user.findUnique({
      where: { id: body.leaderId },
      select: { id: true, tenantId: true },
    });
    if (!leader || leader.tenantId !== site.tenantId) {
      return NextResponse.json({ error: "Chef d'équipe invalide" }, { status: 400 });
    }

    const team = await prisma.ccPlanningTeam.create({
      data: {
        tenantId: site.tenantId,
        siteId: body.siteId,
        name: body.name,
        color: body.color ?? null,
        leaderId: body.leaderId,
        members: body.memberIds && body.memberIds.length > 0
          ? {
              create: body.memberIds
                .filter((uid) => uid !== body.leaderId)
                .map((uid) => ({ userId: uid })),
            }
          : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Payload invalide", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/cc/teams]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
