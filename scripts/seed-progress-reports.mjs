import "./_guard-prod.js";
// Seed 3 rapports d'avancement de démo (DRAFT, SUBMITTED, VALIDATED)
// pour Jean-Marie BIWOLE sur CHT-2026-031. Lie aussi le CC au chantier
// via assignedSiteIds si pas déjà fait.

import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const cc = await p.user.findFirst({
    where: { role: "SITE_MANAGER", firstName: { contains: "Jean-Marie", mode: "insensitive" }, lastName: { contains: "BIWOLE", mode: "insensitive" } },
  });
  if (!cc) throw new Error("Jean-Marie BIWOLE introuvable");

  const site = await p.site.findFirst({
    where: { code: "CHT-2026-031" },
    include: { contract: true },
  });
  if (!site) throw new Error("CHT-2026-031 introuvable");

  const dtrav = await p.user.findFirst({
    where: { tenantId: site.tenantId, role: { in: ["WORKS_DIRECTOR", "WORKS_MANAGER", "TECH_DIRECTOR"] } },
  });

  // 1) Lier le CC à son chantier
  if (!cc.assignedSiteIds.includes(site.id)) {
    await p.user.update({
      where: { id: cc.id },
      data: { assignedSiteIds: { set: [...cc.assignedSiteIds, site.id] } },
    });
    console.log(`✓ Jean-Marie BIWOLE lié à ${site.code}`);
  }

  // 2) Supprimer les anciens rapports de démo
  await p.siteProgressReport.deleteMany({ where: { siteId: site.id } });

  // 3) Créer 3 rapports : Janvier (validé), Février (soumis), Mars (brouillon)
  const reports = [
    {
      period: new Date("2026-01-15T00:00:00Z"),
      periodLabel: "Janvier 2026",
      status: "VALIDATED",
      physicalProgressPercent: 32.5,
      previousProgressPercent: 22.8,
      mainAchievements:
        "Coulage des fondations bloc B (semelles + longrines) terminé à 100 %\n" +
        "Démarrage de l'élévation des murs RDC bloc A — 12 m linéaires posés\n" +
        "Réception des armatures HA12/HA16 (lot 3) — 8,2 tonnes\n" +
        "Mise en place du circuit d'évacuation provisoire eaux de chantier",
      delaysIdentified:
        "Retard de 4 jours sur la livraison du ciment CPA 42.5 (rupture chez le fournisseur principal)\n" +
        "Coupure électrique de 2 jours sur zone Mfoundi-Sud — impact sur bétonnière fixe",
      valueProducedXAF: 145_000_000n,
      valueProducedCumulXAF: 320_000_000n,
      avgWorkforce: 38,
      maxWorkforce: 52,
      overtimeHoursTotal: 86.5,
      billingStatus:
        "Décompte n°3 émis le 28/01/2026 — montant 145 000 000 FCFA. Visa MOE en cours. Décompte n°2 réglé.",
      hseIncidentsCount: 0,
      daysWithoutAccident: 87,
      issuesEncountered:
        "Difficultés d'approvisionnement local en granulats 5/15 — qualité hétérogène entre les livraisons",
      supportNeeded:
        "Demande d'arbitrage MOA sur dérogation poste de transformation provisoire (déclaration ENEO)",
      nextPeriodPriorities:
        "Finalisation élévation bloc A R+0\n" +
        "Démarrage maçonnerie bloc B\n" +
        "Réception et mise en stock des matériaux finition phase 1",
      submittedAt: new Date("2026-01-31T16:30:00Z"),
      validatedAt: new Date("2026-02-02T10:15:00Z"),
      validatedById: dtrav?.id ?? null,
    },
    {
      period: new Date("2026-02-15T00:00:00Z"),
      periodLabel: "Février 2026",
      status: "SUBMITTED",
      physicalProgressPercent: 45.2,
      previousProgressPercent: 32.5,
      mainAchievements:
        "Élévation bloc A R+0 finalisée — pose des linteaux et chaînages\n" +
        "Maçonnerie bloc B démarrée — 60 % du RDC monté\n" +
        "Coulage de la dalle R+1 bloc A planifié pour début mars\n" +
        "Visite MOE le 12/02 — observations mineures sur ferraillage poteau P7 levées",
      delaysIdentified:
        "Retard de 6 jours sur la phase étanchéité — lié à intempéries fortes pluies semaine 7",
      valueProducedXAF: 178_000_000n,
      valueProducedCumulXAF: 498_000_000n,
      avgWorkforce: 44,
      maxWorkforce: 61,
      overtimeHoursTotal: 124.0,
      billingStatus:
        "Décompte n°4 en préparation — montant prévisionnel 178 000 000 FCFA. Émission prévue 05/03/2026.",
      hseIncidentsCount: 1,
      daysWithoutAccident: 12,
      issuesEncountered:
        "Accident de niveau 1 le 17/02 — coupure main droite ouvrier maçon — soigné infirmerie chantier, arrêt 3 jours. Analyse de causes diligentée.\n" +
        "Vol d'outillage léger (perceuses, disqueuses) la nuit du 22/02 — renforcement gardiennage demandé.",
      supportNeeded:
        "Recours à appui logistique siège pour transport ciment depuis port Douala (camion supplémentaire 1 mois)\n" +
        "Validation budget renfort gardiennage : 2 agents supplémentaires + caméras périmétriques",
      nextPeriodPriorities:
        "Coulage dalle R+1 bloc A\n" +
        "Finalisation maçonnerie bloc B RDC\n" +
        "Démarrage études exécution lot CVC\n" +
        "Audit HSE de mi-chantier (S11)",
      submittedAt: new Date("2026-02-28T18:00:00Z"),
      validatedAt: null,
      validatedById: null,
    },
    {
      period: new Date("2026-03-15T00:00:00Z"),
      periodLabel: "Mars 2026",
      status: "DRAFT",
      physicalProgressPercent: 58.0,
      previousProgressPercent: 45.2,
      mainAchievements:
        "Coulage dalle R+1 bloc A — réalisé le 08/03\n" +
        "Maçonnerie bloc B RDC achevée\n" +
        "Démarrage études d'exécution lot CVC",
      delaysIdentified: "",
      valueProducedXAF: 162_000_000n,
      valueProducedCumulXAF: 660_000_000n,
      avgWorkforce: 47,
      maxWorkforce: 58,
      overtimeHoursTotal: 95.0,
      billingStatus: "Décompte n°5 à émettre fin mars.",
      hseIncidentsCount: 0,
      daysWithoutAccident: 28,
      issuesEncountered: "",
      supportNeeded: "",
      nextPeriodPriorities:
        "Élévation R+1 bloc A\n" +
        "Démarrage charpente bloc B\n" +
        "Lancement appel d'offres sous-traitance électricité",
      submittedAt: null,
      validatedAt: null,
      validatedById: null,
    },
  ];

  for (const r of reports) {
    const created = await p.siteProgressReport.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        authorId: cc.id,
        reportType: "MONTHLY",
        period: r.period,
        periodLabel: r.periodLabel,
        status: r.status,
        physicalProgressPercent: r.physicalProgressPercent,
        previousProgressPercent: r.previousProgressPercent,
        mainAchievements: r.mainAchievements,
        delaysIdentified: r.delaysIdentified,
        valueProducedXAF: r.valueProducedXAF,
        valueProducedCumulXAF: r.valueProducedCumulXAF,
        avgWorkforce: r.avgWorkforce,
        maxWorkforce: r.maxWorkforce,
        overtimeHoursTotal: r.overtimeHoursTotal,
        billingStatus: r.billingStatus,
        hseIncidentsCount: r.hseIncidentsCount,
        daysWithoutAccident: r.daysWithoutAccident,
        issuesEncountered: r.issuesEncountered,
        supportNeeded: r.supportNeeded,
        nextPeriodPriorities: r.nextPeriodPriorities,
        submittedAt: r.submittedAt,
        validatedAt: r.validatedAt,
        validatedById: r.validatedById,
      },
      select: { id: true, status: true, periodLabel: true },
    });
    console.log(`✓ Rapport ${created.periodLabel} (${created.status}) — id=${created.id}`);
  }

  console.log("\n✓ Seed terminé — 3 rapports créés sur CHT-2026-031");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
