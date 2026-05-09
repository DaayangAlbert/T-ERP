import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Heatmap synthétique 12 mois × ressources. La donnée réelle viendra du
// module Planning d'exécution en V2. Ici on génère des charges crédibles.
const SKILLS = [
  { key: "manhour-coffrage", label: "Maçons coffreurs" },
  { key: "manhour-ferrailleur", label: "Ferrailleurs" },
  { key: "manhour-finitions", label: "Finitions" },
  { key: "manhour-conducteur", label: "Conducteurs travaux" },
];

const EQUIPMENT = [
  { key: "eq-pelle-20t", label: "Pelle hydraulique 20T" },
  { key: "eq-grue", label: "Grue à tour" },
  { key: "eq-camion-benne", label: "Camions benne" },
  { key: "eq-betonniere", label: "Bétonnières" },
];

function buildSeries(seed: number) {
  const today = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    // Simulation déterministe via seed
    const base = 60 + Math.sin((i + seed) * 0.7) * 40;
    const noise = (i * 11 + seed * 17) % 25;
    const load = Math.max(20, Math.min(140, Math.round(base + noise)));
    return { month: d.toISOString().slice(0, 7), load };
  });
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const view = url.searchParams.get("view") === "equipment" ? "equipment" : "skill";
  const items = view === "equipment" ? EQUIPMENT : SKILLS;

  const conflicts = await prisma.resourceConflict.findMany({
    where: { tenantId: session.tenantId, resolved: false },
    orderBy: { periodStart: "asc" },
  });

  return NextResponse.json({
    view,
    rows: items.map((r, i) => ({
      key: r.key,
      label: r.label,
      points: buildSeries(i + (view === "equipment" ? 7 : 0)),
    })),
    conflictsCount: conflicts.length,
  });
}
