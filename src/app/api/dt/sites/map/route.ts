import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, SiteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

// Coordonnées approximatives des principales villes camerounaises (fallback si lat/lng absent).
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  Centre: { lat: 3.848, lng: 11.502 },
  Littoral: { lat: 4.061, lng: 9.786 },
  Ouest: { lat: 5.477, lng: 10.418 },
  Nord: { lat: 9.301, lng: 13.397 },
  Sud: { lat: 2.937, lng: 11.143 },
  "Adamaoua": { lat: 7.323, lng: 13.583 },
  "Extrême-Nord": { lat: 10.595, lng: 14.318 },
  "Nord-Ouest": { lat: 5.957, lng: 10.149 },
  "Sud-Ouest": { lat: 4.155, lng: 9.231 },
  Est: { lat: 4.042, lng: 13.683 },
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
    select: {
      id: true,
      code: true,
      name: true,
      region: true,
      lat: true,
      lng: true,
      budget: true,
      status: true,
      physicalProgress: true,
    },
  });

  return NextResponse.json({
    items: sites.map((s, idx) => {
      const fallback = s.region ? REGION_COORDS[s.region] : null;
      // Léger jitter pour éviter superposition des markers même région
      const jitter = (idx % 7) * 0.04;
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        region: s.region,
        lat: s.lat ?? (fallback ? fallback.lat + jitter : 5.5),
        lng: s.lng ?? (fallback ? fallback.lng + jitter : 11.5),
        budget: Number(s.budget),
        status: s.status,
        progress: s.physicalProgress,
      };
    }),
  });
}
