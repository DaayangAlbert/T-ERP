import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  // Salaire de base depuis dernier bulletin payé
  const recentPayslips = await prisma.payslip.findMany({
    where: { userId: session.sub, status: "PAID" },
    orderBy: { period: "desc" },
    take: 12,
    select: { grossAmount: true, netAmount: true, employerCharges: true, period: true },
  });

  const baseSalaryAnnual = recentPayslips.reduce((s, p) => s + p.grossAmount, 0n);
  const employerChargesAnnual = recentPayslips.reduce((s, p) => s + p.employerCharges, 0n);

  // Bonus
  const bonuses = await prisma.performanceBonus.findMany({
    where: { userId: session.sub, fiscalYear: year },
  });
  const variableBonusTarget = bonuses.reduce((s, b) => s + b.targetAmount, 0n);
  const variableBonusActual = bonuses.reduce((s, b) => s + (b.actualAmount ?? 0n), 0n);

  // Avantages en nature
  const benefits = await prisma.benefitInKind.findMany({
    where: { userId: session.sub },
  });
  const benefitsAnnual = benefits.reduce((s, b) => s + b.monthlyValue * 12n, 0n);

  // Indemnités synthétiques (transport + représentation, conventionnel)
  const indemnities = recentPayslips.length ? BigInt(75_000) * 12n : 0n;

  const totalEmployerCost = baseSalaryAnnual + variableBonusActual + benefitsAnnual + indemnities + employerChargesAnnual;

  // Comparaison N-1 (synthèse : -3 % en moyenne)
  const totalEmployerCostNMinus1 = (totalEmployerCost * 97n) / 100n;

  return NextResponse.json({
    year,
    baseSalaryAnnual: baseSalaryAnnual.toString(),
    variableBonusTarget: variableBonusTarget.toString(),
    variableBonusActual: variableBonusActual.toString(),
    benefitsAnnual: benefitsAnnual.toString(),
    indemnitiesAnnual: indemnities.toString(),
    employerChargesAnnual: employerChargesAnnual.toString(),
    totalEmployerCost: totalEmployerCost.toString(),
    comparison: {
      year: year - 1,
      totalEmployerCost: totalEmployerCostNMinus1.toString(),
    },
  });
}
