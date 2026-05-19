import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Liste les heures supplémentaires en attente de validation par le Chef
 * de Chantier connecté.
 *
 * Règle métier : un TimeReport est en attente de validation CC si :
 *   - overtimeHours > 0
 *   - pointedBy === userId du salarié (pointage autonome ouvrier — SELF_OUV)
 *   - aucune contestation en cours (contestedAt nul ou resolvedAt non nul)
 *
 * Une fois validé par le CC, `pointedBy` passe à l'id du CC, ce qui sort
 * le pointage de cette liste et le rend éligible à la remontée automatique
 * dans le cycle de paie (cf aggregateOvertimeForCycle).
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER && session.role !== Role.TENANT_ADMIN && session.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Réservé Chef de Chantier" }, { status: 403 });
  }

  const url = new URL(req.url);
  const periodParam = url.searchParams.get("period"); // YYYY-MM optionnel

  // Périmètre du CC : sites assignés + sites managés
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  const siteIds = Array.from(
    new Set([...(me?.assignedSiteIds ?? []), ...(me?.managedSites ?? []).map((s) => s.id)]),
  );

  // Borne temporelle : mois courant par défaut, paramètre period sinon
  let start: Date;
  let end: Date;
  if (periodParam && /^\d{4}-\d{2}$/.test(periodParam)) {
    const [y, m] = periodParam.split("-").map(Number);
    start = new Date(Date.UTC(y, m - 1, 1));
    end = new Date(Date.UTC(y, m, 1));
  } else {
    const now = new Date();
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  }

  // Récupère tous les TimeReports avec overtime du mois sur les sites du CC
  const reports = await prisma.timeReport.findMany({
    where: {
      tenantId: session.tenantId,
      date: { gte: start, lt: end },
      overtimeHours: { gt: 0 },
      siteId: siteIds.length > 0 ? { in: siteIds } : undefined,
      OR: [{ contestedAt: null }, { resolvedAt: { not: null } }],
    },
    orderBy: [{ date: "desc" }, { arrivalTime: "asc" }],
    select: {
      id: true,
      userId: true,
      date: true,
      siteId: true,
      arrivalTime: true,
      departureTime: true,
      totalHours: true,
      standardHours: true,
      overtimeHours: true,
      overtimeType: true,
      pointedBy: true,
      outOfGeofence: true,
      entrySelfieUrl: true,
      exitSelfieUrl: true,
      contestedAt: true,
      resolvedAt: true,
      user: {
        select: { id: true, firstName: true, lastName: true, matricule: true, avatarUrl: true, position: true },
      },
    },
  });

  // TimeReport n'a pas de relation Site explicite — on hydrate à part
  const reportSiteIds = Array.from(new Set(reports.map((r) => r.siteId).filter((s): s is string => Boolean(s))));
  const sites = reportSiteIds.length > 0
    ? await prisma.site.findMany({
        where: { id: { in: reportSiteIds } },
        select: { id: true, code: true, name: true },
      })
    : [];
  const siteMap = new Map(sites.map((s) => [s.id, s]));

  // Filtre : pending CC = pointage autonome (pointedBy === userId)
  // Validé = pointedBy != userId (CC ou AUTO_BADGE)
  const pending = reports.filter((r) => r.pointedBy === r.userId);
  const validated = reports.filter((r) => r.pointedBy !== r.userId);

  const totals = {
    pending: {
      count: pending.length,
      hours: Math.round(pending.reduce((s, r) => s + r.overtimeHours, 0) * 10) / 10,
      hours125: Math.round(pending.filter((r) => r.overtimeType === "evening_125").reduce((s, r) => s + r.overtimeHours, 0) * 10) / 10,
      hours150: Math.round(pending.filter((r) => r.overtimeType === "night_150").reduce((s, r) => s + r.overtimeHours, 0) * 10) / 10,
      hours200: Math.round(pending.filter((r) => r.overtimeType === "sunday_200").reduce((s, r) => s + r.overtimeHours, 0) * 10) / 10,
    },
    validated: {
      count: validated.length,
      hours: Math.round(validated.reduce((s, r) => s + r.overtimeHours, 0) * 10) / 10,
    },
  };

  const serialize = (r: (typeof reports)[number]) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    arrivalTime: r.arrivalTime?.toISOString() ?? null,
    departureTime: r.departureTime?.toISOString() ?? null,
    totalHours: r.totalHours,
    standardHours: r.standardHours,
    overtimeHours: r.overtimeHours,
    overtimeType: r.overtimeType,
    outOfGeofence: r.outOfGeofence,
    entrySelfieUrl: r.entrySelfieUrl,
    exitSelfieUrl: r.exitSelfieUrl,
    isSelfPointed: r.pointedBy === r.userId,
    user: {
      id: r.user.id,
      fullName: `${r.user.firstName} ${r.user.lastName}`.trim(),
      matricule: r.user.matricule,
      position: r.user.position,
      avatarUrl: r.user.avatarUrl,
    },
    site: r.siteId ? siteMap.get(r.siteId) ?? null : null,
  });

  return NextResponse.json({
    period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    pending: pending.map(serialize),
    validated: validated.map(serialize),
    totals,
  });
}
