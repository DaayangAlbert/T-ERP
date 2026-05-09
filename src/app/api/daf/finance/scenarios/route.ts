import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

interface ScenarioParameters {
  cementPriceVar?: number; // % variation
  ironPriceVar?: number;   // % variation
  salaryVar?: number;      // % variation
  fuelPriceVar?: number;   // %
  delayDays?: number;      // jours retard livraison Pont Mfoundi
}

interface ScenarioResults {
  plImpact: string;       // FCFA - signed (positif = améliore résultat)
  bfrImpact: string;      // FCFA - signed
  treasuryImpact: string; // FCFA - signed (=plImpact - bfrImpact)
  breakdown: Array<{ key: string; label: string; impact: string }>;
}

// Bases hypothétiques annualisées pour le tenant démo
const BASES = {
  cementVolumeFcfa: 1_350_000_000, // achats ciment annuels
  ironVolumeFcfa: 920_000_000,     // achats fer annuels
  fuelVolumeFcfa: 540_000_000,     // carburant annuel
  salaryMass: 2_180_000_000,       // masse salariale brute
  pontMfoundiDailyOpex: 4_200_000, // coût journalier mobilisation
  pontMfoundiDailyRevenue: 6_800_000,
};

function computeResults(params: ScenarioParameters): ScenarioResults {
  const cementImpact = -Math.round(BASES.cementVolumeFcfa * ((params.cementPriceVar ?? 0) / 100));
  const ironImpact = -Math.round(BASES.ironVolumeFcfa * ((params.ironPriceVar ?? 0) / 100));
  const fuelImpact = -Math.round(BASES.fuelVolumeFcfa * ((params.fuelPriceVar ?? 0) / 100));
  const salaryImpact = -Math.round(BASES.salaryMass * ((params.salaryVar ?? 0) / 100));
  const delayImpact =
    -Math.round((BASES.pontMfoundiDailyRevenue - BASES.pontMfoundiDailyOpex) * (params.delayDays ?? 0));

  const plImpact = cementImpact + ironImpact + fuelImpact + salaryImpact + delayImpact;
  // BFR : retard livraison Pont Mfoundi gonfle stocks et créances
  const bfrImpact = Math.round(
    (params.delayDays ?? 0) * BASES.pontMfoundiDailyOpex * 0.6 +
      Math.abs(cementImpact + ironImpact) * 0.15
  );
  const treasuryImpact = plImpact - bfrImpact;

  return {
    plImpact: plImpact.toString(),
    bfrImpact: bfrImpact.toString(),
    treasuryImpact: treasuryImpact.toString(),
    breakdown: [
      { key: "cement", label: "Variation prix ciment", impact: cementImpact.toString() },
      { key: "iron", label: "Variation prix fer", impact: ironImpact.toString() },
      { key: "fuel", label: "Variation prix carburant", impact: fuelImpact.toString() },
      { key: "salary", label: "Revalorisation salariale", impact: salaryImpact.toString() },
      { key: "delay", label: "Retard livraison Pont Mfoundi", impact: delayImpact.toString() },
    ],
  };
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const items = await prisma.financialScenario.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      parameters: s.parameters as unknown as ScenarioParameters,
      results: s.results as unknown as ScenarioResults,
      createdAt: s.createdAt.toISOString(),
      authorId: s.authorId,
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    parameters?: ScenarioParameters;
    save?: boolean;
  };

  const name = (body.name ?? "").trim();
  const params = body.parameters ?? {};
  const results = computeResults(params);

  // Mode "preview" : on ne persiste pas, on renvoie juste les résultats
  if (body.save === false || !name) {
    return NextResponse.json({ preview: true, results, parameters: params });
  }

  const created = await prisma.financialScenario.create({
    data: {
      tenantId: session.tenantId,
      name,
      description: body.description ?? null,
      parameters: params as object,
      results: results as unknown as object,
      authorId: session.sub,
    },
  });

  return NextResponse.json({
    id: created.id,
    name: created.name,
    description: created.description,
    parameters: created.parameters,
    results: created.results,
    createdAt: created.createdAt.toISOString(),
  });
}
