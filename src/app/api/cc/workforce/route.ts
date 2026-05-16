import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCcSite } from "@/lib/rbac/cc-guard";
import { AttendanceSession, AttendanceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardCcSite();
  if (guard instanceof NextResponse) return guard;
  const { siteId } = guard;

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const members = await prisma.siteWorkforceMember.findMany({
    where: {
      siteId,
      endedAt: null,
      ...(search
        ? {
            user: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { employeeId: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          position: true,
          phone: true,
          avatarUrl: true,
        },
      },
      team: { select: { id: true, name: true, specialty: true } },
    },
    orderBy: [{ team: { name: "asc" } }, { user: { lastName: "asc" } }],
  });

  const presence = await prisma.attendance.findMany({
    where: {
      siteId,
      date: today,
      session: AttendanceSession.MORNING,
    },
    select: { userId: true, status: true },
  });
  const presenceMap = new Map(presence.map((p) => [p.userId, p.status]));

  // Grouper par équipe
  const teams = new Map<
    string,
    {
      id: string | null;
      name: string;
      specialty: string | null;
      leader: { firstName: string; lastName: string; phone: string | null } | null;
      workers: Array<{
        userId: string;
        firstName: string;
        lastName: string;
        matricule: string | null;
        position: string;
        phone: string | null;
        avatarUrl: string | null;
        isLeader: boolean;
        attendanceStatus: AttendanceStatus | null;
      }>;
    }
  >();
  for (const m of members) {
    const key = m.team?.id ?? "no-team";
    let team = teams.get(key);
    if (!team) {
      team = {
        id: m.team?.id ?? null,
        name: m.team?.name ?? "Sans équipe",
        specialty: m.team?.specialty ?? null,
        leader: null,
        workers: [],
      };
      teams.set(key, team);
    }
    const worker = {
      userId: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      matricule: m.user.employeeId,
      position: m.user.position ?? m.role,
      phone: m.user.phone,
      avatarUrl: m.user.avatarUrl,
      isLeader: m.isLeader,
      attendanceStatus: presenceMap.get(m.user.id) ?? null,
    };
    team.workers.push(worker);
    if (m.isLeader) {
      team.leader = { firstName: m.user.firstName, lastName: m.user.lastName, phone: m.user.phone };
    }
  }

  return NextResponse.json({
    teams: Array.from(teams.values()),
    totalCount: members.length,
  });
}
