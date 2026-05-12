import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.WORKS_MANAGER, Role.WORKS_DIRECTOR, Role.DG, Role.DAF, Role.TECH_DIRECTOR, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Conducteur de travaux" }, { status: 403 });
  }

  const site = await prisma.site.findFirst({ where: { code: "CHT-2025-031" } });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  let plan = await prisma.dailyPlan.findUnique({
    where: { siteId_planDate: { siteId: site.id, planDate: todayMidnight } },
    include: {
      teams: {
        include: { team: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!plan) {
    plan = await prisma.dailyPlan.create({
      data: {
        siteId: site.id,
        planDate: todayMidnight,
        status: "DRAFT",
        createdBy: session.sub,
      },
      include: { teams: { include: { team: true } } },
    });
  }

  return NextResponse.json({
    id: plan.id,
    siteId: plan.siteId,
    planDate: plan.planDate.toISOString(),
    status: plan.status,
    notes: plan.notes,
    validatedAt: plan.validatedAt?.toISOString() ?? null,
    teams: plan.teams.map((t) => ({
      id: t.id,
      teamId: t.teamId,
      teamName: t.team.name,
      teamSpecialty: t.team.specialty,
      teamLeaderId: t.team.leaderUserId,
      teamHeadcountTarget: t.team.headcountTarget,
      mainTask: t.mainTask,
      objective: t.objective,
      materialsNeeded: t.materialsNeeded ?? [],
      status: t.status,
      extraNotes: t.extraNotes,
    })),
  });
}
