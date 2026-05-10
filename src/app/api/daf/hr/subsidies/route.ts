import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  // V1 — synthèse statique des aides actuelles
  const employmentAids = [
    { ref: "FNE-2026-014", scheme: "FNE — Apprentissage", description: "12 jeunes en alternance niveau BTS", expectedAmount: 18_000_000, status: "ACTIVE", endDate: "2026-12-31" },
    { ref: "MINEFOP-2026-008", scheme: "MINEFOP — Insertion jeunes", description: "Subvention insertion 25 jeunes diplômés", expectedAmount: 12_500_000, status: "PENDING_PAYMENT", endDate: "2026-09-30" },
    { ref: "ONEM-2026-003", scheme: "ONEM — Reclassement", description: "Aide au reclassement personnel ex-CHANTIER ABC", expectedAmount: 4_200_000, status: "PAID", endDate: "2026-04-30" },
  ];

  const exemptions = [
    { type: "Jeunes diplômés (< 35 ans)", count: 18, monthlySaving: 1_750_000 },
    { type: "Longue durée (≥ 12 mois inactivité)", count: 7, monthlySaving: 680_000 },
    { type: "Personnes handicapées", count: 3, monthlySaving: 290_000 },
  ];

  const trainingCredits = [
    { provider: "FNE", year: 2026, accumulated: 24_500_000, recovered: 8_200_000, remaining: 16_300_000, expiresAt: "2027-12-31" },
    { provider: "Convention BTP", year: 2025, accumulated: 12_800_000, recovered: 12_800_000, remaining: 0, expiresAt: "2026-12-31" },
  ];

  const totalEmployment = employmentAids.reduce((s, x) => s + x.expectedAmount, 0);
  const totalMonthlyExempt = exemptions.reduce((s, x) => s + x.monthlySaving, 0);
  const totalRemainingTraining = trainingCredits.reduce((s, x) => s + x.remaining, 0);

  return NextResponse.json({
    employmentAids,
    exemptions,
    trainingCredits,
    summary: {
      totalEmploymentExpected: totalEmployment,
      monthlyExemptionTotal: totalMonthlyExempt,
      annualExemptionTotal: totalMonthlyExempt * 12,
      remainingTrainingCredits: totalRemainingTraining,
    },
  });
}
