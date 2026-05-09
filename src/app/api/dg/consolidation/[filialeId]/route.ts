import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, SiteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Phase 2 / fn 1.2 — Vue détaillée d'une filiale.
 *
 * Vérifie que la filiale appartient bien au groupe du DG (parentId === session.tenantId).
 * Ne réutilise PAS getTenantScopeIds : on veut explicitement les données d'une seule filiale.
 */
export async function GET(_req: Request, { params }: { params: { filialeId: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const filiale = await prisma.tenant.findUnique({
    where: { id: params.filialeId },
    select: {
      id: true,
      slug: true,
      name: true,
      sector: true,
      primaryColor: true,
      parentId: true,
      parent: { select: { id: true, slug: true, name: true } },
    },
  });

  if (!filiale) return NextResponse.json({ error: "Filiale introuvable" }, { status: 404 });
  // La filiale doit appartenir au groupe du DG (sécurité multi-tenant).
  if (filiale.parentId !== session.tenantId && filiale.id !== session.tenantId) {
    return NextResponse.json({ error: "Filiale hors de votre périmètre" }, { status: 403 });
  }

  const sites = await prisma.site.findMany({
    where: { tenantId: filiale.id },
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      type: true,
      region: true,
      budget: true,
      progress: true,
      margin: true,
      status: true,
    },
    orderBy: [{ status: "asc" }, { plannedEndDate: "asc" }],
  });

  const ACTIVE_STATUSES: SiteStatus[] = [SiteStatus.ACTIVE, SiteStatus.DRIFTING, SiteStatus.AT_RISK];
  const activeSites = sites.filter((s) => ACTIVE_STATUSES.includes(s.status));

  const totalBudget = sites.reduce((sum, s) => sum + Number(s.budget), 0);
  const earnedRevenue = Math.round(
    sites.reduce((sum, s) => sum + (Number(s.budget) * s.progress) / 100, 0)
  );
  const weightedMargin = Number(
    (totalBudget
      ? sites.reduce((sum, s) => sum + s.margin * Number(s.budget), 0) / totalBudget
      : 0
    ).toFixed(1)
  );
  const treasury = Math.round(earnedRevenue * 0.18);

  return NextResponse.json({
    filiale: {
      id: filiale.id,
      slug: filiale.slug,
      name: filiale.name,
      sector: filiale.sector,
      color: filiale.primaryColor,
      parent: filiale.parent,
    },
    kpis: {
      ca: earnedRevenue,
      margin: weightedMargin,
      treasury,
      sitesCount: activeSites.length,
    },
    sites: sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      client: s.client,
      type: s.type,
      region: s.region,
      budget: s.budget.toString(),
      progress: s.progress,
      margin: s.margin,
      status: s.status,
    })),
  });
}
