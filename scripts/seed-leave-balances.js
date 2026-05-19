require("./_guard-prod");
/**
 * Seed LeaveBalance 2026 pour tous les vrais users du tenant BatimCAM SA.
 *
 * Règles CCM BTP Cameroun appliquées :
 *   - Congés payés acquis : 30 jours/an (1,5j × 20 mois travaillés)
 *   - Bonification ancienneté : +1 jour tous les 5 ans révolus
 *   - RTT : 5 jours/an pour cadres et maîtrise (forfait jours), 0 pour ouvriers
 *
 * Pris : entre 25 % et 75 % du solde acquis, distribution déterministe
 * basée sur la première lettre du prénom pour un mix réaliste.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const YEAR = 2026;

function seniorityYears(hireDate) {
  return Math.floor((Date.now() - new Date(hireDate).getTime()) / (365.25 * 86_400_000));
}

function isCadreOrMaitrise(category) {
  if (!category) return false;
  const c = category.toLowerCase();
  return c.includes("cadre") || c.includes("maîtrise") || c.includes("etam");
}

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable");

  console.log(`🌱 Seed LeaveBalance ${YEAR} pour ${tenant.name}...`);

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id, role: { notIn: ["TENANT_ADMIN", "SUPER_ADMIN", "CANDIDATE"] } },
    select: { id: true, firstName: true, lastName: true, hireDate: true, role: true, category: true },
  });

  let created = 0;
  let updated = 0;

  for (const [i, u] of users.entries()) {
    const sen = u.hireDate ? seniorityYears(u.hireDate) : 0;
    const bonusSeniority = Math.floor(sen / 5); // +1j par tranche de 5 ans
    const acquired = 30 + bonusSeniority;
    const isCadre = isCadreOrMaitrise(u.category);
    const rttTotal = isCadre ? 5 : 0;

    // Distribution déterministe (basée sur initiale) — 25 % à 75 % pris
    const ratio = 0.25 + ((u.firstName.charCodeAt(0) * 7 + i * 13) % 50) / 100;
    const taken = Math.round(acquired * ratio * 10) / 10; // arrondi à 0.1j
    const remaining = Math.max(0, Math.round((acquired - taken) * 10) / 10);
    const rttTaken = isCadre ? Math.round((rttTotal * (ratio * 0.6)) * 10) / 10 : 0;

    const data = {
      tenantId: tenant.id,
      employeeKey: u.id,
      employeeName: `${u.firstName} ${u.lastName}`,
      userId: u.id,
      year: YEAR,
      paidLeaveAcquired: acquired,
      paidLeaveTaken: taken,
      paidLeaveRemaining: remaining,
      rttBalance: rttTotal - rttTaken,
      sickDaysUsed: i % 8 === 0 ? Math.round(((i + 1) % 4 + 1) * 0.5 * 10) / 10 : 0,
      lastTakenAt: taken > 0 ? new Date(Date.now() - ((i * 11) % 90 + 10) * 86_400_000) : null,
    };

    const existing = await prisma.leaveBalance.findFirst({
      where: { userId: u.id, year: YEAR },
    });
    if (existing) {
      await prisma.leaveBalance.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.leaveBalance.create({ data });
      created++;
    }
  }

  console.log(`\n✓ LeaveBalance : ${created} créés, ${updated} mis à jour (${users.length} collaborateurs)`);

  // Quelques stats
  const allBalances = await prisma.leaveBalance.findMany({
    where: { tenantId: tenant.id, year: YEAR },
    select: { paidLeaveTaken: true, paidLeaveRemaining: true, rttBalance: true },
  });
  const totalTaken = allBalances.reduce((s, b) => s + b.paidLeaveTaken, 0);
  const totalRemain = allBalances.reduce((s, b) => s + b.paidLeaveRemaining, 0);
  const totalRtt = allBalances.reduce((s, b) => s + b.rttBalance, 0);
  console.log(`  • ${totalTaken.toFixed(0)} jours de congé pris cumulés`);
  console.log(`  • ${totalRemain.toFixed(0)} jours de congé restants à prendre`);
  console.log(`  • ${totalRtt.toFixed(0)} jours RTT restants (cadres)`);

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
