import { prisma } from "@/lib/prisma";
import { DEFAULT_ATTENDANCE_RADIUS_M } from "@/lib/presence/access";

export interface AttendanceLocation {
  type: "OFFICE" | "SITE";
  name: string;
  siteId: string | null;
  lat: number | null;
  lng: number | null;
  radiusM: number;
  configured: boolean; // lat & lng renseignés
}

/**
 * Détermine le lieu de pointage attendu d'un utilisateur :
 *  - s'il a un chantier affecté → coordonnées de ce chantier ;
 *  - sinon (direction/bureau) → coordonnées du bureau (tenant).
 *
 * Si plusieurs chantiers sont affectés, on prend le premier configuré
 * (sinon le premier tout court).
 */
export async function resolveAttendanceLocation(
  userId: string,
  tenantId: string,
): Promise<AttendanceLocation | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { assignedSiteIds: true },
  });
  if (!user) return null;

  if (user.assignedSiteIds.length > 0) {
    const sites = await prisma.site.findMany({
      where: { id: { in: user.assignedSiteIds }, tenantId },
      select: { id: true, code: true, name: true, lat: true, lng: true, attendanceRadiusM: true },
    });
    // Privilégie un chantier dont les coordonnées sont configurées.
    const chosen = sites.find((s) => s.lat != null && s.lng != null) ?? sites[0];
    if (chosen) {
      return {
        type: "SITE",
        name: `${chosen.code} · ${chosen.name}`,
        siteId: chosen.id,
        lat: chosen.lat,
        lng: chosen.lng,
        radiusM: chosen.attendanceRadiusM ?? DEFAULT_ATTENDANCE_RADIUS_M,
        configured: chosen.lat != null && chosen.lng != null,
      };
    }
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, officeLat: true, officeLng: true, officeRadiusM: true },
  });
  if (!tenant) return null;
  return {
    type: "OFFICE",
    name: `Bureau — ${tenant.name}`,
    siteId: null,
    lat: tenant.officeLat,
    lng: tenant.officeLng,
    radiusM: tenant.officeRadiusM ?? DEFAULT_ATTENDANCE_RADIUS_M,
    configured: tenant.officeLat != null && tenant.officeLng != null,
  };
}
