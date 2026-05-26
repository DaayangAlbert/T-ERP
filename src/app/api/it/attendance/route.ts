import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";
import { DEFAULT_ATTENDANCE_RADIUS_M } from "@/lib/presence/access";

export const dynamic = "force-dynamic";

/**
 * Configuration du pointage de présence (vue informaticien) :
 * coordonnées GPS du bureau + coordonnées/rayon de chaque chantier.
 */
export async function GET() {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const tenantId = guard.session.tenantId!;

  const [tenant, sites] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, officeLat: true, officeLng: true, officeRadiusM: true },
    }),
    prisma.site.findMany({
      where: { tenantId },
      select: { id: true, code: true, name: true, lat: true, lng: true, attendanceRadiusM: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return NextResponse.json({
    defaultRadiusM: DEFAULT_ATTENDANCE_RADIUS_M,
    office: {
      name: tenant?.name ?? "",
      lat: tenant?.officeLat ?? null,
      lng: tenant?.officeLng ?? null,
      radiusM: tenant?.officeRadiusM ?? null,
    },
    sites: sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      radiusM: s.attendanceRadiusM,
    })),
  });
}
