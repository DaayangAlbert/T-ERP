import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const crews = await prisma.crew.findMany({
    where: { tenantId: session.tenantId, active: true },
    include: {
      leader: { select: { firstName: true, lastName: true } },
      assignments: {
        include: { site: { select: { code: true, name: true } } },
        orderBy: { weekIso: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const weeks = Array.from(
    new Set(crews.flatMap((c) => c.assignments.map((a) => a.weekIso)))
  ).sort();

  const totalCapacityWeek = crews.reduce((s, c) => s + c.capacityHoursPerWeek, 0);

  // Détecter les surcharges (>= 100%) pour la semaine courante (1ère semaine du planning)
  const focusWeek = weeks[0] ?? "";
  const overloads = crews
    .map((c) => {
      const assignment = c.assignments.find((a) => a.weekIso === focusWeek);
      if (!assignment || (assignment.overloadPercent ?? 0) <= 100) return null;
      return {
        id: assignment.id,
        crewName: c.name,
        site: assignment.site.name,
        weekIso: assignment.weekIso,
        overloadPercent: Math.round(assignment.overloadPercent ?? 0),
        plannedHours: assignment.plannedHours,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const totalPlannedThisWeek = crews.reduce((s, c) => {
    const a = c.assignments.find((x) => x.weekIso === focusWeek);
    return s + (a?.plannedHours ?? 0);
  }, 0);

  return NextResponse.json({
    kpis: {
      crewCount: crews.length,
      totalCapacityWeek,
      totalPlannedWeek: Math.round(totalPlannedThisWeek),
      utilizationPercent: totalCapacityWeek
        ? Math.round((totalPlannedThisWeek / totalCapacityWeek) * 100)
        : 0,
      overloadsCount: overloads.length,
    },
    weeks,
    crews: crews.map((c) => ({
      id: c.id,
      name: c.name,
      specialty: c.specialty,
      leader: c.leader ? `${c.leader.firstName.charAt(0)}. ${c.leader.lastName}` : null,
      capacityHoursPerWeek: c.capacityHoursPerWeek,
      cells: weeks.map((w) => {
        const a = c.assignments.find((x) => x.weekIso === w);
        const planned = a?.plannedHours ?? 0;
        const pct = (planned / c.capacityHoursPerWeek) * 100;
        return { weekIso: w, plannedHours: planned, pct: Math.round(pct), siteName: a?.site.name ?? null };
      }),
    })),
    overloads,
  });
}
