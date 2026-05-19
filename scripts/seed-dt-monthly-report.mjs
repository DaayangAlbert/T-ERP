import "./_guard-prod.js";
// Seed 1 rapport mensuel technique DT (SUBMITTED) sur Avril 2026
// avec 4 chantiers représentatifs du portefeuille batimcam.

import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const dt = await p.user.findFirst({
    where: { role: "TECH_DIRECTOR" },
    include: { tenant: { select: { id: true, slug: true } } },
  });
  if (!dt) throw new Error("Aucun TECH_DIRECTOR trouvé");

  const tenant = await p.tenant.findUnique({
    where: { id: dt.tenantId },
    select: { id: true, isGroup: true, children: { select: { id: true } } },
  });
  const tenantIds = tenant && tenant.isGroup && tenant.children.length > 0
    ? [tenant.id, ...tenant.children.map((c) => c.id)]
    : [dt.tenantId];

  const sites = await p.site.findMany({
    where: { tenantId: { in: tenantIds } },
    take: 5,
    orderBy: { code: "asc" },
  });
  if (sites.length === 0) throw new Error("Aucun chantier dans le portefeuille");

  await p.dtMonthlyTechReport.deleteMany({ where: { authorId: dt.id } });

  const period = new Date("2026-04-01T00:00:00Z");

  const report = await p.dtMonthlyTechReport.create({
    data: {
      tenantId: dt.tenantId,
      authorId: dt.id,
      period,
      periodLabel: "Avril 2026",
      status: "SUBMITTED",
      submittedAt: new Date("2026-05-05T15:00:00Z"),

      sitesActiveCount: sites.length,
      sitesCompletedCount: 1,
      sitesAtRiskCount: 2,
      avgPhysicalProgress: 47.5,
      avgFinancialProgress: 42.1,
      totalRevenueXAF: 1_580_000_000n,
      totalSpentXAF: 1_240_000_000n,
      portfolioMarginPercent: 21.5,

      hseTotalIncidents: 3,
      hseTf1: 6.2,
      hseAuditsConducted: 8,
      hseNcOpen: 11,

      subcontractorsActive: 14,
      subcontractorsAtRisk: 2,

      executiveSummary:
        "Avril 2026 marque une accélération significative sur le portefeuille avec un avancement physique moyen de 47,5 % (vs 41,2 % en mars). " +
        "La marge se maintient à 21,5 % (cible groupe : 20 %) malgré la pression sur les granulats. " +
        "Deux chantiers passent en alerte rouge (CHT-2026-007 sous-effectif chronique, CHT-2025-018 dépassement budgétaire 12 %). " +
        "TF1 portefeuille à 6,2 — sous le seuil branche BTP (8,0) mais en progression vs mars (5,1).",
      financialAnalysis:
        "CA produit cumulé : 1,58 Mds FCFA. Dépenses : 1,24 Mds FCFA. Marge brute portefeuille : 21,5 % (objectif 20 %).\n" +
        "Décompte CHT-2026-031 réglé intégralement par la commune Yaoundé I.\n" +
        "Retard de paiement CHT-2025-024 (45 jours sur décompte n°7) — relance DAF engagée.\n" +
        "Effort capex : acquisition d'une grue à tour 25 m (Potain MR 159) pour CHT-2026-040 (livraison prévue S22).",
      qhseAnalysis:
        "3 incidents niveau 1 sur le mois (1 coupure main, 1 chute de plain-pied, 1 projection œil sans gravité).\n" +
        "Aucun arrêt chantier consécutif. 8 audits sécurité internes réalisés (objectif mensuel : 6).\n" +
        "11 NC en cours dont 4 en retard de traitement (>30 jours) — plan de rattrapage en cours.\n" +
        "Préparation audit ISO 45001 du 15/05 — 90 % des actions correctives traitées.",
      subcontractingAnalysis:
        "14 sous-traitants actifs sur les 23 chantiers. 2 en alerte :\n" +
        "  - ÉTANCHEO SARL : retard livraison membrane EPDM sur CHT-2025-024, pénalités appliquées\n" +
        "  - BÂTI-PRO : qualité ferraillage non conforme sur CHT-2026-007, mise en demeure envoyée\n" +
        "Évaluations Q1 2026 finalisées : 11/14 noté A ou B, 2 noté C (plan de progrès), 1 noté D (sortie envisagée).",
      majorRisks:
        "CHT-2026-007 : sous-effectif maçons persistant — risque glissement planning de 3 semaines si non résolu en mai.\n" +
        "CHT-2025-018 : dépassement budgétaire 12 % constaté sur lot CVC — révision marché en cours avec MOA.\n" +
        "Tension d'approvisionnement granulats 5/15 sur le bassin Yaoundé — risque sur 3 chantiers simultanés en juin.\n" +
        "Climat social tendu sur CHT-2026-031 suite refus prime exceptionnelle — médiation RH en cours.",
      technicalDecisions:
        "Validation d'une méthode coffrage banche grimpante sur CHT-2026-040 (gain 18 jours planning).\n" +
        "Standardisation des armatures HA12 et HA14 sur tous les chantiers — économie d'échelle estimée 28 M FCFA/an.\n" +
        "Lancement étude alternative ciment CPJ 32.5 pour les ouvrages non structuraux (gain coût 8 %).",
      recommendations:
        "ARBITRAGE COMEX URGENT : autorisation embauche 2 chefs d'équipe maçons (CDI) pour CHT-2026-007 — budget 14 M FCFA/an chargé.\n" +
        "Demande validation enveloppe avenant 85 M FCFA sur marché CHT-2025-018 (lot CVC).\n" +
        "Recommandation stratégique : créer une cellule appro centralisée groupe pour mutualiser les commandes granulats/ciment (économie 4-6 % estimée).\n" +
        "Provision budgétaire intempéries S+2 (saison des pluies juin-octobre) à constituer dès mai : 65 M FCFA proposés.",
      nextMonthOutlook:
        "Mai 2026 — objectifs portefeuille :\n" +
        "  - Avct physique moyen visé : 53 % (+5,5 points)\n" +
        "  - Maintien marge ≥ 21 %\n" +
        "  - Audit ISO 45001 réussi (résultat fin mai)\n" +
        "  - Mise en service grue MR 159 sur CHT-2026-040\n" +
        "  - Résolution sous-effectif CHT-2026-007 (cible : 30/05)\n" +
        "  - Lancement appel d'offres lot finition CHT-2025-024",
    },
  });

  const snapshots = sites.slice(0, 4).map((s, idx) => {
    const physData = [62.5, 38.2, 47.8, 51.0];
    const finData = [58.0, 32.5, 44.0, 48.5];
    const marginData = [22.5, 8.5, 28.0, 19.0];
    const revData = [620_000_000n, 280_000_000n, 410_000_000n, 270_000_000n];
    const hseData = [0, 2, 1, 0];
    const ncData = [1, 4, 3, 2];
    const riskData = ["LOW", "HIGH", "MEDIUM", "LOW"];
    return {
      reportId: report.id,
      siteId: s.id,
      physicalProgressPercent: physData[idx],
      financialProgressPercent: finData[idx],
      marginPercent: marginData[idx],
      revenueMonthXAF: revData[idx],
      hseIncidentsCount: hseData[idx],
      ncOpenCount: ncData[idx],
      riskLevel: riskData[idx],
      notes: idx === 1 ? "Sous-effectif chronique, dépassement budgétaire CVC, médiation RH en cours" : null,
    };
  });

  await p.dtMonthlyTechReportSite.createMany({ data: snapshots });

  console.log(`✓ Rapport mensuel DT créé — id=${report.id}`);
  console.log(`  Auteur : ${dt.firstName} ${dt.lastName} (${dt.tenant.slug})`);
  console.log(`  Période : Avril 2026`);
  console.log(`  ${snapshots.length} chantiers du portefeuille`);
  console.log(`  Statut : SUBMITTED (visible côté DG pour validation)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
