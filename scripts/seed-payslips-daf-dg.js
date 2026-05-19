require("./_guard-prod");
// Génère des bulletins de paie 2026 RÉALISTES et COMPLETS pour Marie NGONO
// (DAF) et Albert DAAYANG (DG) sur le tenant batimcam : janvier à avril 2026.
//
// Ce script enrichit aussi :
//   - le tenant BatimCAM SA (coordonnées, logo, signature DRH, cachet)
//   - les users DAF + DG (échelon, indice, coefficient, département, photo,
//     situation familiale, N° CNPS / Carte CNPS / NIU)
//   - les LeaveBalance et Absence pour avoir des stats réalistes en bas de page
//   - les PayslipLine catégorisées (gains, retenues sociales/fiscales/autres,
//     charges patronales sociales/autres) pour remplir les 4 colonnes du bulletin
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ───────────── Profils complets ─────────────
const PROFILES = {
  DAF: {
    baseSalary: 2_000_000n,
    seniorityBonus: 250_000n,
    transportAllowance: 75_000n,
    housingAllowance: 150_000n,
    performanceBonus: 200_000n,
    representationAllowance: 100_000n,
    bank: "Afriland First Bank · ****1842",
    bankName: "Afriland First Bank",
    bankAgency: "Bonanjo Douala",
    rib: "10023 45678 90000123456 72",
    overtimeHours: 8,
    overtimeAmount: 90_000n, // 8h × 11 250
    advances: 80_000n, // avance sur salaire
    loans: 40_000n, // prêt social
    absenceDeductions: 15_000n,
    miscDeductions: 16_900n,
    workedDays: 22,
    reportedHours: 176,
    user: {
      familyStatus: "Mariée, 3 enfants",
      cnpsNumber: "1234567890",
      cnpsCardNumber: "9876543210",
      niu: "M1234567890123H",
      echelon: "E3",
      classCategory: "Classe 12",
      indiceSalarial: 620,
      coefficientSalarial: 1.65,
      department: "Direction Financière",
      position: "Directrice Administrative et Financière",
      professionalCategory: "Cadre 12 · Échelon 3",
      avatarUrl: "/seed/avatar-marie.svg",
    },
    leave: { acquired: 30, taken: 12.5, remaining: 17.5 },
    absences: { unjustifiedDays: 0, delays: 1 },
  },
  DG: {
    baseSalary: 3_500_000n,
    seniorityBonus: 525_000n,
    transportAllowance: 100_000n,
    housingAllowance: 300_000n,
    performanceBonus: 500_000n,
    representationAllowance: 250_000n,
    bank: "Société Générale Cameroun · ****0019",
    bankName: "Société Générale Cameroun",
    bankAgency: "Akwa Douala",
    rib: "10043 78901 23000456789 03",
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
      cnpsNumber: "1234567891",
      cnpsCardNumber: "9876543211",
      niu: "M1234567890124H",
      echelon: "HC",
      classCategory: "Classe 1",
      indiceSalarial: 850,
      coefficientSalarial: 2.10,
      department: "Direction Générale",
      position: "Directeur Général",
      professionalCategory: "Cadre Hors Classe · HC",
      avatarUrl: "/seed/avatar-albert.svg",
    },
    leave: { acquired: 30, taken: 8.0, remaining: 22.0 },
    absences: { unjustifiedDays: 0, delays: 0 },
  },
};

const TENANT_FIELDS = {
  contactAddress: "1254, Rue Koloko — Bonapriso — Douala",
  contactPhone: "+237 6 12 34 56 78 / +237 6 98 76 54 32",
  contactEmail: "contact@batimcam.cm",
  websiteUrl: "www.batimcam.cm",
  logoUrl: "/seed/batimcam-logo.svg",
  signatureImageUrl: "/seed/signature-drh.svg",
  stampImageUrl: "/seed/stamp-batimcam.svg",
  drhSignatoryName: "Mme Marie ETOUNDI, DRH",
};

function fmtMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function periodBounds(year, monthIdx0) {
  const start = new Date(year, monthIdx0, 1);
  const end = new Date(year, monthIdx0 + 1, 0, 23, 59, 59);
  return { start, end };
}

function computeTotals(profile) {
  const {
    baseSalary, seniorityBonus, transportAllowance, housingAllowance,
    performanceBonus, representationAllowance, overtimeAmount,
    advances, loans, absenceDeductions, miscDeductions,
  } = profile;

  const totalBonuses = housingAllowance + performanceBonus + representationAllowance;
  const grossAmount = baseSalary + seniorityBonus + transportAllowance + totalBonuses + overtimeAmount;
  const taxableGross = baseSalary + seniorityBonus + totalBonuses + overtimeAmount; // transport non imposable

  const plafondCnps = 750_000n;
  const baseCnps = taxableGross > plafondCnps ? plafondCnps : taxableGross;

  const cnpsSal = (baseCnps * 42n) / 1000n; // 4,20 %
  const cfcSal = (taxableGross * 10n) / 1000n; // 1,00 %
  const cacSal = ((taxableGross * 18n) / 100n) > 200_000n ? ((((taxableGross - 200_000n) * 18n) / 100n) * 10n) / 100n : 0n;

  const irppBase = taxableGross > 200_000n ? taxableGross - 200_000n : 0n;
  const irppAmount = (irppBase * 18n) / 100n;

  const cnpsEmp = (baseCnps * 168n) / 1000n; // 16,80 %
  const cfcEmp = (taxableGross * 15n) / 1000n; // 1,50 %
  const fneEmp = (taxableGross * 12n) / 1000n; // 1,20 %
  const accidentTravail = (baseCnps * 20n) / 1000n; // 2,00 %
  const medecine = (baseCnps * 5n) / 1000n; // 0,50 %
  const formationPro = (baseCnps * 12n) / 1000n; // 1,20 %
  const autresPatron = (baseCnps * 50n) / 1000n; // 5,00 %

  const socialCharges = cnpsSal + cfcSal;
  const fiscalCharges = irppAmount + cacSal;
  const otherDeductionsTotal = advances + loans + absenceDeductions + miscDeductions;
  const totalDeductions = socialCharges + fiscalCharges + otherDeductionsTotal;

  const employerSocial = cnpsEmp + cfcEmp + fneEmp;
  const employerOther = accidentTravail + medecine + formationPro + autresPatron;
  const employerCharges = employerSocial + employerOther;

  const netAmount = grossAmount - totalDeductions;

  return {
    grossAmount, taxableGross, netAmount,
    socialCharges, fiscalCharges, employerCharges,
    cnpsAmount: cnpsSal, irppAmount, otherDeductions: otherDeductionsTotal,
    baseCnps, totalBonuses,
    // Détail pour les lignes
    cnpsSal, cfcSal, cacSal, irppAmount2: irppAmount,
    advances, loans, absenceDeductions, miscDeductions,
    cnpsEmp, cfcEmp, fneEmp, accidentTravail, medecine, formationPro, autresPatron,
    housingAllowance, performanceBonus, representationAllowance, overtimeAmount,
  };
}

function buildLines(profile, totals) {
  const lines = [];
  let order = 10;
  const add = (line) => lines.push({ ...line, order: (order += 10) });

  // ─── 1. GAINS ───
  add({
    code: "A001", label: "Salaire de base",
    category: "GAIN",
    quantity: profile.workedDays, base: profile.baseSalary, rate: null,
    amountPlus: profile.baseSalary, amountMinus: null, employerAmount: null,
  });
  add({
    code: "A002", label: "Indemnité de transport",
    category: "GAIN",
    quantity: null, base: null, rate: null,
    amountPlus: profile.transportAllowance, amountMinus: null, employerAmount: null,
  });
  add({
    code: "A003", label: "Indemnité de logement",
    category: "GAIN",
    quantity: null, base: null, rate: null,
    amountPlus: totals.housingAllowance, amountMinus: null, employerAmount: null,
  });
  add({
    code: "A004", label: "Prime de rendement",
    category: "GAIN",
    quantity: null, base: profile.baseSalary, rate: 15.0,
    amountPlus: totals.performanceBonus, amountMinus: null, employerAmount: null,
  });
  if (totals.overtimeAmount > 0n) {
    add({
      code: "A005", label: "Heures supplémentaires",
      category: "GAIN",
      quantity: profile.overtimeHours, base: 11_250n, rate: 125,
      amountPlus: totals.overtimeAmount, amountMinus: null, employerAmount: null,
    });
  }
  add({
    code: "A006", label: "Prime d'ancienneté",
    category: "GAIN",
    quantity: null, base: profile.baseSalary, rate: null,
    amountPlus: profile.seniorityBonus, amountMinus: null, employerAmount: null,
  });
  add({
    code: "A099", label: "Autres primes et indemnités",
    category: "GAIN",
    quantity: null, base: null, rate: null,
    amountPlus: totals.representationAllowance, amountMinus: null, employerAmount: null,
  });

  // ─── 2A. RETENUES SOCIALES ───
  add({
    code: "B001", label: "CNPS salarié",
    category: "DEDUCTION_SOCIAL",
    quantity: null, base: totals.baseCnps, rate: 4.20,
    amountPlus: null, amountMinus: totals.cnpsSal, employerAmount: null,
  });
  add({
    code: "B002", label: "CFC salarié",
    category: "DEDUCTION_SOCIAL",
    quantity: null, base: totals.taxableGross, rate: 1.00,
    amountPlus: null, amountMinus: totals.cfcSal, employerAmount: null,
  });
  add({
    code: "B004", label: "CAC (10 % de l'IRPP)",
    category: "DEDUCTION_SOCIAL",
    quantity: null, base: totals.irppAmount, rate: 10.0,
    amountPlus: null, amountMinus: totals.cacSal, employerAmount: null,
  });

  // ─── 2B. RETENUES FISCALES ───
  add({
    code: "B003", label: "IRPP (Impôt sur le revenu)",
    category: "DEDUCTION_FISCAL",
    quantity: null, base: totals.taxableGross, rate: null,
    amountPlus: null, amountMinus: totals.irppAmount, employerAmount: null,
  });

  // ─── 2C. AUTRES RETENUES ───
  if (totals.advances > 0n) {
    add({
      code: "B005", label: "Avance sur salaire",
      category: "DEDUCTION_OTHER",
      quantity: null, base: null, rate: null,
      amountPlus: null, amountMinus: totals.advances, employerAmount: null,
    });
  }
  if (totals.loans > 0n) {
    add({
      code: "B006", label: "Prêt social",
      category: "DEDUCTION_OTHER",
      quantity: null, base: null, rate: null,
      amountPlus: null, amountMinus: totals.loans, employerAmount: null,
    });
  }
  if (totals.absenceDeductions > 0n) {
    add({
      code: "B007", label: "Absences & retards",
      category: "DEDUCTION_OTHER",
      quantity: null, base: null, rate: null,
      amountPlus: null, amountMinus: totals.absenceDeductions, employerAmount: null,
    });
  }
  if (totals.miscDeductions > 0n) {
    add({
      code: "B099", label: "Autres retenues diverses",
      category: "DEDUCTION_OTHER",
      quantity: null, base: null, rate: null,
      amountPlus: null, amountMinus: totals.miscDeductions, employerAmount: null,
    });
  }

  // ─── 3A. CHARGES PATRONALES SOCIALES ───
  add({
    code: "C001", label: "CNPS employeur",
    category: "EMPLOYER_SOCIAL",
    quantity: null, base: totals.baseCnps, rate: 16.80,
    amountPlus: null, amountMinus: null, employerAmount: totals.cnpsEmp,
  });
  add({
    code: "C002", label: "CFC employeur",
    category: "EMPLOYER_SOCIAL",
    quantity: null, base: totals.taxableGross, rate: 1.50,
    amountPlus: null, amountMinus: null, employerAmount: totals.cfcEmp,
  });
  add({
    code: "C003", label: "Fonds National de l'Emploi",
    category: "EMPLOYER_SOCIAL",
    quantity: null, base: totals.taxableGross, rate: 1.20,
    amountPlus: null, amountMinus: null, employerAmount: totals.fneEmp,
  });

  // ─── 3B. AUTRES CHARGES PATRONALES ───
  add({
    code: "C005", label: "Assurance Accident Travail",
    category: "EMPLOYER_OTHER",
    quantity: null, base: totals.baseCnps, rate: 2.00,
    amountPlus: null, amountMinus: null, employerAmount: totals.accidentTravail,
  });
  add({
    code: "C006", label: "Médecine du travail",
    category: "EMPLOYER_OTHER",
    quantity: null, base: totals.baseCnps, rate: 0.50,
    amountPlus: null, amountMinus: null, employerAmount: totals.medecine,
  });
  add({
    code: "C007", label: "Formation professionnelle",
    category: "EMPLOYER_OTHER",
    quantity: null, base: totals.baseCnps, rate: 1.20,
    amountPlus: null, amountMinus: null, employerAmount: totals.formationPro,
  });
  add({
    code: "C099", label: "Autres charges patronales",
    category: "EMPLOYER_OTHER",
    quantity: null, base: totals.baseCnps, rate: 5.00,
    amountPlus: null, amountMinus: null, employerAmount: totals.autresPatron,
  });

  return lines;
}

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable — exécutez d'abord `pnpm db:seed`");

  // ─── Met à jour le tenant avec les coordonnées + logo/signature/cachet ───
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: TENANT_FIELDS,
  });
  console.log("✓ Tenant mis à jour :", tenant.name, "(logo, signature, cachet, coordonnées)");

  const daf = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "DAF", email: "marie@batimcam.cm" },
  });
  const dg = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "DG", email: "albert@batimcam.cm" },
  });
  if (!daf || !dg) throw new Error(`DAF ou DG introuvable (DAF=${!!daf}, DG=${!!dg})`);

  // ─── Enrichit les users avec tous les champs requis par le bulletin ───
  for (const [user, profileKey] of [[daf, "DAF"], [dg, "DG"]]) {
    const u = PROFILES[profileKey].user;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        familyStatus: u.familyStatus,
        cnpsNumber: u.cnpsNumber,
        cnpsCardNumber: u.cnpsCardNumber,
        niu: u.niu,
        echelon: u.echelon,
        classCategory: u.classCategory,
        indiceSalarial: u.indiceSalarial,
        coefficientSalarial: u.coefficientSalarial,
        department: u.department,
        position: u.position,
        professionalCategory: u.professionalCategory,
        avatarUrl: u.avatarUrl,
        bankName: PROFILES[profileKey].bankName,
        bankAgency: PROFILES[profileKey].bankAgency,
        rib: PROFILES[profileKey].rib,
      },
    });
  }
  console.log("✓ Users DAF + DG enrichis (échelon, indice, département, photo, banque)");

  // ─── LeaveBalance pour avoir des congés non-nuls ───
  for (const [user, profileKey] of [[daf, "DAF"], [dg, "DG"]]) {
    const leave = PROFILES[profileKey].leave;
    const existing = await prisma.leaveBalance.findFirst({
      where: { userId: user.id, year: 2026 },
    });
    const data = {
      tenantId: tenant.id,
      employeeKey: user.id,
      employeeName: `${user.firstName} ${user.lastName}`,
      userId: user.id,
      year: 2026,
      paidLeaveAcquired: leave.acquired,
      paidLeaveTaken: leave.taken,
      paidLeaveRemaining: leave.remaining,
    };
    if (existing) {
      await prisma.leaveBalance.update({ where: { id: existing.id }, data });
    } else {
      await prisma.leaveBalance.create({ data });
    }
  }
  console.log("✓ LeaveBalance 2026 set pour DAF + DG");

  // ─── Absences (retards essentiellement) ───
  for (const [user, profileKey] of [[daf, "DAF"], [dg, "DG"]]) {
    const a = PROFILES[profileKey].absences;
    // On nettoie d'abord les anciennes absences seed pour éviter les doublons
    await prisma.absence.deleteMany({
      where: { employeeKey: user.id, tenantId: tenant.id, date: { gte: new Date(2026, 0, 1), lt: new Date(2026, 11, 31) } },
    });
    const records = [];
    for (let i = 0; i < a.delays; i++) {
      records.push({
        tenantId: tenant.id,
        employeeKey: user.id,
        employeeName: `${user.firstName} ${user.lastName}`,
        date: new Date(2026, 3, 10 + i),
        reason: "LATE",
        justified: false,
        reportedBy: "Système de pointage",
      });
    }
    for (let i = 0; i < a.unjustifiedDays; i++) {
      records.push({
        tenantId: tenant.id,
        employeeKey: user.id,
        employeeName: `${user.firstName} ${user.lastName}`,
        date: new Date(2026, 3, 20 + i),
        reason: "UNJUSTIFIED",
        justified: false,
        reportedBy: "Manager",
      });
    }
    if (records.length > 0) await prisma.absence.createMany({ data: records });
  }
  console.log("✓ Absences/retards créés");

  // ─── Bulletins + lignes ───
  const year = 2026;
  const months = [0, 1, 2, 3];

  let created = 0;
  let updated = 0;
  let linesCreated = 0;

  for (const [profileKey, user] of [
    ["DAF", daf],
    ["DG", dg],
  ]) {
    const profile = PROFILES[profileKey];
    for (const m of months) {
      const totals = computeTotals(profile);
      const { start, end } = periodBounds(year, m);
      const paymentDate = new Date(year, m, 28);
      const reference = `BS-${year}-${String(m + 1).padStart(2, "0")}-${user.lastName.slice(0, 3).toUpperCase()}`;

      const payload = {
        tenantId: tenant.id,
        userId: user.id,
        period: start,
        periodLabel: fmtMonth(year, m + 1),
        periodEnd: end,
        paymentDate,
        paymentMode: "VIREMENT",
        grossAmount: totals.grossAmount,
        taxableGross: totals.taxableGross,
        netAmount: totals.netAmount,
        socialCharges: totals.socialCharges,
        fiscalCharges: totals.fiscalCharges,
        employerCharges: totals.employerCharges,
        baseSalary: profile.baseSalary,
        overtimeAmount: totals.overtimeAmount,
        overtimeHours: profile.overtimeHours,
        seniorityBonus: profile.seniorityBonus,
        transportAllowance: profile.transportAllowance,
        otherBonuses: [
          { label: "Indemnité logement", amount: Number(profile.housingAllowance) },
          { label: "Prime rendement", amount: Number(profile.performanceBonus) },
          { label: "Indemnité représentation", amount: Number(profile.representationAllowance) },
        ],
        cnpsAmount: totals.cnpsSal,
        irppAmount: totals.irppAmount,
        otherDeductions: totals.otherDeductions,
        paymentMethod: "BANK_TRANSFER",
        paymentBankAccount: profile.bank,
        paymentReference: reference,
        workedDays: profile.workedDays,
        reportedHours: profile.reportedHours,
        status: "PAID",
        validatedN1At: new Date(year, m, 22),
        validatedN2At: new Date(year, m, 24),
        validatedN3At: new Date(year, m, 26),
        paidAt: paymentDate,
        issuedAt: paymentDate,
      };

      const existing = await prisma.payslip.findUnique({
        where: { tenantId_userId_period: { tenantId: tenant.id, userId: user.id, period: start } },
      });

      let payslipId;
      if (existing) {
        await prisma.payslip.update({ where: { id: existing.id }, data: payload });
        payslipId = existing.id;
        updated++;
        // Supprime les anciennes lignes pour éviter les doublons
        await prisma.payslipLine.deleteMany({ where: { payslipId } });
      } else {
        const created2 = await prisma.payslip.create({ data: payload });
        payslipId = created2.id;
        created++;
      }

      const lines = buildLines(profile, totals);
      await prisma.payslipLine.createMany({
        data: lines.map((l) => ({ ...l, payslipId })),
      });
      linesCreated += lines.length;
    }
  }

  console.log(`\n✓ Bulletins : ${created} créés, ${updated} mis à jour, ${linesCreated} lignes catégorisées créées.`);

  // ─── Récap ───
  for (const u of [daf, dg]) {
    const slips = await prisma.payslip.findMany({
      where: { userId: u.id, period: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      orderBy: { period: "asc" },
      select: { periodLabel: true, grossAmount: true, netAmount: true, status: true, _count: { select: { lines: true } } },
    });
    const cumulNet = slips.reduce((s, p) => s + Number(p.netAmount), 0);
    console.log(`\n${u.firstName} ${u.lastName} (${u.role}) — ${slips.length} bulletins ${year} :`);
    for (const s of slips) {
      console.log(
        `  ${s.periodLabel} · Brut ${Number(s.grossAmount).toLocaleString("fr-FR")} · Net ${Number(s.netAmount).toLocaleString("fr-FR")} · ${s.status} · ${s._count.lines} lignes`,
      );
    }
    console.log(`  → Cumul net : ${cumulNet.toLocaleString("fr-FR")} FCFA`);
  }

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
