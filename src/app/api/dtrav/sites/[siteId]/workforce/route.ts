import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDtravSite } from "@/lib/rbac/dtrav-guard";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSite(params.siteId);
  if (guard instanceof NextResponse) return guard;

  const [members, teams] = await Promise.all([
    prisma.siteWorkforceMember.findMany({
      where: { siteId: params.siteId, endedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, position: true, role: true } },
      },
      orderBy: { startedAt: "asc" },
    }),
    prisma.siteTeam.findMany({
      where: { siteId: params.siteId },
      include: {
        members: {
          where: { endedAt: null },
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
  ]);

  // Construction organigramme : root = ceux sans reportsTo dans la liste
  const byId = new Map(members.map((m) => [m.userId, m]));
  const childrenByParent = new Map<string, typeof members>();
  for (const m of members) {
    const key = m.reportsToId ?? "ROOT";
    const arr = childrenByParent.get(key) ?? [];
    arr.push(m);
    childrenByParent.set(key, arr);
  }

  function build(parentId: string | null): unknown[] {
    const list = childrenByParent.get(parentId ?? "ROOT") ?? [];
    return list.map((m) => ({
      userId: m.userId,
      name: `${m.user.firstName} ${m.user.lastName}`,
      position: m.user.position ?? m.role,
      role: m.role,
      isLeader: m.isLeader,
      teamId: m.teamId,
      children: build(m.userId),
    }));
  }

  const hierarchy = build(null);

  return NextResponse.json({
    hierarchy,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      specialty: t.specialty,
      headcountTarget: t.headcountTarget,
      present: t.members.length,
      leader: t.members.find((m) => m.isLeader)?.user,
      currentTaskId: t.currentTaskId,
    })),
    totals: {
      headcount: members.length,
    },
  });
}
