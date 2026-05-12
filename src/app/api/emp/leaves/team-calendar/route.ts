import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Membres de l'équipe absents cette semaine — visible UNIQUEMENT pour
 * les chefs d'équipe (teamLeader=true). Permet à François de voir d'un
 * coup d'œil "qui n'est pas là" avant de planifier la semaine.
 */
export async function GET(req: Request) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { teamLeader: true, assignedSiteIds: true },
  });
  if (!me?.teamLeader) {
    return NextResponse.json({ absences: [], reason: "NOT_TEAM_LEADER" });
  }

  const url = new URL(req.url);
  const weekStartStr = url.searchParams.get("weekStart");
  const now = weekStartStr ? new Date(weekStartStr) : new Date();
  const dow = now.getUTCDay() || 7; // 1 lundi … 7 dimanche
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - (dow - 1));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const primarySiteId = me.assignedSiteIds[0];
  if (!primarySiteId) return NextResponse.json({ absences: [], reason: "NO_SITE" });

  // Tous les ouvriers du chantier (hors moi)
  const teamMembers = await prisma.user.findMany({
    where: {
      id: { not: session.sub },
      assignedSiteIds: { has: primarySiteId },
      role: { in: [Role.WORKER, Role.EMPLOYEE] },
    },
    select: { id: true, firstName: true, lastName: true, position: true },
  });

  // Demandes de congé approuvées chevauchant la semaine
  const teamMemberIds = teamMembers.map((m) => m.id);
  const overlappingLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId: { in: teamMemberIds },
      status: { in: ["RH_APPROVED", "N1_APPROVED"] },
      startDate: { lte: sunday },
      endDate: { gte: monday },
    },
    select: {
      userId: true,
      type: true,
      reason: true,
      startDate: true,
      endDate: true,
    },
  });

  const userById = new Map(teamMembers.map((m) => [m.id, m]));
  const absences = overlappingLeaves
    .filter((l) => l.userId && userById.has(l.userId))
    .map((l) => {
      const u = userById.get(l.userId!)!;
      return {
        userId: l.userId,
        fullName: `${u.firstName} ${u.lastName}`,
        position: u.position,
        type: l.type,
        reason: l.reason,
        startDate: l.startDate,
        endDate: l.endDate,
      };
    });

  return NextResponse.json({
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
    teamSize: teamMembers.length,
    absences,
  });
}
