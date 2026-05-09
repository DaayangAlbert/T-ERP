import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Simulation Solde de Tout Compte (V1 simplifiée).
export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { hireDate: true, firstName: true, lastName: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // Salaire mensuel moyen sur 12 derniers mois
  const recentPayslips = await prisma.payslip.findMany({
    where: { userId: session.sub, status: "PAID" },
    orderBy: { period: "desc" },
    take: 12,
    select: { grossAmount: true },
  });
  const monthlyAvg = recentPayslips.length
    ? recentPayslips.reduce((s, p) => s + p.grossAmount, 0n) / BigInt(recentPayslips.length)
    : 0n;

  // Ancienneté
  const seniorityYears = user.hireDate
    ? Math.floor((Date.now() - user.hireDate.getTime()) / (365.25 * 86_400_000))
    : 0;

  // Indemnité de rupture (conventionnelle simplifiée : 1 mois par année d'ancienneté, plafonné à 12)
  const ruptureMonths = Math.min(12, seniorityYears);
  const ruptureIndem = monthlyAvg * BigInt(ruptureMonths);

  // Solde congés non pris (synthèse : 25 jours)
  const congesUnpaid = (monthlyAvg / 30n) * 25n;

  // Préavis (3 mois pour cadres dirigeants au Cameroun)
  const preavis = monthlyAvg * 3n;

  // Bonus prorata
  const monthsThisYear = new Date().getMonth() + 1;
  const bonuses = await prisma.performanceBonus.findMany({
    where: { userId: session.sub, fiscalYear: new Date().getFullYear() },
  });
  const bonusProRata =
    (bonuses.reduce((s, b) => s + (b.actualAmount ?? b.targetAmount), 0n) * BigInt(monthsThisYear)) / 12n;

  const total = ruptureIndem + congesUnpaid + preavis + bonusProRata;

  return NextResponse.json({
    user: { name: `${user.firstName} ${user.lastName}`, seniorityYears, hireDate: user.hireDate?.toISOString() ?? null },
    monthlyAvg: monthlyAvg.toString(),
    components: {
      ruptureIndemnity: ruptureIndem.toString(),
      ruptureMonths,
      unpaidLeave: congesUnpaid.toString(),
      noticePeriod: preavis.toString(),
      bonusProRata: bonusProRata.toString(),
    },
    total: total.toString(),
    note: "V1 simulation simplifiée — non opposable. Validation expert paie + juriste social requise.",
  });
}
