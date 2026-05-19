import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; userId: string }> },
) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const { id, userId } = await ctx.params;
  const team = await prisma.ccPlanningTeam.findUnique({
    where: { id },
    select: { id: true, siteId: true },
  });
  if (!team) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  const allowed = new Set([
    ...(me?.assignedSiteIds ?? []),
    ...(me?.managedSites ?? []).map((s) => s.id),
  ]);
  if (!allowed.has(team.siteId)) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  await prisma.ccPlanningTeamMember.deleteMany({ where: { teamId: id, userId } });
  return NextResponse.json({ ok: true });
}
