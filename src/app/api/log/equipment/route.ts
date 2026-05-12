import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, EquipmentType, EquipmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.LOGISTICS, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Logisticien" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (type && Object.values(EquipmentType).includes(type as EquipmentType)) where.type = type;
  if (status && Object.values(EquipmentStatus).includes(status as EquipmentStatus)) where.status = status;
  if (search) {
    where.OR = [
      { registration: { contains: search, mode: "insensitive" } },
      { designation: { contains: search, mode: "insensitive" } },
    ];
  }

  const [equipment, all, maintenancesUpcoming] = await Promise.all([
    prisma.equipment.findMany({
      where,
      include: {
        assignments: {
          where: { active: true },
          include: {
            site: { select: { code: true, name: true } },
            driver: { select: { firstName: true, lastName: true } },
          },
          take: 1,
        },
        maintenances: {
          where: { status: { in: ["PLANNED", "IN_PROGRESS"] } },
          orderBy: { scheduledAt: "asc" },
          take: 1,
        },
      },
      orderBy: [{ status: "asc" }, { registration: "asc" }],
    }),
    prisma.equipment.findMany({
      where: { tenantId: session.tenantId },
      select: { type: true, status: true, currentValue: true },
    }),
    prisma.maintenanceSchedule.count({
      where: {
        status: { in: ["PLANNED", "IN_PROGRESS"] },
        scheduledAt: { lte: new Date(Date.now() + 30 * 86400_000) },
        equipment: { tenantId: session.tenantId },
      },
    }),
  ]);

  // KPIs
  const inService = all.filter((e) => e.status === "IN_SERVICE").length;
  const maintenance = all.filter((e) => e.status === "MAINTENANCE").length;
  const breakdown = all.filter((e) => e.status === "BREAKDOWN").length;
  const totalValue = all.reduce((s, e) => s + Number(e.currentValue), 0);
  // Conso gasoil estimée (démo)
  const fuelLitersWeek = 4818;
  const fuelCostWeek = 4818 * 770; // ~770 FCFA/L

  // Counts par type
  const countByType: Record<string, number> = {};
  for (const e of all) {
    countByType[e.type] = (countByType[e.type] ?? 0) + 1;
  }

  return NextResponse.json({
    kpis: {
      total: all.length,
      inService,
      maintenance,
      breakdown,
      availability: all.length ? Math.round((inService / all.length) * 100) : 0,
      totalValue,
      fuelLitersWeek,
      fuelCostWeek,
      maintenancesUpcoming,
    },
    countByType,
    items: equipment.map((e) => {
      const assignment = e.assignments[0];
      const nextMaint = e.maintenances[0];
      return {
        id: e.id,
        registration: e.registration,
        designation: e.designation,
        type: e.type,
        status: e.status,
        counter: e.counter,
        counterUnit: e.counterUnit,
        currentValue: Number(e.currentValue),
        site: assignment ? assignment.site?.name ?? "Siège" : "—",
        driver: assignment?.driver
          ? `${assignment.driver.firstName.charAt(0)}. ${assignment.driver.lastName}`
          : "—",
        nextMaintenance: nextMaint
          ? {
              type: nextMaint.type,
              scheduledAt: nextMaint.scheduledAt?.toISOString() ?? null,
              description: nextMaint.description,
            }
          : null,
        insuranceUntil: e.insuranceUntil?.toISOString() ?? null,
      };
    }),
  });
}
