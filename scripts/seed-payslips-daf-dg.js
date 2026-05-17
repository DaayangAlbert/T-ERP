// Génère des bulletins de paie 2026 réalistes pour Marie NGONO (DAF) et
// Albert DAAYANG (DG) sur batimcam — janvier à avril 2026.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Profils de paie réalistes (cadre 12 et cadre sup HC).
const PROFILES = {
  DAF: {
    baseSalary: 2_000_000n,
    seniorityBonus: 250_000n, // 7 ans d'ancienneté (~12,5 %)
    transportAllowance: 75_000n,
    otherBonuses: [
      { label: "Prime de direction", amount: 200_000 },
      { label: "Indemnité représentation", amount: 100_000 },
    ],
    bank: "Afriland First Bank · ****1842",
  },
  DG: {
    baseSalary: 3_500_000n,
    seniorityBonus: 525_000n, // 8 ans (~15 %)
    transportAllowance: 100_000n,
    otherBonuses: [
      { label: "Prime de direction générale", amount: 500_000 },
      { label: "Indemnité représentation", amount: 250_000 },
      { label: "Voiture de fonction (équivalent monétaire)", amount: 180_000 },
    ],
    bank: "Société Générale Cameroun · ****0019",
  },
};

function fmtMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function periodBounds(year, monthIdx0) {
  const start = new Date(year, monthIdx0, 1);
  const end = new Date(year, monthIdx0 + 1, 0, 23, 59, 59);
  return { start, end };
}

function computePayslip(profile, year, monthIdx0) {
  const base = profile.baseSalary;
  const sen = profile.seniorityBonus;
  const trans = profile.transportAllowance;
  const otherBonusTotal = BigInt(
    profile.otherBonuses.reduce((s, b) => s + b.amount, 0),
  );

  // Brut imposable = base + ancienneté + autres primes (transport non imposable jusqu'à seuil CM).
  const grossAmount = base + sen + trans + otherBonusTotal;
  const taxableGross = base + sen + otherBonusTotal;

  // CNPS salarié (PVID 4,2 % plafonné 750 000 + 1 % allocations fam. = 5,2 % plafonné).
  const plafondCnps = 750_000n;
  const baseCnps = taxableGross > plafondCnps ? plafondCnps : taxableGross;
  const cnpsAmount = (baseCnps * 42n) / 1000n; // 4,2 %

  // IRPP simplifié : 18 % de la fraction au-delà de 200 000 FCFA (cadre élevé).
  const irppBaseFloor = 200_000n;
  const irppBase = taxableGross > irppBaseFloor ? taxableGross - irppBaseFloor : 0n;
  const irppAmount = (irppBase * 18n) / 100n;

  const socialCharges = cnpsAmount;
  const fiscalCharges = irppAmount;
  const employerCharges =
    (baseCnps * 168n) / 1000n + // CNPS patronal ~16,8 %
    (taxableGross * 25n) / 1000n; // taxes diverses (FNE, CFC) ~2,5 %

  const netAmount = grossAmount - cnpsAmount - irppAmount;

  const { start, end } = periodBounds(year, monthIdx0);
  // Date de paiement = 28 du mois.
  const paymentDate = new Date(year, monthIdx0, 28);

  return {
    period: start,
    periodLabel: fmtMonth(year, monthIdx0 + 1),
    periodEnd: end,
    paymentDate,
    grossAmount,
    taxableGross,
    netAmount,
    socialCharges,
    fiscalCharges,
    employerCharges,
    baseSalary: base,
    overtimeAmount: 0n,
    overtimeHours: 0,
    seniorityBonus: sen,
    transportAllowance: trans,
    otherBonuses: profile.otherBonuses,
    cnpsAmount,
    irppAmount,
    otherDeductions: 0n,
    paymentMethod: "BANK_TRANSFER",
    paymentBankAccount: profile.bank,
    workedDays: 22,
    reportedHours: 173.33,
  };
}

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable");

  const daf = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "DAF", email: "marie@batimcam.cm" },
  });
  const dg = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "DG", email: "albert@batimcam.cm" },
  });
  if (!daf || !dg) throw new Error(`DAF ou DG introuvable (DAF=${!!daf}, DG=${!!dg})`);

  console.log("✓ Tenant :", tenant.name);
  console.log("✓ DAF :", daf.firstName, daf.lastName);
  console.log("✓ DG :", dg.firstName, dg.lastName);

  const year = 2026;
  const months = [0, 1, 2, 3]; // janvier, février, mars, avril 2026

  let created = 0;
  let updated = 0;

  for (const [profileKey, user] of [
    ["DAF", daf],
    ["DG", dg],
  ]) {
    const profile = PROFILES[profileKey];
    for (const m of months) {
      const data = computePayslip(profile, year, m);
      const reference = `BS-${year}-${String(m + 1).padStart(2, "0")}-${user.lastName.slice(0, 3).toUpperCase()}`;

      const existing = await prisma.payslip.findUnique({
        where: { tenantId_userId_period: { tenantId: tenant.id, userId: user.id, period: data.period } },
      });

      const payload = {
        tenantId: tenant.id,
        userId: user.id,
        period: data.period,
        periodLabel: data.periodLabel,
        periodEnd: data.periodEnd,
        paymentDate: data.paymentDate,
        paymentMode: "VIREMENT",
        grossAmount: data.grossAmount,
        taxableGross: data.taxableGross,
        netAmount: data.netAmount,
        socialCharges: data.socialCharges,
        fiscalCharges: data.fiscalCharges,
        employerCharges: data.employerCharges,
        baseSalary: data.baseSalary,
        overtimeAmount: data.overtimeAmount,
        overtimeHours: data.overtimeHours,
        seniorityBonus: data.seniorityBonus,
        transportAllowance: data.transportAllowance,
        otherBonuses: data.otherBonuses,
        cnpsAmount: data.cnpsAmount,
        irppAmount: data.irppAmount,
        otherDeductions: data.otherDeductions,
        paymentMethod: data.paymentMethod,
        paymentBankAccount: data.paymentBankAccount,
        paymentReference: reference,
        workedDays: data.workedDays,
        reportedHours: data.reportedHours,
        status: "PAID",
        validatedN1At: new Date(year, m, 22), // RH valide le 22
        validatedN2At: new Date(year, m, 24), // DAF valide le 24
        validatedN3At: new Date(year, m, 26), // DG valide le 26
        paidAt: data.paymentDate,
        issuedAt: data.paymentDate,
      };

      if (existing) {
        await prisma.payslip.update({ where: { id: existing.id }, data: payload });
        updated++;
      } else {
        await prisma.payslip.create({ data: payload });
        created++;
      }
    }
  }

  console.log(`\n✓ Bulletins : ${created} créés, ${updated} mis à jour.`);

  // Affichage récap
  for (const u of [daf, dg]) {
    const slips = await prisma.payslip.findMany({
      where: { userId: u.id, period: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      orderBy: { period: "asc" },
      select: { periodLabel: true, grossAmount: true, netAmount: true, status: true },
    });
    const cumulNet = slips.reduce((s, p) => s + Number(p.netAmount), 0);
    console.log(`\n${u.firstName} ${u.lastName} (${u.role}) — ${slips.length} bulletins ${year} :`);
    for (const s of slips) {
      console.log(`  ${s.periodLabel} · Brut ${Number(s.grossAmount).toLocaleString("fr-FR")} · Net ${Number(s.netAmount).toLocaleString("fr-FR")} · ${s.status}`);
    }
    console.log(`  → Cumul net : ${cumulNet.toLocaleString("fr-FR")} FCFA`);
  }

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
