import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCcSite } from "@/lib/rbac/cc-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCcSite();
  if (guard instanceof NextResponse) return guard;
  const { siteId } = guard;

  const members = await prisma.siteWorkforceMember.findMany({
    where: { siteId, endedAt: null },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          position: true,
          phone: true,
        },
      },
      team: { select: { id: true, name: true, specialty: true } },
    },
    orderBy: [{ team: { name: "asc" } }, { user: { lastName: "asc" } }],
  });

  const teamsMap = new Map<string, { id: string; name: string; specialty: string; count: number }>();
  for (const m of members) {
    if (m.team) {
      const cur = teamsMap.get(m.team.id) ?? { id: m.team.id, name: m.team.name, specialty: m.team.specialty, count: 0 };
      cur.count++;
      teamsMap.set(m.team.id, cur);
    }
  }

  return NextResponse.json({
    workforce: members.map((m) => ({
      userId: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      matricule: m.user.employeeId,
      position: m.user.position ?? m.role,
      phone: m.user.phone,
      teamId: m.team?.id ?? null,
      teamName: m.team?.name ?? "Sans équipe",
    })),
    teams: Array.from(teamsMap.values()),
    totalCount: members.length,
  });
}
