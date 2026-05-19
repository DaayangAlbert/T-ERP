import "./_guard-prod.js";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const dtrav = await p.user.findFirst({
    where: { role: "WORKS_DIRECTOR" },
    include: { tenant: { select: { slug: true } } },
  });
  if (!dtrav) throw new Error("Aucun WORKS_DIRECTOR trouvé");

  await p.dtravMonthlyReport.deleteMany({ where: { authorId: dtrav.id } });

  const report = await p.dtravMonthlyReport.create({
    data: {
      tenantId: dtrav.tenantId,
      authorId: dtrav.id,
      period: new Date("2026-04-01T00:00:00Z"),
      periodLabel: "Avril 2026",
      status: "SUBMITTED",
      submittedAt: new Date("2026-05-04T10:00:00Z"),

      revenueProducedXAF: 1_580_000_000n,
      revenueDeliveredXAF: 1_420_000_000n,
      marginPercent: 21.5,
      sitesDelivered: 1,

      receivablesXAF: 850_000_000n,
      overdueReceivablesXAF: 220_000_000n,
      dso: 72,
      decompteIssuedCount: 8,
      decompteIssuedXAF: 920_000_000n,

      amendmentsCount: 3,
      penaltiesAppliedXAF: 18_500_000n,
      litigationsOpen: 1,

      cdtCount: 4,
      cdtReportsValidated: 14,
      cdtUnderperforming: 1,

      workforceTotal: 487,
      workforceOvertimeHours: 1_240.5,
      workforceCostXAF: 285_000_000n,

      executiveSummary:
        "Avril 2026 : mois solide sur le plan production avec un CA produit de 1,58 Mds FCFA (+8 % vs mars) et une marge maintenue à 21,5 %. " +
        "Point de vigilance majeur : encours client à 850 M FCFA dont 220 M en retard (DSO à 72 jours, au-dessus du seuil cible 60 j). " +
        "Performance CDT globalement bonne (14 rapports hebdo validés / 16 attendus). Florence ATEBA en retard de qualité éditoriale — coaching engagé.",
      productionAnalysis:
        "CA produit 1,58 Mds FCFA réparti sur 22 chantiers actifs.\n" +
        "Livraison du chantier CHT-2025-014 (École primaire Bastos) — réception provisoire signée le 18/04.\n" +
        "Marge brute portefeuille : 21,5 % (cible groupe 20 %). Bonne performance sur les chantiers > 500 M FCFA.\n" +
        "Productivité moyenne : 3,2 M FCFA / personne / mois.",
      collectionsAnalysis:
        "Encours total : 850 M FCFA. Retards > 30 jours : 220 M FCFA (26 % de l'encours).\n" +
        "Principaux clients en retard :\n" +
        "  - Commune Yaoundé III : 85 M FCFA (décompte n°5 CHT-2025-024, 45 jours)\n" +
        "  - MINHDU : 95 M FCFA (décompte n°3 CHT-2026-007, 38 jours)\n" +
        "  - FEICOM : 40 M FCFA (décompte n°2 CHT-2026-031, 32 jours)\n" +
        "Actions engagées : 3 relances DAF, 1 mise en demeure prochaine sur la Commune Yaoundé III.",
      contractualSituation:
        "3 avenants signés sur le mois :\n" +
        "  - CHT-2025-018 : +85 M FCFA lot CVC\n" +
        "  - CHT-2026-007 : +12 M FCFA réfection terrassement\n" +
        "  - CHT-2025-024 : +6 M FCFA travaux supplémentaires VRD\n" +
        "Pénalités appliquées : 18,5 M FCFA sur 2 sous-traitants (ÉTANCHEO, BÂTI-PRO).\n" +
        "1 litige en cours : ELEC-SOLUTIONS (sous-traitant lot CFO) — réclamation 35 M FCFA.",
      cdtPerformance:
        "4 CDT supervisés : Samuel MBARGA, Paul KAMGA, Roger MEKA, Florence ATEBA.\n" +
        "14 rapports hebdomadaires validés sur 16 attendus (taux 87,5 %).\n" +
        "  - Samuel MBARGA : 4/4 ✓ (excellent reporting)\n" +
        "  - Paul KAMGA : 4/4 ✓\n" +
        "  - Roger MEKA : 3/4 (1 rapport tardif)\n" +
        "  - Florence ATEBA : 3/4 — qualité éditoriale insuffisante, coaching engagé\n" +
        "Évaluation Q2 : 3 CDT noté A, 1 CDT noté B (plan de progrès).",
      workforceAnalysis:
        "Effectif total chantiers : 487 personnes (vs 472 en mars, +3 %).\n" +
        "Heures supplémentaires : 1 240,5 h cumulées (cible mensuelle 1 100 h). Pic sur CHT-2026-031 (coulage R+1).\n" +
        "Coût main d'œuvre total : 285 M FCFA (18 % du CA produit, cible 20 %).\n" +
        "2 démissions sur le mois (1 chef d'équipe, 1 ouvrier qualifié) — remplacements en cours.",
      majorIssues:
        "Tension de trésorerie ponctuelle mi-avril liée aux retards de paiement client.\n" +
        "Sous-effectif maçons CHT-2026-007 — situation tendue, plan d'action engagé.\n" +
        "Climat social CHT-2026-031 suite refus de prime exceptionnelle — médiation RH en cours.",
      arbitragesRequested:
        "ARBITRAGE 1 : autorisation embauche 2 chefs d'équipe maçons (CDI) pour CHT-2026-007 — budget 14 M FCFA/an chargé.\n" +
        "ARBITRAGE 2 : déclenchement mise en demeure Commune Yaoundé III (créance 85 M FCFA, 45 jours retard).\n" +
        "ARBITRAGE 3 : validation budget renforcement gardiennage (4 chantiers à risque) — 18 M FCFA pour 6 mois.\n" +
        "ARBITRAGE 4 : prime exceptionnelle CHT-2026-031 pour désamorcer climat social — 8 M FCFA proposés.",
      nextMonthStrategy:
        "Mai 2026 — Objectifs :\n" +
        "  - Maintenir CA produit ≥ 1,55 Mds FCFA\n" +
        "  - Ramener DSO ≤ 65 jours (recouvrement 120 M FCFA)\n" +
        "  - Marge ≥ 21 %\n" +
        "  - Lancement appel d'offres lot finition CHT-2025-024\n" +
        "  - Résolution sous-effectif CHT-2026-007 (cible 30/05)\n" +
        "  - Validation audit ISO 45001",
    },
  });

  console.log(`✓ Rapport mensuel DTrav créé — id=${report.id}`);
  console.log(`  Auteur : ${dtrav.firstName} ${dtrav.lastName} (${dtrav.tenant.slug})`);
  console.log(`  Période : Avril 2026`);
  console.log(`  Statut : SUBMITTED (visible côté DG)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
