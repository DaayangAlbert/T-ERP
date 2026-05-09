import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { SiteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Coordonnées approximatives par région (fallback si site.lat/lng manquants)
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  Yaoundé: { lat: 3.866667, lng: 11.516667 },
  Douala: { lat: 4.05, lng: 9.7 },
  Bafoussam: { lat: 5.483333, lng: 10.416667 },
  Garoua: { lat: 9.3, lng: 13.4 },
  Maroua: { lat: 10.591, lng: 14.319 },
  Bertoua: { lat: 4.583333, lng: 13.683333 },
  Bamenda: { lat: 5.95, lng: 10.166667 },
  Buea: { lat: 4.155, lng: 9.231 },
  Ngaoundéré: { lat: 7.3167, lng: 13.5833 },
  Ebolowa: { lat: 2.9, lng: 11.15 },
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
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
      lat: true,
      lng: true,
    },
  });

  return NextResponse.json({
    items: sites.map((s) => {
      const fallback = (s.region ? REGION_COORDS[s.region] : null) || REGION_COORDS.Douala;
      return {
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
        lat: s.lat ?? fallback.lat + (Math.random() - 0.5) * 0.05,
        lng: s.lng ?? fallback.lng + (Math.random() - 0.5) * 0.05,
      };
    }),
  });
}
