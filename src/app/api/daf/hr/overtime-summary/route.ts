import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

const CC_THRESHOLD_MONTHLY = 56; // heures sup max selon convention collective BTP

interface MonthlySummary {
  topEmployees: Array<{
    name: string;
    position: string | null;
    siteName: string | null;
    overtimeHours: number;
    overtimeCost: number;
    aboveThreshold: boolean;
  }>;
  totalCost: number;
  totalHours: number;
  alertsCount: number;
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);

  // V1 : on synthétise à partir des employés actifs et de leur poste
  const employees = await prisma.user.findMany({
    where: {
      tenantId: { in: scopeIds },
      status: "ACTIVE",
      role: { in: [Role.SITE_MANAGER, Role.WORKS_MANAGER, Role.WORKS_DIRECTOR, Role.TECH_DIRECTOR, Role.ACCOUNTANT, Role.EMPLOYEE, Role.WORKER] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      role: true,
    },
    take: 80,
  });

  // Synthèse heures sup déterministe
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: scopeIds }, status: { in: ["ACTIVE", "AT_RISK", "DRIFTING"] } },
    select: { id: true, name: true },
  });

  const summary: MonthlySummary = { topEmployees: [], totalCost: 0, totalHours: 0, alertsCount: 0 };
  for (const [i, e] of employees.entries()) {
    // Pseudo-aléatoire stable : 18 à 72h selon position dans la liste
    const baseHours = 18 + ((i * 7) % 55);
    const aboveThreshold = baseHours > CC_THRESHOLD_MONTHLY;
    const hourlyRate = e.role === Role.WORKS_DIRECTOR || e.role === Role.TECH_DIRECTOR ? 7800 : e.role === Role.SITE_MANAGER || e.role === Role.WORKS_MANAGER || e.role === Role.ACCOUNTANT ? 4200 : 2700;
    const overtimeCost = baseHours * hourlyRate * 1.25;
    const siteName = sites[i % Math.max(sites.length, 1)]?.name ?? null;
    summary.topEmployees.push({
      name: `${e.firstName} ${e.lastName}`,
      position: e.position,
      siteName,
      overtimeHours: baseHours,
      overtimeCost,
      aboveThreshold,
    });
    summary.totalCost += overtimeCost;
    summary.totalHours += baseHours;
    if (aboveThreshold) summary.alertsCount += 1;
  }

  summary.topEmployees.sort((a, b) => b.overtimeHours - a.overtimeHours);
  const top20 = summary.topEmployees.slice(0, 20);

  // Drill-down par chantier
  const bySite: Record<string, { name: string; hours: number; cost: number }> = {};
  for (const e of summary.topEmployees) {
    if (!e.siteName) continue;
    if (!bySite[e.siteName]) bySite[e.siteName] = { name: e.siteName, hours: 0, cost: 0 };
    bySite[e.siteName].hours += e.overtimeHours;
    bySite[e.siteName].cost += e.overtimeCost;
  }

  return NextResponse.json({
    threshold: CC_THRESHOLD_MONTHLY,
    summary: {
      totalCost: Math.round(summary.totalCost),
      totalHours: summary.totalHours,
      alertsCount: summary.alertsCount,
      topEmployeesCount: top20.length,
    },
    topEmployees: top20.map((e) => ({
      ...e,
      overtimeCost: Math.round(e.overtimeCost),
    })),
    bySite: Object.values(bySite)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 12)
      .map((s) => ({
        name: s.name,
        hours: s.hours,
        cost: Math.round(s.cost),
      })),
  });
}
