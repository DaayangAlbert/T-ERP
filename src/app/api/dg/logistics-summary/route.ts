import { NextResponse } from "next/server";
import { Role, EquipmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Vue condensée Logistique pour le DG :
 *  - Liste de tout le matériel (engins, camions, véhicules) du groupe
 *  - Production par chantier (somme des compteurs h/km des engins affectés)
 *  - Équipements en panne (BREAKDOWN — pas encore traités)
 *  - Équipements en réparation (MAINTENANCE en cours)
 *  - Équipements retirés / en transfert
 *  - Location externe : note d'absence de tracking en base (à implémenter)
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG && session.role !== Role.SUPER_ADMIN && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const tenantIds = await getTenantScopeIds(session.tenantId);

  const equipment = await prisma.equipment.findMany({
    where: { tenantId: { in: tenantIds } },
    include: {
      assignments: {
        where: { active: true },
        include: {
          site: { select: { id: true, code: true, name: true } },
          driver: { select: { firstName: true, lastName: true } },
        },
        take: 1, // une seule affectation active à la fois
      },
      maintenances: {
        where: { status: { in: ["PLANNED", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Mapping par statut
  const inService = equipment.filter((e) => e.status === EquipmentStatus.IN_SERVICE);
  const inMaintenance = equipment.filter((e) => e.status === EquipmentStatus.MAINTENANCE);
  const breakdown = equipment.filter((e) => e.status === EquipmentStatus.BREAKDOWN);
  const retired = equipment.filter((e) => e.status === EquipmentStatus.RETIRED);
  const transfer = equipment.filter((e) => e.status === EquipmentStatus.TRANSFER);

  // Production par chantier = somme du compteur (heures/km) des équipements en service affectés
  const prodBySite = new Map<string, { siteId: string; code: string; name: string; equipmentCount: number; totalHours: number; totalKm: number }>();
  for (const e of inService) {
    const a = e.assignments[0];
    if (!a?.site) continue;
    const acc = prodBySite.get(a.site.id) ?? {
      siteId: a.site.id,
      code: a.site.code,
      name: a.site.name,
      equipmentCount: 0,
      totalHours: 0,
      totalKm: 0,
    };
    acc.equipmentCount += 1;
    if (e.counterUnit === "h") acc.totalHours += e.counter;
    else if (e.counterUnit === "km") acc.totalKm += e.counter;
    prodBySite.set(a.site.id, acc);
  }

  const productionBySite = Array.from(prodBySite.values()).sort((a, b) => b.equipmentCount - a.equipmentCount);

  // Détail liste
  const mapItem = (e: (typeof equipment)[number]) => {
    const a = e.assignments[0];
    const maint = e.maintenances[0];
    return {
      id: e.id,
      registration: e.registration,
      designation: e.designation,
      type: e.type,
      status: e.status,
      counter: e.counter,
      counterUnit: e.counterUnit,
      acquisitionValue: e.acquisitionValue.toString(),
      currentValue: e.currentValue.toString(),
      insuranceUntil: e.insuranceUntil?.toISOString() ?? null,
      visiteUntil: e.visiteUntil?.toISOString() ?? null,
      site: a?.site ? { id: a.site.id, code: a.site.code, name: a.site.name } : null,
      driver: a?.driver ? `${a.driver.firstName} ${a.driver.lastName}` : null,
      maintenance: maint ? { status: maint.status, description: maint.description, scheduledAt: maint.scheduledAt?.toISOString() ?? null } : null,
    };
  };

  return NextResponse.json({
    summary: {
      total: equipment.length,
      inService: inService.length,
      inMaintenance: inMaintenance.length,
      breakdown: breakdown.length,
      retired: retired.length,
      transfer: transfer.length,
      totalCurrentValue: String(equipment.reduce((s, e) => s + Number(e.currentValue), 0)),
    },
    inService: inService.map(mapItem),
    inMaintenance: inMaintenance.map(mapItem),
    breakdown: breakdown.map(mapItem),
    retired: retired.map(mapItem),
    transfer: transfer.map(mapItem),
    productionBySite,
  });
}
