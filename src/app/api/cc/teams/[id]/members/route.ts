import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { addMemberSchema } from "@/schemas/cc-planning";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const team = await prisma.ccPlanningTeam.findUnique({
    where: { id },
    select: { id: true, siteId: true, tenantId: true, leaderId: true },
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

  try {
    const body = addMemberSchema.parse(await req.json());

    if (body.userId === team.leaderId) {
      return NextResponse.json(
        { error: "Le chef d'équipe est implicitement membre" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, tenantId: true },
    });
    if (!user || user.tenantId !== team.tenantId) {
      return NextResponse.json({ error: "Utilisateur invalide" }, { status: 400 });
    }

    const member = await prisma.ccPlanningTeamMember.upsert({
      where: { teamId_userId: { teamId: id, userId: body.userId } },
      create: { teamId: id, userId: body.userId, role: body.role ?? "MEMBER" },
      update: { role: body.role ?? "MEMBER" },
      select: { id: true },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Payload invalide", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/cc/teams/:id/members]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
