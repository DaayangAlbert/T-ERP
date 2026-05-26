import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";
import { canViewAllAttendance, canViewSitesAttendance, canViewSiteAttendance } from "@/lib/presence/access";
import { roleLabel } from "@/components/admin/users/roleLabels";

export const dynamic = "force-dynamic";

/**
 * Consultation des présences d'une journée (qui est venu, heures d'arrivée
 * et de départ). Réservé DG + PCA + RH (tout le monde) et Chef de chantier
 * (son chantier uniquement).
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const role = session.role as Role;
  const viewAll = canViewAllAttendance(role);
  const viewSites = canViewSitesAttendance(role);
  const viewSite = canViewSiteAttendance(role);
  if (!viewAll && !viewSites && !viewSite) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam ? new Date(`${dateParam}T00:00:00.000Z`) : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  const siteFilter = url.searchParams.get("siteId");

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const where: Record<string, unknown> = { tenantId: { in: scopeIds }, date };

  // Périmètre de consultation :
  //  - viewAll  : tout le personnel (bureau + chantiers).
  //  - viewSites: TOUS les chantiers (DT) — exclut le bureau (siteId non nul).
  //  - viewSite : SON chantier (Chef de chantier).
  if (!viewAll && viewSite) {
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { assignedSiteIds: true } });
    const sites = me?.assignedSiteIds ?? [];
    if (sites.length === 0) return NextResponse.json({ date: date.toISOString(), items: [], summary: { present: 0, outOfZone: 0 } });
    where.siteId = { in: siteFilter && sites.includes(siteFilter) ? [siteFilter] : sites };
  } else if (!viewAll && viewSites) {
    where.siteId = siteFilter ? siteFilter : { not: null };
  } else if (siteFilter) {
    where.siteId = siteFilter;
  }

  const reports = await prisma.timeReport.findMany({
    where,
    orderBy: { arrivalTime: "asc" },
    take: 1000,
    select: {
      id: true,
      siteId: true,
      arrivalTime: true,
      departureTime: true,
      totalHours: true,
      status: true,
      outOfGeofence: true,
      user: { select: { firstName: true, lastName: true, role: true } },
    },
  });

  const siteIds = Array.from(new Set(reports.map((r) => r.siteId).filter(Boolean))) as string[];
  const sites = siteIds.length
    ? await prisma.site.findMany({ where: { id: { in: siteIds } }, select: { id: true, code: true, name: true } })
    : [];
  const siteById = new Map(sites.map((s) => [s.id, s]));

  const items = reports.map((r) => {
    const s = r.siteId ? siteById.get(r.siteId) : null;
    return {
      id: r.id,
      name: `${r.user.firstName} ${r.user.lastName}`.trim(),
      role: roleLabel(r.user.role),
      location: s ? `${s.code}` : "Bureau",
      arrivalTime: r.arrivalTime?.toISOString() ?? null,
      departureTime: r.departureTime?.toISOString() ?? null,
      totalHours: r.totalHours,
      status: r.status,
      outOfGeofence: r.outOfGeofence,
    };
  });

  return NextResponse.json({
    date: date.toISOString(),
    items,
    summary: { present: items.length, outOfZone: items.filter((i) => i.outOfGeofence).length },
  });
}
