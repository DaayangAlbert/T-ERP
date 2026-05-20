/**
 * Crée un scénario de test pour le workflow signature : un rapport mensuel
 * technique (DT) en statut SOUMIS sur BatimCAM, prêt à être validé+signé
 * par le DG.
 *
 * Usage : node scripts/seed-test-dt-report.js
 *
 * - Trouve le tenant batimcam, le DG (Albert), un Directeur Technique (auteur).
 * - Donne au DG une signature de test (/seed/signature-drh.svg) s'il n'en a pas.
 * - Donne au tenant un cachet (/seed/stamp-batimcam.svg) s'il n'en a pas.
 * - Crée (ou réutilise) un rapport DT SOUMIS avec des données réalistes.
 *
 * Idempotent : relançable sans créer de doublons.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable — lance `pnpm db:seed` d'abord.");

  const dg = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "DG" },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!dg) throw new Error("Aucun DG sur batimcam.");

  // Auteur du rapport : un Directeur Technique, sinon n'importe quel cadre non-DG.
  let author = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "TECH_DIRECTOR" },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  if (!author) {
    author = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: { notIn: ["DG", "WORKER", "CANDIDATE"] } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
  }
  if (!author) throw new Error("Aucun auteur possible (TECH_DIRECTOR ou cadre).");

  // 1) Signature de test pour le DG (réutilise l'asset seed)
  await prisma.userSignature.upsert({
    where: { userId: dg.id },
    update: {},
    create: { userId: dg.id, signatureUrl: "/seed/signature-drh.svg", uploadedAt: new Date() },
  });
  // Si elle existe mais sans signatureUrl, on la set
  await prisma.userSignature.updateMany({
    where: { userId: dg.id, signatureUrl: null },
    data: { signatureUrl: "/seed/signature-drh.svg", uploadedAt: new Date() },
  });

  // 2) Cachet entreprise sur le tenant (si absent)
  if (!tenant.stampImageUrl) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { stampImageUrl: "/seed/stamp-batimcam.svg" },
    });
  }

  // 3) Rapport DT SOUMIS — période = mois courant
  const now = new Date();
  const period = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodLabel = period.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const existing = await prisma.dtMonthlyTechReport.findFirst({
    where: { tenantId: tenant.id, period, authorId: author.id },
  });

  const data = {
    tenantId: tenant.id,
    authorId: author.id,
    period,
    periodLabel: periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1),
    status: "SUBMITTED",
    submittedAt: new Date(),
    validatedById: null,
    validatedAt: null,
    rejectionReason: null,
    sitesActiveCount: 8,
    sitesCompletedCount: 2,
    sitesAtRiskCount: 1,
    avgPhysicalProgress: 64.5,
    avgFinancialProgress: 58.2,
    totalRevenueXAF: 425_000_000n,
    totalSpentXAF: 312_000_000n,
    portfolioMarginPercent: 22.4,
    hseTotalIncidents: 3,
    hseTf1: 4.2,
    hseAuditsConducted: 5,
    hseNcOpen: 7,
    subcontractorsActive: 12,
    subcontractorsAtRisk: 2,
    executiveSummary:
      "Portefeuille globalement sain ce mois. Avancement physique moyen 64,5 % vs 58,2 % financier — léger décalage favorable. Marge portefeuille à 22,4 %, au-dessus de la cible. Un chantier en vigilance (Pont Mfoundi) nécessite un arbitrage sur les délais.",
    financialAnalysis:
      "CA produit 425 MFCFA, dépenses 312 MFCFA. La trésorerie chantier reste tendue sur 2 marchés publics en attente de décompte. Recommandation : relancer la MOA sur les décomptes en souffrance.",
    qhseAnalysis:
      "3 incidents mineurs, TF1 à 4,2 (en baisse). 5 audits réalisés, 7 NC ouvertes dont 2 critiques à traiter sous 15 jours.",
    subcontractingAnalysis:
      "12 sous-traitants actifs, 2 en sous-performance (retards livraison ferraillage). Évaluation trimestrielle à programmer.",
    majorRisks:
      "Risque délai sur Pont Mfoundi (intempéries). Risque trésorerie sur marchés publics (décomptes). Risque qualité sur 2 NC critiques.",
    technicalDecisions:
      "Renfort équipe topographie sur 2 chantiers. Changement de fournisseur béton sur la zone Est.",
    recommendations:
      "Arbitrage COMEX demandé sur l'extension de délai Pont Mfoundi (+3 semaines) et la mobilisation d'une avance de trésorerie de 50 MFCFA.",
    nextMonthOutlook:
      "Livraison prévue de 2 chantiers. Démarrage d'un nouveau marché à Bafoussam. Objectif : ramener les NC critiques à zéro.",
  };

  let reportId;
  if (existing) {
    await prisma.dtMonthlyTechReport.update({ where: { id: existing.id }, data });
    reportId = existing.id;
    console.log("✓ Rapport DT existant remis en statut SOUMIS");
  } else {
    const created = await prisma.dtMonthlyTechReport.create({ data });
    reportId = created.id;
    console.log("✓ Rapport DT SOUMIS créé");
  }

  console.log(`\nScénario de test prêt sur BatimCAM :`);
  console.log(`  Auteur (DT)  : ${author.firstName} ${author.lastName} (${author.role})`);
  console.log(`  Valideur (DG): ${dg.firstName} ${dg.lastName} — signature test posée`);
  console.log(`  Rapport      : ${data.periodLabel} (SUBMITTED), id ${reportId}`);
  console.log(`\nPour tester :`);
  console.log(`  1. Connecte-toi en DG (albert@batimcam.cm)`);
  console.log(`  2. Va sur /batimcam/direction-generale/rapports-dt`);
  console.log(`  3. Ouvre le rapport SOUMIS → "Valider et signer"`);
  console.log(`  4. La modale montre la signature du DG → Confirmer`);
  console.log(`  5. Télécharge le PDF → signature + cachet + nom dans le cadre DG`);

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
