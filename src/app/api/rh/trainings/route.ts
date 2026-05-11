import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

// V1 — synthèse plan annuel statique (le model Training existant est par-utilisateur,
// le besoin RH 1.6 est un plan annuel par session).
const PLAN_2026 = [
  { ref: "FORM-2026-001", title: "CACES R482 catégorie B1 — Pelles hydrauliques", category: "CACES", provider: "AFTRAL Cameroun", startDate: "2026-05-22", endDate: "2026-05-26", participants: 12, budget: 2_400_000, status: "CONFIRMED" },
  { ref: "FORM-2026-002", title: "SST — Sauveteur Secouriste du Travail", category: "SAFETY", provider: "Croix-Rouge Cameroun", startDate: "2026-06-03", endDate: "2026-06-04", participants: 24, budget: 720_000, status: "PLANNED" },
  { ref: "FORM-2026-003", title: "Habilitation électrique B1V/B2V", category: "SAFETY", provider: "Bureau Veritas", startDate: "2026-06-17", endDate: "2026-06-19", participants: 8, budget: 1_350_000, status: "PLANNED" },
  { ref: "FORM-2026-004", title: "Travail en hauteur (port harnais)", category: "SAFETY", provider: "AFCEP", startDate: "2026-07-08", endDate: "2026-07-09", participants: 16, budget: 1_120_000, status: "PLANNED" },
  { ref: "FORM-2026-005", title: "MS Project + Planning chantier", category: "TECHNICAL", provider: "ESITC Cameroun", startDate: "2026-04-12", endDate: "2026-04-16", participants: 6, budget: 1_800_000, status: "COMPLETED" },
  { ref: "FORM-2026-006", title: "Encadrement d'équipe — niveau 1", category: "MANAGEMENT", provider: "BatimCAM Academy", startDate: "2026-04-22", endDate: "2026-04-23", participants: 14, budget: 480_000, status: "COMPLETED" },
  { ref: "FORM-2026-007", title: "Anglais technique BTP", category: "LANGUAGES", provider: "British Council", startDate: "2026-09-02", endDate: "2026-12-15", participants: 10, budget: 3_500_000, status: "PLANNED" },
  { ref: "FORM-2026-008", title: "Topographie GPS RTK", category: "TECHNICAL", provider: "ENI Bingerville", startDate: "2026-08-25", endDate: "2026-08-29", participants: 4, budget: 1_650_000, status: "PLANNED" },
];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const annualBudget = 18_000_000;
  const spentYtd = PLAN_2026.filter((p) => p.status === "COMPLETED" || p.status === "IN_PROGRESS")
    .reduce((s, p) => s + p.budget, 0);
  const inProgress = PLAN_2026.filter((p) => p.status === "IN_PROGRESS" || p.status === "CONFIRMED").length;

  return NextResponse.json({
    items: PLAN_2026,
    summary: {
      annualBudget,
      spentYtd,
      spentRate: Math.round((spentYtd / annualBudget) * 100),
      inProgress,
    },
  });
}
