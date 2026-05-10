import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const CATEGORY_FAMILIES: Record<string, string[]> = {
  Journaliers: ["OS N1"],
  "Heures sup permanents": ["OQ N4", "OQ N5", "Maîtrise M3"],
  Primes: ["Cadre M2", "Cadre HC", "Cadre Sup HC", "ETAM"],
  Avances: ["OS N2", "OS N3"],
  Retenues: ["OQ N4", "OS N3", "OS N1"],
};

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
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

  // Liste depuis le pool synthétique filtré par catégorie
  const pool = getSyntheticPersonnel(487).filter((p) => targetCats.includes(p.category));
  let filtered = pool;
  if (search) {
    filtered = pool.filter((p) =>
      [p.matricule, `${p.firstName} ${p.lastName}`, p.site].some((f) => f.toLowerCase().includes(search))
    );
  }

  const slice = filtered.slice(0, limit);

  // Charger les saisies déjà persistées pour cet ensemble
  const existingInputs = await prisma.payrollInput.findMany({
    where: {
      payrollCycleId: cycle.id,
      employeeKey: { in: slice.map((p) => p.id) },
    },
  });
  const inputMap = new Map(existingInputs.map((i) => [i.employeeKey, i]));

  // Tarif/jour selon catégorie (V1 statique)
  const rateBy: Record<string, number> = {
    "OS N1": 8500,
    "OS N2": 9200,
    "OS N3": 11000,
    "OQ N4": 14500,
    "OQ N5": 17000,
    "Maîtrise M3": 22000,
    ETAM: 26000,
    "Cadre M2": 38000,
    "Cadre HC": 65000,
    "Cadre Sup HC": 110000,
  };

  return NextResponse.json({
    cycleId: cycle.id,
    cyclePeriod: cycle.period,
    cycleStatus: cycle.status,
    category,
    items: slice.map((p) => {
      const saved = inputMap.get(p.id);
      const dailyRate = rateBy[p.category] ?? 9000;
      const days = saved?.daysWorked ?? 22;
      const overtime = saved?.overtimeHours ?? 0;
      const bonusesArr = (saved?.bonuses ?? []) as Array<{ amount: number }>;
      const totalBonuses = bonusesArr.reduce((s, b) => s + (b.amount ?? 0), 0);
      const totalGross = days * dailyRate + Math.round(overtime * (dailyRate / 8) * 1.25) + totalBonuses;
      return {
        employeeKey: p.id,
        matricule: p.matricule,
        firstName: p.firstName,
        lastName: p.lastName,
        site: p.site,
        category: p.category,
        dailyRate,
        daysWorked: days,
        overtimeHours: overtime,
        primaryBonus: bonusesArr[0]?.amount ?? 0,
        advances: saved?.advances?.toString() ?? "0",
        totalGross,
        savedAt: saved?.savedAt?.toISOString() ?? null,
      };
    }),
    totalInPool: filtered.length,
  });
}
