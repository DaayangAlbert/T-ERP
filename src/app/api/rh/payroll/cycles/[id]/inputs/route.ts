import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, UserStatus } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const CATEGORY_FAMILIES: Record<string, string[]> = {
  Journaliers: ["OS N1"],
  "Heures sup permanents": ["OQ N4", "OQ N5", "Maîtrise M3", "Maitrise M3"],
  Primes: ["Cadre M2", "Cadre HC", "Cadre Sup HC", "ETAM"],
  Avances: ["OS N2", "OS N3"],
  Retenues: ["OQ N4", "OS N3", "OS N1"],
};

const RATE_BY_CATEGORY: Record<string, number> = {
  "OS N1": 8500,
  "OS N2": 9200,
  "OS N3": 11000,
  "OQ N4": 14500,
  "OQ N5": 17000,
  "Maîtrise M3": 22000,
  "Maitrise M3": 22000,
  ETAM: 26000,
  "Cadre M2": 38000,
  "Cadre HC": 65000,
  "Cadre Sup HC": 110000,
};

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Reserve RH / DG / DAF" }, { status: 403 });
  }

  const cycle = await prisma.payrollCycle.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!cycle) return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });

  const url = new URL(req.url);
  const category = url.searchParams.get("category") ?? "Journaliers";
  const search = (url.searchParams.get("search") ?? "").toLowerCase().trim();
  const limit = Math.min(50, Math.max(8, parseInt(url.searchParams.get("limit") ?? "20", 10)));
  const targetCats = CATEGORY_FAMILIES[category] ?? CATEGORY_FAMILIES.Journaliers;

  const [realUsers, sites] = await Promise.all([
    prisma.user.findMany({
      where: {
        tenantId: session.tenantId,
        status: UserStatus.ACTIVE,
        role: { notIn: [Role.CANDIDATE, Role.SUPER_ADMIN, Role.TENANT_ADMIN] },
        category: { in: targetCats },
      },
      select: {
        id: true,
        employeeId: true,
        matricule: true,
        firstName: true,
        lastName: true,
        category: true,
        assignedSiteIds: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: limit,
    }),
    prisma.site.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, name: true, code: true },
    }),
  ]);

  const siteMap = new Map(sites.map((site) => [site.id, `${site.code} - ${site.name}`]));
  const realPersonnel = realUsers.map((user) => ({
    id: user.id,
    matricule: user.matricule ?? user.employeeId ?? user.id.slice(0, 8).toUpperCase(),
    firstName: user.firstName,
    lastName: user.lastName,
    site: user.assignedSiteIds[0] ? siteMap.get(user.assignedSiteIds[0]) ?? "Siege" : "Siege",
    category: user.category ?? "ETAM",
    isSynthetic: false,
  }));

  const syntheticPersonnel = getSyntheticPersonnel(487)
    .filter((person) => targetCats.includes(person.category))
    .map((person) => ({
      id: person.id,
      matricule: person.matricule,
      firstName: person.firstName,
      lastName: person.lastName,
      site: person.site,
      category: person.category,
      isSynthetic: true,
    }));

  const pool = [...realPersonnel, ...syntheticPersonnel];
  const filtered = search
    ? pool.filter((person) =>
        [person.matricule, `${person.firstName} ${person.lastName}`, person.site].some((field) =>
          field.toLowerCase().includes(search)
        )
      )
    : pool;
  const slice = filtered.slice(0, limit);

  const existingInputs = await prisma.payrollInput.findMany({
    where: {
      payrollCycleId: cycle.id,
      employeeKey: { in: slice.map((person) => person.id) },
    },
  });
  const inputMap = new Map(existingInputs.map((input) => [input.employeeKey, input]));

  return NextResponse.json({
    cycleId: cycle.id,
    cyclePeriod: cycle.period,
    cycleStatus: cycle.status,
    category,
    items: slice.map((person) => {
      const saved = inputMap.get(person.id);
      const dailyRate = RATE_BY_CATEGORY[person.category] ?? 9000;
      const days = saved?.daysWorked ?? 22;
      const overtime = saved?.overtimeHours ?? 0;
      const bonusesArr = (saved?.bonuses ?? []) as Array<{ amount?: number }>;
      const totalBonuses = bonusesArr.reduce((sum, bonus) => sum + (bonus.amount ?? 0), 0);
      const totalGross = days * dailyRate + Math.round(overtime * (dailyRate / 8) * 1.25) + totalBonuses;

      return {
        employeeKey: person.id,
        matricule: person.matricule,
        firstName: person.firstName,
        lastName: person.lastName,
        site: person.site,
        category: person.category,
        dailyRate,
        daysWorked: days,
        overtimeHours: overtime,
        primaryBonus: bonusesArr[0]?.amount ?? 0,
        advances: saved?.advances?.toString() ?? "0",
        totalGross,
        isSynthetic: person.isSynthetic,
        savedAt: saved?.savedAt?.toISOString() ?? null,
      };
    }),
    totalInPool: filtered.length,
  });
}
