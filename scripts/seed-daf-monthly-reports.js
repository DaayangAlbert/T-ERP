require("./_guard-prod");
// Seed des rapports financiers mensuels DAF — janvier, février, mars 2026.
// - Janvier 2026 : VALIDATED par Albert (validé)
// - Février 2026 : SUBMITTED en attente de décision du DG
// - Mars 2026 : DRAFT en cours de rédaction par Marie
//
// Le DG verra donc :
//   • À valider  : 1 rapport (Février)
//   • Validés    : 1 rapport (Janvier)
//   • Refusés    : 0
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const period = (year, month) => new Date(Date.UTC(year, month - 1, 1));

const REPORTS = [
  {
    period: period(2026, 1),
    periodLabel: "Janvier 2026",
    status: "VALIDATED",
    submittedDaysAgo: 95,
    validatedDaysAgo: 92,

    revenueMonthXAF: 1_240_000_000n,
    revenueYtdXAF: 1_240_000_000n,
    revenueBudgetMonthXAF: 1_200_000_000n,
    expensesMonthXAF: 1_085_000_000n,
    grossMarginXAF: 248_000_000n,
    grossMarginPercent: 20.0,
    netMarginXAF: 155_000_000n,
    netMarginPercent: 12.5,
    ebitdaXAF: 198_400_000n,
    ebitdaPercent: 16.0,

    cashBalanceXAF: 425_000_000n,
    cashVariationXAF: 35_000_000n,
    creditLinesUsedXAF: 80_000_000n,
    creditLinesAvailableXAF: 220_000_000n,
    capacityAutofinancingXAF: 175_000_000n,

    accountsReceivableXAF: 980_000_000n,
    overdueReceivablesXAF: 145_000_000n,
    doubtfulReceivablesXAF: 28_000_000n,
    dso: 72,

    accountsPayableXAF: 540_000_000n,
    overduePayablesXAF: 18_000_000n,
    dpo: 45,

    workingCapitalNeedXAF: 440_000_000n,
    financialDebtLtXAF: 320_000_000n,
    financialDebtStXAF: 80_000_000n,
    gearingPercent: 42.0,
    capexMonthXAF: 45_000_000n,

    payrollMassMonthXAF: 142_000_000n,
    payrollHeadcount: 487,
    payrollVsRevenuePercent: 11.5,

    vatCollectedXAF: 235_600_000n,
    vatDeductibleXAF: 162_750_000n,
    vatDueXAF: 72_850_000n,
    corporateTaxProvisionXAF: 46_500_000n,
    socialChargesUpToDate: true,
    fiscalDeadlinesNext30d: 2,

    executiveSummary:
      "Janvier 2026 démarre sur un volume d'activité solide, porté principalement par les chantiers MINTP (Pont Mfoundi extension + Olembé). Le CA produit dépasse le budget de 3,3 %. La marge brute (20 %) est en ligne avec les objectifs annuels. La trésorerie reste confortable avec 425 M FCFA et une variation positive de 35 M.",
    performanceAnalysis:
      "CA produit 1,24 Md FCFA vs budget 1,20 Md (+3,3 %). Marge brute 20 % stable. La rentabilité nette de 12,5 % est conforme au plan stratégique. EBITDA 198 M correspond à 16 % du CA.",
    cashFlowAnalysis:
      "Solde trésorerie 425 M FCFA (+35 M sur le mois) grâce à un bon recouvrement des situations N°4 et N°5 du chantier MINTP. Lignes de crédit utilisées à 27 % seulement de la capacité disponible (300 M).",
    receivablesAnalysis:
      "Encours clients 980 M FCFA. DSO 72 jours, légère détérioration vs décembre (68 j) à cause du retard de paiement DUE-Yaoundé III. Créances échues 145 M dont 28 M classées douteuses (Commune Yaoundé I contentieux Pont Mfoundi).",
    payablesAnalysis:
      "Encours fournisseurs 540 M FCFA. DPO 45 jours, stable. Dettes échues 18 M (Ferraillage Plus, à régler après médiation en cours).",
    fiscalAnalysis:
      "TVA solde à payer 72,85 M FCFA (déclaration mensuelle déposée le 15/02). IS provisionné 46,5 M conformément aux acomptes prévisionnels. Cotisations CNPS et IRPP à jour. 2 échéances fiscales dans les 30 prochains jours (DSN + CFP).",
    financialRisks:
      "Risque principal : recouvrement créance Yaoundé III (45 M FCFA, > 90 j). Mise en demeure recommandée. Risque secondaire : exposition concentration client MINTP (45 % du CA).",
    financialDecisions:
      "Décaissement 80 M lignes de crédit pour préfinancer matériaux chantier Olembé. Provision IS T1 versée 12,5 M.",
    recommendations:
      "Demander au DG d'autoriser une mise en demeure Yaoundé III avant fin février. Examiner opportunité de diversification client (objectif < 35 % d'exposition à un seul donneur d'ordre).",
    nextMonthOutlook:
      "Février 2026 attendu en hausse modérée (+5 % vs janvier) grâce à la montée en cadence du chantier Bonabéri. Trésorerie devrait rester stable au-dessus de 400 M FCFA.",
  },

  {
    period: period(2026, 2),
    periodLabel: "Février 2026",
    status: "SUBMITTED",
    submittedDaysAgo: 4,

    revenueMonthXAF: 1_315_000_000n,
    revenueYtdXAF: 2_555_000_000n,
    revenueBudgetMonthXAF: 1_280_000_000n,
    expensesMonthXAF: 1_158_000_000n,
    grossMarginXAF: 250_000_000n,
    grossMarginPercent: 19.0,
    netMarginXAF: 157_000_000n,
    netMarginPercent: 11.9,
    ebitdaXAF: 210_400_000n,
    ebitdaPercent: 16.0,

    cashBalanceXAF: 410_000_000n,
    cashVariationXAF: -15_000_000n,
    creditLinesUsedXAF: 120_000_000n,
    creditLinesAvailableXAF: 180_000_000n,
    capacityAutofinancingXAF: 165_000_000n,

    accountsReceivableXAF: 1_080_000_000n,
    overdueReceivablesXAF: 195_000_000n,
    doubtfulReceivablesXAF: 32_000_000n,
    dso: 78,

    accountsPayableXAF: 595_000_000n,
    overduePayablesXAF: 22_000_000n,
    dpo: 47,

    workingCapitalNeedXAF: 485_000_000n,
    financialDebtLtXAF: 315_000_000n,
    financialDebtStXAF: 120_000_000n,
    gearingPercent: 46.0,
    capexMonthXAF: 78_000_000n,

    payrollMassMonthXAF: 148_500_000n,
    payrollHeadcount: 492,
    payrollVsRevenuePercent: 11.3,

    vatCollectedXAF: 249_850_000n,
    vatDeductibleXAF: 173_700_000n,
    vatDueXAF: 76_150_000n,
    corporateTaxProvisionXAF: 12_500_000n,
    socialChargesUpToDate: true,
    fiscalDeadlinesNext30d: 3,

    executiveSummary:
      "Février 2026 confirme la dynamique positive avec un CA produit de 1,315 Md FCFA (+2,7 % vs budget, +6 % vs janvier). Toutefois, la trésorerie se contracte de 15 M FCFA en raison du décaissement CAPEX (78 M, achat d'engin) et de la dégradation du DSO à 78 jours. Vigilance recommandée sur le recouvrement Yaoundé III qui n'a pas avancé.",
    performanceAnalysis:
      "CA produit 1,315 Md FCFA, en hausse de 6 % vs janvier. Marge brute légèrement érodée à 19 % (vs 20 % en janvier) à cause de la hausse du coût ciment (+8 %). EBITDA stable à 16 %.",
    cashFlowAnalysis:
      "Trésorerie 410 M FCFA, en baisse de 15 M. Décaissement CAPEX de 78 M (achat pelle Komatsu pour Olembé) compensé partiellement par la CAF de 165 M. Tirage supplémentaire 40 M sur lignes de crédit.",
    receivablesAnalysis:
      "ATTENTION : DSO en dégradation (72 j → 78 j). Encours clients 1,08 Md FCFA (+10 %). Créances échues 195 M, dont la créance Yaoundé III n'a pas avancé malgré 2 relances. Création de provision pour 4 M supplémentaires.",
    payablesAnalysis:
      "Encours fournisseurs 595 M (+10 %). DPO 47 j, conforme à la politique. Dettes échues 22 M, négociation en cours avec Ferraillage Plus pour étalement.",
    fiscalAnalysis:
      "TVA due 76,15 M FCFA. Cotisations sociales à jour. 3 échéances ≤ 30 j : déclaration mensuelle TVA, DSN, CFP T1.",
    financialRisks:
      "RISQUE ÉLEVÉ : créance Yaoundé III (45 M FCFA, > 120 j sans paiement) — escalade contentieux probable. Risque modéré : tension trésorerie si le CAPEX prévu mars (45 M) se confirme sans accélération recouvrement.",
    financialDecisions:
      "Décaissement 40 M lignes de crédit. Acquisition pelle Komatsu PC200 (78 M). Provision créance douteuse Yaoundé III portée de 28 M à 32 M.",
    recommendations:
      "Demander DG d'autoriser l'engagement d'un cabinet de recouvrement (Cabinet ATANGANA, fee 15 %) sur le dossier Yaoundé III si pas de paiement avant le 15 mars. Reporter le CAPEX matériel logistique de 25 M prévu en mars d'un trimestre.",
    nextMonthOutlook:
      "Mars 2026 attendu stable. Encaissement attendu 220 M sur situation N°6 MINTP. Trésorerie cible 420 M en fin mars.",
  },

  {
    period: period(2026, 3),
    periodLabel: "Mars 2026",
    status: "DRAFT",

    revenueMonthXAF: 1_290_000_000n,
    revenueYtdXAF: 3_845_000_000n,
    revenueBudgetMonthXAF: 1_300_000_000n,
    expensesMonthXAF: 1_140_000_000n,
    grossMarginXAF: 245_000_000n,
    grossMarginPercent: 19.0,
    netMarginXAF: 150_000_000n,
    netMarginPercent: 11.6,
    ebitdaXAF: 200_000_000n,
    ebitdaPercent: 15.5,

    cashBalanceXAF: 0n,
    cashVariationXAF: 0n,
    creditLinesUsedXAF: 0n,
    creditLinesAvailableXAF: 0n,
    capacityAutofinancingXAF: 0n,

    accountsReceivableXAF: 0n,
    overdueReceivablesXAF: 0n,
    doubtfulReceivablesXAF: 0n,
    dso: 0,
    accountsPayableXAF: 0n,
    overduePayablesXAF: 0n,
    dpo: 0,
    workingCapitalNeedXAF: 0n,
    financialDebtLtXAF: 0n,
    financialDebtStXAF: 0n,
    gearingPercent: 0,
    capexMonthXAF: 0n,
    payrollMassMonthXAF: 0n,
    payrollHeadcount: 0,
    payrollVsRevenuePercent: 0,
    vatCollectedXAF: 0n,
    vatDeductibleXAF: 0n,
    vatDueXAF: 0n,
    corporateTaxProvisionXAF: 0n,
    socialChargesUpToDate: true,
    fiscalDeadlinesNext30d: 0,

    executiveSummary:
      "[Brouillon en cours] CA mars en ligne avec budget. Trésorerie à confirmer après réception encaissement MINTP attendu le 28/03.",
    performanceAnalysis: null,
    cashFlowAnalysis: null,
    receivablesAnalysis: null,
    payablesAnalysis: null,
    fiscalAnalysis: null,
    financialRisks: null,
    financialDecisions: null,
    recommendations: null,
    nextMonthOutlook: null,
  },
];

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable");

  const daf = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "DAF", email: "marie@batimcam.cm" },
  });
  if (!daf) throw new Error("DAF marie@batimcam.cm introuvable");

  const dg = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "DG", email: "albert@batimcam.cm" },
  });
  if (!dg) throw new Error("DG albert@batimcam.cm introuvable");

  for (const r of REPORTS) {
    const exists = await prisma.dafMonthlyFinancialReport.findFirst({
      where: { tenantId: tenant.id, authorId: daf.id, period: r.period },
    });
    if (exists) {
      console.log(`  • ${r.periodLabel} : déjà existant, skip`);
      continue;
    }

    const { submittedDaysAgo, validatedDaysAgo, ...fields } = r;
    const submittedAt = submittedDaysAgo
      ? new Date(Date.now() - submittedDaysAgo * 86_400_000)
      : null;
    const validatedAt = validatedDaysAgo
      ? new Date(Date.now() - validatedDaysAgo * 86_400_000)
      : null;

    await prisma.dafMonthlyFinancialReport.create({
      data: {
        ...fields,
        tenantId: tenant.id,
        authorId: daf.id,
        submittedAt,
        validatedAt,
        validatedById: r.status === "VALIDATED" ? dg.id : null,
      },
    });
    console.log(`  ✓ ${r.periodLabel} (${r.status})`);
  }

  console.log("Seed DAF monthly reports terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
