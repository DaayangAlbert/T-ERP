import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      assignedSiteIds: true,
      position: true,
      category: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const sites = user.assignedSiteIds.length
    ? await prisma.site.findMany({
        where: { id: { in: user.assignedSiteIds } },
        select: {
          id: true,
          code: true,
          name: true,
          client: true,
          progress: true,
          plannedEndDate: true,
        },
      })
    : [];

  // Agenda chantier : prochaines réunions + jalons
  const upcomingMilestones = user.assignedSiteIds.length
    ? await prisma.siteMilestone.findMany({
        where: {
          planning: { siteId: { in: user.assignedSiteIds } },
          status: { in: ["UPCOMING"] },
          contractDueDate: { gte: new Date() },
        },
        orderBy: { contractDueDate: "asc" },
        take: 8,
        include: { planning: { include: { site: { select: { code: true, name: true } } } } },
      })
    : [];

  return NextResponse.json({
    user: { firstName: user.firstName, lastName: user.lastName, role: user.role, position: user.position, category: user.category },
    sites: sites.map((s) => ({
      ...s,
      plannedEndDate: s.plannedEndDate.toISOString(),
    })),
    upcomingMilestones: upcomingMilestones.map((m) => ({
      id: m.id,
      code: m.code,
      description: m.description,
      contractDueDate: m.contractDueDate.toISOString(),
      siteCode: m.planning.site.code,
      siteName: m.planning.site.name,
    })),
  });
}
