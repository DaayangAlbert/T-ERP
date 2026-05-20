/**
 * Génère un bulletin de paie de TEST complet pour un utilisateur donné.
 *
 * Usage :
 *   node scripts/seed-test-payslip.js <email> [mois] [annee]
 *
 * Exemple :
 *   node scripts/seed-test-payslip.js daayangalbert@gmail.com
 *   node scripts/seed-test-payslip.js daayangalbert@gmail.com 4 2026
 *
 * - Enrichit l'utilisateur avec les champs paie manquants (échelon, indice,
 *   département, banque, CNPS, NIU) s'ils sont vides.
 * - Crée un bulletin PAID avec lignes catégorisées (gains, retenues
 *   sociales/fiscales/autres, charges patronales) pour remplir le PDF.
 * - Idempotent : si un bulletin existe pour la période, il est mis à jour.
 *
 * Conçu pour tester le rendu PDF du bulletin (signature, cachet, etc.).
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PROFILE = {
  baseSalary: 1_500_000n,
  seniorityBonus: 150_000n,
  transportAllowance: 60_000n,
  housingAllowance: 120_000n,
  performanceBonus: 150_000n,
  representationAllowance: 80_000n,
  bank: "Afriland First Bank · ****7421",
  bankName: "Afriland First Bank",
  bankAgency: "Maroua",
  rib: "10005 00021 12345678901 44",
  overtimeHours: 0,
  overtimeAmount: 0n,
  advances: 0n,
  loans: 0n,
  absenceDeductions: 0n,
  miscDeductions: 0n,
  workedDays: 22,
  reportedHours: 176,
  user: {
    familyStatus: "Marié, 2 enfants",
    cnpsNumber: "5566778899",
    cnpsCardNumber: "1122334455",
    niu: "M050621004411T",
    echelon: "E2",
    classCategory: "Classe 10",
    indiceSalarial: 540,
    coefficientSalarial: 1.45,
    department: "Direction Informatique",
    position: "Administrateur Informatique",
    professionalCategory: "Cadre 10 · Échelon 2",
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

function computeTotals(p) {
  const totalBonuses = p.housingAllowance + p.performanceBonus + p.representationAllowance;
  const grossAmount = p.baseSalary + p.seniorityBonus + p.transportAllowance + totalBonuses + p.overtimeAmount;
  const taxableGross = p.baseSalary + p.seniorityBonus + totalBonuses + p.overtimeAmount;
  const plafondCnps = 750_000n;
  const baseCnps = taxableGross > plafondCnps ? plafondCnps : taxableGross;
  const cnpsSal = (baseCnps * 42n) / 1000n;
  const cfcSal = (taxableGross * 10n) / 1000n;
  const irppBase = taxableGross > 200_000n ? taxableGross - 200_000n : 0n;
  const irppAmount = (irppBase * 18n) / 100n;
  const cacSal = irppAmount > 0n ? (irppAmount * 10n) / 100n : 0n;
  const cnpsEmp = (baseCnps * 168n) / 1000n;
  const cfcEmp = (taxableGross * 15n) / 1000n;
  const fneEmp = (taxableGross * 12n) / 1000n;
  const accidentTravail = (baseCnps * 20n) / 1000n;
  const medecine = (baseCnps * 5n) / 1000n;
  const formationPro = (baseCnps * 12n) / 1000n;
  const autresPatron = (baseCnps * 50n) / 1000n;

  const socialCharges = cnpsSal + cfcSal;
  const fiscalCharges = irppAmount + cacSal;
  const otherDeductionsTotal = p.advances + p.loans + p.absenceDeductions + p.miscDeductions;
  const totalDeductions = socialCharges + fiscalCharges + otherDeductionsTotal;
  const employerCharges = cnpsEmp + cfcEmp + fneEmp + accidentTravail + medecine + formationPro + autresPatron;
  const netAmount = grossAmount - totalDeductions;

  return {
    grossAmount, taxableGross, netAmount, socialCharges, fiscalCharges, employerCharges,
    cnpsAmount: cnpsSal, irppAmount, otherDeductions: otherDeductionsTotal,
    baseCnps, totalBonuses, cnpsSal, cfcSal, cacSal,
    cnpsEmp, cfcEmp, fneEmp, accidentTravail, medecine, formationPro, autresPatron,
    housingAllowance: p.housingAllowance, performanceBonus: p.performanceBonus,
    representationAllowance: p.representationAllowance, overtimeAmount: p.overtimeAmount,
  };
}

function buildLines(p, t) {
  const lines = [];
  let order = 10;
  const add = (l) => lines.push({ ...l, order: (order += 10) });
  add({ code: "A001", label: "Salaire de base", category: "GAIN", quantity: p.workedDays, base: p.baseSalary, rate: null, amountPlus: p.baseSalary, amountMinus: null, employerAmount: null });
  add({ code: "A002", label: "Indemnité de transport", category: "GAIN", quantity: null, base: null, rate: null, amountPlus: p.transportAllowance, amountMinus: null, employerAmount: null });
  add({ code: "A003", label: "Indemnité de logement", category: "GAIN", quantity: null, base: null, rate: null, amountPlus: t.housingAllowance, amountMinus: null, employerAmount: null });
  add({ code: "A004", label: "Prime de rendement", category: "GAIN", quantity: null, base: p.baseSalary, rate: 10.0, amountPlus: t.performanceBonus, amountMinus: null, employerAmount: null });
  add({ code: "A006", label: "Prime d'ancienneté", category: "GAIN", quantity: null, base: p.baseSalary, rate: null, amountPlus: p.seniorityBonus, amountMinus: null, employerAmount: null });
  add({ code: "A099", label: "Indemnité de représentation", category: "GAIN", quantity: null, base: null, rate: null, amountPlus: t.representationAllowance, amountMinus: null, employerAmount: null });
  add({ code: "B001", label: "CNPS salarié", category: "DEDUCTION_SOCIAL", quantity: null, base: t.baseCnps, rate: 4.2, amountPlus: null, amountMinus: t.cnpsSal, employerAmount: null });
  add({ code: "B002", label: "CFC salarié", category: "DEDUCTION_SOCIAL", quantity: null, base: t.taxableGross, rate: 1.0, amountPlus: null, amountMinus: t.cfcSal, employerAmount: null });
  add({ code: "B004", label: "CAC (10 % IRPP)", category: "DEDUCTION_SOCIAL", quantity: null, base: t.irppAmount, rate: 10.0, amountPlus: null, amountMinus: t.cacSal, employerAmount: null });
  add({ code: "B003", label: "IRPP", category: "DEDUCTION_FISCAL", quantity: null, base: t.taxableGross, rate: null, amountPlus: null, amountMinus: t.irppAmount, employerAmount: null });
  add({ code: "C001", label: "CNPS employeur", category: "EMPLOYER_SOCIAL", quantity: null, base: t.baseCnps, rate: 16.8, amountPlus: null, amountMinus: null, employerAmount: t.cnpsEmp });
  add({ code: "C002", label: "CFC employeur", category: "EMPLOYER_SOCIAL", quantity: null, base: t.taxableGross, rate: 1.5, amountPlus: null, amountMinus: null, employerAmount: t.cfcEmp });
  add({ code: "C003", label: "Fonds National Emploi", category: "EMPLOYER_SOCIAL", quantity: null, base: t.taxableGross, rate: 1.2, amountPlus: null, amountMinus: null, employerAmount: t.fneEmp });
  add({ code: "C005", label: "Accident travail", category: "EMPLOYER_OTHER", quantity: null, base: t.baseCnps, rate: 2.0, amountPlus: null, amountMinus: null, employerAmount: t.accidentTravail });
  add({ code: "C006", label: "Médecine du travail", category: "EMPLOYER_OTHER", quantity: null, base: t.baseCnps, rate: 0.5, amountPlus: null, amountMinus: null, employerAmount: t.medecine });
  add({ code: "C007", label: "Formation pro", category: "EMPLOYER_OTHER", quantity: null, base: t.baseCnps, rate: 1.2, amountPlus: null, amountMinus: null, employerAmount: t.formationPro });
  add({ code: "C099", label: "Autres charges patronales", category: "EMPLOYER_OTHER", quantity: null, base: t.baseCnps, rate: 5.0, amountPlus: null, amountMinus: null, employerAmount: t.autresPatron });
  return lines;
}

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/seed-test-payslip.js <email> [mois 1-12] [annee]");
    process.exit(1);
  }
  const now = new Date();
  const month = process.argv[3] ? Number(process.argv[3]) : now.getMonth() + 1;
  const year = process.argv[4] ? Number(process.argv[4]) : now.getFullYear();
  const monthIdx0 = month - 1;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
  });
  if (!user) {
    console.error(`❌ User introuvable : ${email}`);
    process.exit(2);
  }
  if (!user.tenant) {
    console.error(`❌ User sans tenant (candidat / super-admin ?)`);
    process.exit(2);
  }

  // Enrichit le user avec les champs paie manquants (n'écrase pas l'existant)
  const u = PROFILE.user;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      familyStatus: user.familyStatus ?? u.familyStatus,
      cnpsNumber: user.cnpsNumber ?? u.cnpsNumber,
      cnpsCardNumber: user.cnpsCardNumber ?? u.cnpsCardNumber,
      niu: user.niu ?? u.niu,
      echelon: user.echelon ?? u.echelon,
      classCategory: user.classCategory ?? u.classCategory,
      indiceSalarial: user.indiceSalarial ?? u.indiceSalarial,
      coefficientSalarial: user.coefficientSalarial ?? u.coefficientSalarial,
      department: user.department ?? u.department,
      position: user.position ?? u.position,
      professionalCategory: user.professionalCategory ?? u.professionalCategory,
      bankName: user.bankName ?? PROFILE.bankName,
      bankAgency: user.bankAgency ?? PROFILE.bankAgency,
      rib: user.rib ?? PROFILE.rib,
    },
  });

  const totals = computeTotals(PROFILE);
  const { start, end } = periodBounds(year, monthIdx0);
  const paymentDate = new Date(year, monthIdx0, 28);
  const reference = `BS-${year}-${String(month).padStart(2, "0")}-${user.lastName.slice(0, 3).toUpperCase()}`;

  const payload = {
    tenantId: user.tenant.id,
    userId: user.id,
    period: start,
    periodLabel: fmtMonth(year, month),
    periodEnd: end,
    paymentDate,
    paymentMode: "VIREMENT",
    grossAmount: totals.grossAmount,
    taxableGross: totals.taxableGross,
    netAmount: totals.netAmount,
    socialCharges: totals.socialCharges,
    fiscalCharges: totals.fiscalCharges,
    employerCharges: totals.employerCharges,
    baseSalary: PROFILE.baseSalary,
    overtimeAmount: totals.overtimeAmount,
    overtimeHours: PROFILE.overtimeHours,
    seniorityBonus: PROFILE.seniorityBonus,
    transportAllowance: PROFILE.transportAllowance,
    otherBonuses: [
      { label: "Indemnité logement", amount: Number(PROFILE.housingAllowance) },
      { label: "Prime rendement", amount: Number(PROFILE.performanceBonus) },
      { label: "Indemnité représentation", amount: Number(PROFILE.representationAllowance) },
    ],
    cnpsAmount: totals.cnpsSal,
    irppAmount: totals.irppAmount,
    otherDeductions: totals.otherDeductions,
    paymentMethod: "BANK_TRANSFER",
    paymentBankAccount: PROFILE.bank,
    paymentReference: reference,
    workedDays: PROFILE.workedDays,
    reportedHours: PROFILE.reportedHours,
    status: "PAID",
    validatedN1At: new Date(year, monthIdx0, 22),
    validatedN2At: new Date(year, monthIdx0, 24),
    validatedN3At: new Date(year, monthIdx0, 26),
    paidAt: paymentDate,
    issuedAt: paymentDate,
  };

  const existing = await prisma.payslip.findUnique({
    where: { tenantId_userId_period: { tenantId: user.tenant.id, userId: user.id, period: start } },
  });

  let payslipId;
  if (existing) {
    await prisma.payslip.update({ where: { id: existing.id }, data: payload });
    payslipId = existing.id;
    await prisma.payslipLine.deleteMany({ where: { payslipId } });
    console.log(`✓ Bulletin existant mis à jour (${fmtMonth(year, month)})`);
  } else {
    const created = await prisma.payslip.create({ data: payload });
    payslipId = created.id;
    console.log(`✓ Bulletin créé (${fmtMonth(year, month)})`);
  }

  const lines = buildLines(PROFILE, totals);
  await prisma.payslipLine.createMany({ data: lines.map((l) => ({ ...l, payslipId })) });

  console.log(`✓ ${lines.length} lignes de paie créées`);
  console.log(`\nBulletin TEST pour ${user.firstName} ${user.lastName} (${user.email})`);
  console.log(`  Tenant : ${user.tenant.name} (${user.tenant.slug})`);
  console.log(`  Période : ${fmtMonth(year, month)}`);
  console.log(`  Brut    : ${Number(totals.grossAmount).toLocaleString("fr-FR")} FCFA`);
  console.log(`  Net     : ${Number(totals.netAmount).toLocaleString("fr-FR")} FCFA`);
  console.log(`  Statut  : PAID`);
  console.log(`\n  → Visible dans /${user.tenant.slug}/paie ou /${user.tenant.slug}/employe/paie`);
  console.log(`  → PDF : bouton "Télécharger" sur le bulletin`);

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
