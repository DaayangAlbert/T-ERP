require("./_guard-prod");
// Ajoute les PayslipLine catégorisées (GAIN / DEDUCTION_* / EMPLOYER_*)
// aux bulletins de paie des ouvriers existants, pour que le PDF officiel
// (PayslipPDF.tsx, 4 colonnes) affiche un contenu lisible au lieu de
// colonnes vides.
//
// Catégorisation conforme à la maquette T-ERP BTP :
//   - GAIN          (codes 01xx) : salaire base + heures sup + primes
//   - DEDUCTION_SOCIAL (31xx)    : CNPS salarié + CAC
//   - DEDUCTION_FISCAL (32xx)    : IRPP
//   - EMPLOYER_SOCIAL (41xx)     : CNPS employeur + CAC + FNE
//   - EMPLOYER_OTHER  (42xx)     : Accident travail + Médecine + Formation
//
// Idempotent : ne recrée pas les lignes déjà présentes.
//
// Usage : node scripts/seed-worker-payslip-lines.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function bi(n) { return BigInt(Math.round(Number(n))); }

async function main() {
  console.log("Génération des PayslipLine pour les bulletins ouvriers...\n");

  const payslips = await prisma.payslip.findMany({
    where: {
      user: { role: "WORKER" },
    },
    select: {
      id: true,
      userId: true,
      baseSalary: true,
      overtimeAmount: true,
      overtimeHours: true,
      seniorityBonus: true,
      transportAllowance: true,
      grossAmount: true,
      taxableGross: true,
      cnpsAmount: true,
      irppAmount: true,
      otherDeductions: true,
      employerCharges: true,
      periodLabel: true,
      lines: { select: { id: true }, take: 1 },
    },
  });
  console.log(`Bulletins ouvriers trouvés : ${payslips.length}\n`);

  let processed = 0;
  let skipped = 0;
  let linesCreated = 0;

  for (const p of payslips) {
    if (p.lines.length > 0) {
      skipped++;
      continue; // déjà ligné, on n'écrase pas
    }

    const base = Number(p.baseSalary ?? 0);
    const ovt = Number(p.overtimeAmount ?? 0);
    const sen = Number(p.seniorityBonus ?? 0);
    const trans = Number(p.transportAllowance ?? 0);
    const taxable = Number(p.taxableGross ?? 0);
    const cnpsSal = Number(p.cnpsAmount ?? 0);
    const irpp = Number(p.irppAmount ?? 0);
    const employer = Number(p.employerCharges ?? 0);

    // Sous-décompositions cohérentes (CAC salarié ≈ 1% IRPP ; CNPS empl. 16.8%
    // est ventilé : 11.2 % vieillesse + 4.5 % prest. familiales + 1.1 % AT)
    const cacSal = Math.round(irpp * 0.10);
    const irppNet = irpp - cacSal;
    const cnpsEmpl = Math.round(taxable * 0.112);
    const cacEmpl = Math.round(taxable * 0.045);
    const fne = Math.round(taxable * 0.011);
    const accTravail = Math.round(taxable * 0.0175);
    const medecine = Math.round(taxable * 0.005);
    const formation = Math.round(taxable * 0.005);

    const lines = [];

    // ── GAINS (01xx) ──
    lines.push({
      code: "0101",
      label: "Salaire de base",
      quantity: 22,
      base: bi(base),
      rate: null,
      amountPlus: bi(base),
      amountMinus: null,
      employerAmount: null,
      category: "GAIN",
      order: 1,
    });
    if (ovt > 0) {
      lines.push({
        code: "0105",
        label: "Heures supplémentaires",
        quantity: p.overtimeHours,
        base: null,
        rate: 125.0,
        amountPlus: bi(ovt),
        amountMinus: null,
        employerAmount: null,
        category: "GAIN",
        order: 2,
      });
    }
    if (sen > 0) {
      lines.push({
        code: "0106",
        label: "Prime d'ancienneté",
        quantity: null,
        base: bi(base),
        rate: null,
        amountPlus: bi(sen),
        amountMinus: null,
        employerAmount: null,
        category: "GAIN",
        order: 3,
      });
    }
    if (trans > 0) {
      lines.push({
        code: "0102",
        label: "Indemnité de transport",
        quantity: null,
        base: null,
        rate: null,
        amountPlus: bi(trans),
        amountMinus: null,
        employerAmount: null,
        category: "GAIN",
        order: 4,
      });
    }

    // ── DEDUCTION_SOCIAL (31xx) ──
    lines.push({
      code: "3101",
      label: "CNPS salarié",
      quantity: null,
      base: bi(taxable),
      rate: 4.2,
      amountPlus: null,
      amountMinus: bi(cnpsSal),
      employerAmount: null,
      category: "DEDUCTION_SOCIAL",
      order: 5,
    });
    if (cacSal > 0) {
      lines.push({
        code: "3102",
        label: "CAC salarié",
        quantity: null,
        base: bi(irpp),
        rate: 10.0,
        amountPlus: null,
        amountMinus: bi(cacSal),
        employerAmount: null,
        category: "DEDUCTION_SOCIAL",
        order: 6,
      });
    }

    // ── DEDUCTION_FISCAL (32xx) ──
    lines.push({
      code: "3201",
      label: "IRPP (impôt sur le revenu)",
      quantity: null,
      base: bi(taxable),
      rate: 10.0,
      amountPlus: null,
      amountMinus: bi(irppNet > 0 ? irppNet : irpp),
      employerAmount: null,
      category: "DEDUCTION_FISCAL",
      order: 7,
    });

    // ── EMPLOYER_SOCIAL (41xx) ──
    lines.push({
      code: "4101",
      label: "CNPS employeur (vieillesse)",
      quantity: null,
      base: bi(taxable),
      rate: 11.2,
      amountPlus: null,
      amountMinus: null,
      employerAmount: bi(cnpsEmpl),
      category: "EMPLOYER_SOCIAL",
      order: 8,
    });
    lines.push({
      code: "4102",
      label: "CAC employeur (prestations familiales)",
      quantity: null,
      base: bi(taxable),
      rate: 4.5,
      amountPlus: null,
      amountMinus: null,
      employerAmount: bi(cacEmpl),
      category: "EMPLOYER_SOCIAL",
      order: 9,
    });
    lines.push({
      code: "4103",
      label: "Fonds National de l'Emploi",
      quantity: null,
      base: bi(taxable),
      rate: 1.1,
      amountPlus: null,
      amountMinus: null,
      employerAmount: bi(fne),
      category: "EMPLOYER_SOCIAL",
      order: 10,
    });

    // ── EMPLOYER_OTHER (42xx) ──
    lines.push({
      code: "4201",
      label: "Assurance Accident Travail",
      quantity: null,
      base: bi(taxable),
      rate: 1.75,
      amountPlus: null,
      amountMinus: null,
      employerAmount: bi(accTravail),
      category: "EMPLOYER_OTHER",
      order: 11,
    });
    lines.push({
      code: "4202",
      label: "Médecine du travail",
      quantity: null,
      base: bi(taxable),
      rate: 0.5,
      amountPlus: null,
      amountMinus: null,
      employerAmount: bi(medecine),
      category: "EMPLOYER_OTHER",
      order: 12,
    });
    lines.push({
      code: "4203",
      label: "Formation professionnelle",
      quantity: null,
      base: bi(taxable),
      rate: 0.5,
      amountPlus: null,
      amountMinus: null,
      employerAmount: bi(formation),
      category: "EMPLOYER_OTHER",
      order: 13,
    });

    await prisma.payslipLine.createMany({
      data: lines.map((l) => ({ payslipId: p.id, ...l })),
    });
    linesCreated += lines.length;
    processed++;
  }

  console.log(`✓ Bulletins traités       : ${processed}`);
  console.log(`✓ Bulletins déjà lignés   : ${skipped} (skip)`);
  console.log(`✓ Lignes créées au total  : ${linesCreated}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Erreur :", err);
  await prisma.$disconnect();
  process.exit(1);
});
