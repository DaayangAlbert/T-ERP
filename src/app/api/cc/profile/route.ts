import { NextResponse } from "next/server";
import { Role, LeaveStatus, MaterialRequestStatus, HseIncidentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Profil consolidé du Chef de Chantier : identité, chantiers assignés,
 * équipes (ouvriers WORKER de ses chantiers), stats de l'activité
 * (validations en attente, demandes matériel, signalements HSE).
 *
 * Alimente la page /chef-chantier/profil — design inspiré du profil
 * DTrav (grid 2 col : chantiers / équipe / habilitations / agenda).
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      role: true,
      matricule: true,
      employeeId: true,
      position: true,
      professionalCategory: true,
      category: true,
      department: true,
      hireDate: true,
      contractType: true,
      assignedSiteIds: true,
      phoneMobile: true,
      bankName: true,
      bankAgency: true,
    },
  });
  if (!me) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const siteIds = me.assignedSiteIds;

  // Chantiers assignés (détails + progression + milestones proches)
  const sites = siteIds.length
    ? await prisma.site.findMany({
        where: { id: { in: siteIds } },
        select: {
          id: true,
          code: true,
          name: true,
          client: true,
          progress: true,
          status: true,
          startDate: true,
          plannedEndDate: true,
          region: true,
          manager: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: { code: "asc" },
      })
    : [];

  // Effectifs ouvrier des chantiers (via SiteWorkforceMember role=WORKER)
  const workforce = siteIds.length
    ? await prisma.siteWorkforceMember.findMany({
        where: { siteId: { in: siteIds }, role: "WORKER" },
        select: {
          siteId: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              workerQualification: true,
              avatarUrl: true,
            },
          },
        },
      })
    : [];

  const workforceBySite = new Map<string, Array<typeof workforce[number]>>();
  for (const w of workforce) {
    if (!workforceBySite.has(w.siteId)) workforceBySite.set(w.siteId, []);
    workforceBySite.get(w.siteId)!.push(w);
  }

  // Stats activité (en parallèle)
  const [pendingLeaves, pendingMaterial, openHse, totalWorkers] = await Promise.all([
    prisma.leaveRequest.count({
      where: { validatorUserId: session.sub, status: LeaveStatus.PENDING },
    }),
    prisma.materialRequest.count({
      where: {
        requesterId: session.sub,
        status: { in: [MaterialRequestStatus.PENDING, MaterialRequestStatus.PARTIAL] },
      },
    }),
    prisma.hseIncidentReport.count({
      where: {
        assignedToId: session.sub,
        status: { in: [HseIncidentStatus.OPEN, HseIncidentStatus.INVESTIGATING] },
      },
    }),
    prisma.siteWorkforceMember.count({
      where: { siteId: { in: siteIds.length ? siteIds : ["__nope__"] }, role: "WORKER" },
    }),
  ]);

  return NextResponse.json({
    user: {
      id: me.id,
      firstName: me.firstName,
      lastName: me.lastName,
      email: me.email,
      avatarUrl: me.avatarUrl,
      role: me.role,
      matricule: me.matricule,
      employeeId: me.employeeId,
      position: me.position,
      professionalCategory: me.professionalCategory,
      category: me.category,
      department: me.department,
      hireDate: me.hireDate?.toISOString() ?? null,
      contractType: me.contractType,
      phoneMobile: me.phoneMobile,
      bankName: me.bankName,
      bankAgency: me.bankAgency,
    },
    sites: sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      client: s.client,
      progress: s.progress,
      status: s.status,
      startDate: s.startDate.toISOString(),
      plannedEndDate: s.plannedEndDate.toISOString(),
      region: s.region,
      manager: s.manager
        ? {
            fullName: `${s.manager.firstName} ${s.manager.lastName}`,
            role: s.manager.role,
          }
        : null,
      workersCount: workforceBySite.get(s.id)?.length ?? 0,
    })),
    workforce: workforce.map((w) => ({
      siteId: w.siteId,
      user: {
        id: w.user.id,
        fullName: `${w.user.firstName} ${w.user.lastName}`,
        avatarUrl: w.user.avatarUrl,
        qualification: w.user.workerQualification,
      },
    })),
    stats: {
      sitesCount: sites.length,
      workersCount: totalWorkers,
      pendingLeavesCount: pendingLeaves,
      pendingMaterialCount: pendingMaterial,
      openHseCount: openHse,
    },
  });
}
