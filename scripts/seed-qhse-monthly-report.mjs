import "./_guard-prod.js";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  // QHSE = TECH_DIRECTOR
  const author = await p.user.findFirst({
    where: { role: "TECH_DIRECTOR" },
    include: { tenant: { select: { slug: true } } },
  });
  if (!author) throw new Error("Aucun TECH_DIRECTOR trouvé");

  await p.qhseMonthlyReport.deleteMany({ where: { authorId: author.id } });

  const report = await p.qhseMonthlyReport.create({
    data: {
      tenantId: author.tenantId,
      authorId: author.id,
      period: new Date("2026-04-01T00:00:00Z"),
      periodLabel: "Avril 2026",
      status: "SUBMITTED",
      submittedAt: new Date("2026-05-06T11:00:00Z"),

      // Sinistralité — 487 personnes * ~180 h = 87 660 h
      totalHoursWorked: 87_660n,
      totalIncidents: 3,
      lostTimeIncidents: 2, // dont 2 avec arrêt
      noLostTimeIncidents: 1,
      daysLost: 8, // 3 + 5
      tf1: 22.8, // (2 * 1M) / 87660 = 22.81
      tg: 0.09, // (8 * 1000) / 87660 = 0.091
      daysWithoutAccident: 12,

      cutsCount: 1,
      fallsCount: 1,
      electricalCount: 0,
      chemicalCount: 0,
      vehiclesCount: 0,
      otherCount: 1,

      internalAudits: 8,
      externalAudits: 1,
      inspectionsCount: 22,
      observationsCount: 47,

      ncOpened: 11,
      ncClosed: 7,
      ncCritical: 2,
      ncOverdue: 4,

      safetyTrainings: 6,
      trainingHours: 48.0,
      personsTrained: 92,

      epiDistributed: 215,
      epiCheckCompliance: 87.5,

      executiveSummary:
        "Avril 2026 : 3 incidents déclarés (2 avec arrêt) sur 87 660 heures travaillées. TF1 à 22,8 — au-dessus du seuil branche BTP camerounaise (15,0) — vigilance accrue. " +
        "12 jours sans accident à fin avril. 8 audits internes + 1 audit externe ISO 45001 (résultat partiel : 90 % conformité). " +
        "Plan de rattrapage NC en cours : 4 NC en retard de traitement, dont 2 critiques.",
      incidentsAnalysis:
        "Incident 1 (17/04, CHT-2026-007) : coupure main droite ouvrier maçon — outil ferraillage défectueux — arrêt 3 jours.\n" +
        "  → Cause : EPI gants anti-coupure non portés. Sanction disciplinaire avertissement + rappel obligation EPI.\n" +
        "Incident 2 (23/04, CHT-2025-018) : chute de plain-pied — sol glissant non balisé — arrêt 5 jours.\n" +
        "  → Cause : absence balisage zone humide. Action corrective : nouvelle procédure balisage permanent.\n" +
        "Incident 3 (28/04, CHT-2026-031) : projection œil lors disquage — sans arrêt — soigné infirmerie.\n" +
        "  → Cause : lunettes protection mal ajustées. Rappel formation EPI.",
      auditFindings:
        "Audit ISO 45001 du 15/04 (cabinet externe TÜV Rheinland) :\n" +
        "  - 90 % de conformité (vs 85 % en mars)\n" +
        "  - 3 NC mineures relevées (procédures de stockage produits chimiques, plan d'évacuation chantier 18, traçabilité formations)\n" +
        "  - 0 NC majeure → certification maintenue\n" +
        "Audits internes (8) : couverture 95 % des chantiers actifs. 22 inspections terrain + 47 observations remontées.",
      ncAnalysis:
        "11 NC ouvertes sur le mois (vs 9 en mars).\n" +
        "  - 2 NC critiques : stockage hydrocarbures CHT-2026-007 (non conforme aux normes incendie) + absence DLR sur lot CFO CHT-2025-024.\n" +
        "  - 4 NC en retard de traitement (> 30 jours) : plan de rattrapage S+2 engagé avec les CC concernés.\n" +
        "7 NC clôturées sur le mois (taux de clôture : 63 %).",
      trainingsAnalysis:
        "6 sessions sécurité organisées en avril :\n" +
        "  - Habilitation électrique B1V : 12 personnes\n" +
        "  - Travail en hauteur (utilisation harnais) : 25 personnes\n" +
        "  - Premiers secours SST : 18 personnes\n" +
        "  - Conduite engins de chantier CACES R372 : 15 personnes\n" +
        "  - Sensibilisation amiante : 14 personnes\n" +
        "  - Quart d'heure sécurité (hebdo) : 8 par chantier — 92 personnes touchées sur le mois.\n" +
        "48 heures de formation cumulées — objectif mensuel 40 h ✓",
      epiAnalysis:
        "215 EPI distribués en avril (gants anti-coupure, chaussures S3, casques, lunettes, masques FFP2).\n" +
        "Conformité contrôles : 87,5 % (cible 95 %) — point de vigilance sur les CC qui n'ont pas finalisé les inspections hebdomadaires de l'état des EPI.\n" +
        "Renforcement contrôles aléatoires lancé fin avril.",
      actionPlans:
        "PA-2026-04-001 : remise en conformité stockage hydrocarbures CHT-2026-007 — Responsable : CC Jean KAMGA — Échéance 15/05.\n" +
        "PA-2026-04-002 : DLR lot CFO CHT-2025-024 — Responsable : sous-traitant ELEC-SOLUTIONS — Échéance 10/05.\n" +
        "PA-2026-04-003 : déploiement procédure balisage permanent zones humides — tous chantiers — Échéance 20/05.\n" +
        "PA-2026-04-004 : rattrapage 4 NC en retard — coaching CC concernés — Échéance 31/05.\n" +
        "PA-2026-04-005 : renforcement contrôles EPI hebdomadaires — CC tous chantiers — Échéance permanente.",
      trendsAnalysis:
        "Tendances 12 derniers mois :\n" +
        "  - TF1 moyen glissant : 18,5 (en baisse vs Q1 2026 à 21,2)\n" +
        "  - Incidents par typologie : coupures (43 %), chutes (28 %), véhicules (12 %), autres (17 %)\n" +
        "  - Saisonnalité : pic incidents en saison des pluies (juin-septembre) — préparation campagne sensibilisation\n" +
        "  - Effet positif des formations harnais : 0 chute de hauteur en 8 mois\n" +
        "Conclusion : amélioration globale mais TF1 reste au-dessus du seuil — focus à maintenir.",
      chsctRecommendations:
        "RECOMMANDATION 1 : renforcer les formations EPI (gants anti-coupure obligatoires sur tous les postes ferraillage) — programme déployé S+2.\n" +
        "RECOMMANDATION 2 : audit complémentaire stockage produits chimiques sur les 3 plus gros chantiers — S+3.\n" +
        "RECOMMANDATION 3 : campagne de sensibilisation \"Saison des pluies\" en mai-juin (balisage, EPI antidérapants, procédures spécifiques).\n" +
        "RECOMMANDATION 4 : revue des indicateurs HSE en CHSCT le 15/05 — proposition d'objectif TF1 ≤ 12 pour fin 2026.\n" +
        "RECOMMANDATION 5 : engagement budgétaire EPI haut de gamme pour 2026-S2 — étude coûts en cours (estimation +18 M FCFA).",
    },
  });

  console.log(`✓ Rapport mensuel QHSE créé — id=${report.id}`);
  console.log(`  Auteur : ${author.firstName} ${author.lastName} (${author.tenant.slug})`);
  console.log(`  Période : Avril 2026`);
  console.log(`  Statut : SUBMITTED (visible côté DG)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
