import { NextResponse } from "next/server";
import { HseIncidentStatus, LeaveStatus, Role, SalaryAdvanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Agrège les demandes ouvrier en attente de validation/visibilité par
 * le Chef de Chantier connecté :
 *
 *   - Congés où il est validateur direct (validatorUserId = lui)
 *   - Signalements HSE assignés à lui (assignedToId = lui)
 *   - Avances sur salaire des ouvriers de son chantier (INFO seulement,
 *     pas de pouvoir de validation — c'est HR/DAF/DG)
 *
 * Utilisée par la page /chef-chantier/validations et par les liens
 * de notification routés vers le CC.
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  // Trouve les chantiers gérés par ce CC (via assignedSiteIds + managedSites)
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  const siteIds = Array.from(
    new Set([...(me?.assignedSiteIds ?? []), ...(me?.managedSites ?? []).map((s) => s.id)]),
  );

  // Récupère les ouvriers de ces chantiers (utile pour les avances)
  const workersOfMySites =
    siteIds.length > 0
      ? await prisma.user.findMany({
          where: {
            role: Role.WORKER,
            status: "ACTIVE",
            OR: [{ assignedSiteIds: { hasSome: siteIds } }],
          },
          select: { id: true },
        })
      : [];
  const workerIds = workersOfMySites.map((w) => w.id);

  const [leaves, incidents, advances] = await Promise.all([
    // Congés où CC est validateur direct
    prisma.leaveRequest.findMany({
      where: {
        validatorUserId: session.sub,
        status: { in: [LeaveStatus.PENDING] },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        daysCount: true,
        reason: true,
        status: true,
        createdAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true, matricule: true, avatarUrl: true },
        },
      },
    }),
    // HSE assignés au CC
    prisma.hseIncidentReport.findMany({
      where: {
        assignedToId: session.sub,
        status: { in: [HseIncidentStatus.OPEN, HseIncidentStatus.INVESTIGATING] },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        type: true,
        severity: true,
        title: true,
        description: true,
        isAnonymous: true,
        status: true,
        createdAt: true,
        site: { select: { id: true, code: true, name: true } },
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    }),
    // Avances des ouvriers du chantier — INFO seulement (CC ne valide pas)
    workerIds.length > 0
      ? prisma.salaryAdvanceRequest.findMany({
          where: {
            userId: { in: workerIds },
            status: SalaryAdvanceStatus.PENDING,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            amountXAF: true,
            reason: true,
            status: true,
            createdAt: true,
            user: {
              select: { id: true, firstName: true, lastName: true, matricule: true, avatarUrl: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    leaves: leaves.map((l) => ({
      id: l.id,
      type: l.type,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      daysCount: l.daysCount,
      reason: l.reason,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
      user: l.user,
    })),
    hse: incidents.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      title: i.title,
      description: i.description.slice(0, 300),
      isAnonymous: i.isAnonymous,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
      site: i.site,
      reporter: i.isAnonymous ? null : i.reportedBy,
    })),
    advances: advances.map((a) => ({
      id: a.id,
      amountXAF: Number(a.amountXAF),
      reason: a.reason,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      user: a.user,
    })),
    summary: {
      leavesCount: leaves.length,
      hseCount: incidents.length,
      advancesCount: advances.length,
      totalCount: leaves.length + incidents.length + advances.length,
    },
  });
}
