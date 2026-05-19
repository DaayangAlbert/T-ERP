import "./_guard-prod.js";
// Enrichit la base avec 3 mois historiques VALIDATED pour chacun des 5
// modules de rapports techniques. Préserve les rapports courants déjà seedés.

import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

// ============================================================================
function pickDg(tenantId) {
  return p.user.findFirst({ where: { tenantId, role: "DG" } });
}
function pickDtrav(tenantId) {
  return p.user.findFirst({ where: { tenantId, role: "WORKS_DIRECTOR" } });
}

// ============================================================================
async function seedCcHistorical() {
  const cc = await p.user.findFirst({
    where: { role: "SITE_MANAGER", firstName: { contains: "Jean-Marie", mode: "insensitive" } },
  });
  if (!cc) return console.log("✗ Jean-Marie BIWOLE introuvable — skip CC");

  const site = await p.site.findFirst({ where: { code: "CHT-2026-031" } });
  if (!site) return console.log("✗ CHT-2026-031 introuvable — skip CC");

  const dtrav = await pickDtrav(site.tenantId);

  // Nov 2025 + Déc 2025 VALIDATED
  const months = [
    {
      period: new Date("2025-11-15T00:00:00Z"),
      label: "Novembre 2025",
      pct: 8.0,
      prevPct: null,
      mainAchievements:
        "Installation de chantier finalisée (zone vie, base logistique)\n" +
        "Démarrage terrassements généraux — 1 200 m³ extraits\n" +
        "Mobilisation 1ère équipe (28 ouvriers + 3 chefs d'équipe)",
      delays: "RAS",
      value: 95_000_000n,
      cumul: 95_000_000n,
      avgWk: 26,
      maxWk: 31,
      ot: 32.0,
      billing: "Décompte n°1 (avance démarrage) émis et réglé.",
      hse: 0,
      daysOk: 30,
      issues: "",
      support: "",
      next: "Finalisation terrassements\nDémarrage fondations bloc B",
      submitted: new Date("2025-11-30T17:00:00Z"),
      validated: new Date("2025-12-02T11:00:00Z"),
    },
    {
      period: new Date("2025-12-15T00:00:00Z"),
      label: "Décembre 2025",
      pct: 22.8,
      prevPct: 8.0,
      mainAchievements:
        "Fondations bloc B coulées (semelles isolées + filantes)\n" +
        "Démarrage longrines bloc A\n" +
        "Réception 1ère livraison majeure : 240 t armatures HA10/HA12",
      delays:
        "Retard 5 jours sur livraison ferraillage pré-façonné (fournisseur principal)\n" +
        "Conditions météo défavorables semaine 50 (3 jours d'arrêt partiel)",
      value: 130_000_000n,
      cumul: 225_000_000n,
      avgWk: 34,
      maxWk: 45,
      ot: 68.0,
      billing: "Décompte n°2 émis le 28/12/2025 (130 M FCFA), visa MOE en cours.",
      hse: 0,
      daysOk: 60,
      issues: "Coordination sous-traitant ferraillage tendue — réunion de cadrage le 22/12.",
      support: "",
      next:
        "Coulage semelles filantes restantes bloc A\nDémarrage longrines bloc B\nMobilisation 2e équipe maçonnerie",
      submitted: new Date("2025-12-30T17:30:00Z"),
      validated: new Date("2026-01-04T09:30:00Z"),
    },
  ];

  let created = 0;
  for (const m of months) {
    const exists = await p.siteProgressReport.findFirst({
      where: { siteId: site.id, period: m.period, authorId: cc.id },
    });
    if (exists) continue;
    await p.siteProgressReport.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        authorId: cc.id,
        reportType: "MONTHLY",
        period: m.period,
        periodLabel: m.label,
        status: "VALIDATED",
        physicalProgressPercent: m.pct,
        previousProgressPercent: m.prevPct,
        mainAchievements: m.mainAchievements,
        delaysIdentified: m.delays,
        valueProducedXAF: m.value,
        valueProducedCumulXAF: m.cumul,
        avgWorkforce: m.avgWk,
        maxWorkforce: m.maxWk,
        overtimeHoursTotal: m.ot,
        billingStatus: m.billing,
        hseIncidentsCount: m.hse,
        daysWithoutAccident: m.daysOk,
        issuesEncountered: m.issues,
        supportNeeded: m.support,
        nextPeriodPriorities: m.next,
        submittedAt: m.submitted,
        validatedAt: m.validated,
        validatedById: dtrav?.id ?? null,
      },
    });
    created++;
  }
  console.log(`✓ CC : ${created} rapport(s) historique(s) VALIDATED ajouté(s)`);
}

// ============================================================================
async function seedCdtHistorical() {
  const cdt = await p.user.findFirst({
    where: { role: "WORKS_MANAGER", firstName: { contains: "Samuel" } },
  });
  if (!cdt) return console.log("✗ Samuel MBARGA introuvable — skip CDT");

  const tenant = await p.tenant.findUnique({
    where: { id: cdt.tenantId },
    select: { id: true, isGroup: true, children: { select: { id: true } } },
  });
  const tenantIds = tenant && tenant.isGroup && tenant.children.length > 0
    ? [tenant.id, ...tenant.children.map((c) => c.id)]
    : [cdt.tenantId];

  const sites = await p.site.findMany({
    where: { tenantId: { in: tenantIds }, status: { in: ["ACTIVE", "PLANNED"] } },
    take: 3,
    orderBy: { code: "asc" },
  });
  if (sites.length === 0) return console.log("✗ Pas de chantier pour CDT — skip");

  const dtrav = await pickDtrav(cdt.tenantId);

  // 3 semaines précédentes (S18, S19, S20)
  const weeks = [
    { start: "2026-04-27", end: "2026-05-03", label: "Semaine 18 — 27/04 → 03/05/2026", validated: "2026-05-04T11:00:00Z" },
    { start: "2026-05-04", end: "2026-05-10", label: "Semaine 19 — 04/05 → 10/05/2026", validated: "2026-05-11T11:00:00Z" },
    { start: "2026-05-11", end: "2026-05-17", label: "Semaine 20 — 11/05 → 17/05/2026", validated: "2026-05-18T11:00:00Z" },
  ];

  let created = 0;
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    const ws = new Date(w.start + "T00:00:00Z");
    const we = new Date(w.end + "T23:59:59Z");
    const exists = await p.cdtWeeklyReport.findFirst({
      where: { authorId: cdt.id, weekStart: ws },
    });
    if (exists) continue;

    const report = await p.cdtWeeklyReport.create({
      data: {
        tenantId: cdt.tenantId,
        authorId: cdt.id,
        weekStart: ws,
        weekEnd: we,
        weekLabel: w.label,
        status: "VALIDATED",
        submittedAt: new Date(`${w.end}T17:30:00Z`),
        validatedAt: new Date(w.validated),
        validatedById: dtrav?.id ?? null,
        workingDays: i === 0 ? 5 : 6,
        weatherDays: i === 0 ? 1 : 0,
        subcontractorsPresent: 3 + i,
        globalSummary:
          `Semaine ${18 + i} bien menée sur les 3 chantiers, avec un avancement régulier et 0 incident HSE.`,
        keyAchievements:
          "CHT-2026-031 : coulage en cours conforme planning\n" +
          "CHT-2026-007 : reprise après congés, dynamique retrouvée\n" +
          "CHT-2025-024 : finition cloisons B1 dans les délais",
        transverseIssues:
          i === 0
            ? "Tension d'appro granulats persistante — 2 livraisons retardées de 24 h"
            : "Situation appro normalisée. Sous-effectif maçons CHT-2026-007 toujours présent.",
        scheduleSlippages: i === 0 ? "Aucun glissement majeur." : "RAS",
        arbitrationsNeeded: i === 2 ? "Validation contractuelle avenant CHT-2025-018 lot CVC à finaliser cette semaine." : "",
        nextWeekPlan:
          `Poursuite des travaux sur les 3 chantiers selon planning.\nRéunion méthodes vendredi 30/05.`,
      },
    });

    const snapshots = sites.slice(0, 3).map((s, idx) => ({
      reportId: report.id,
      siteId: s.id,
      physicalProgressPercent: 38 + i * 2 + idx * 7,
      financialProgressPercent: 34 + i * 1.5 + idx * 6,
      valueProducedXAF: BigInt([72_000_000, 105_000_000, 58_000_000][idx]),
      avgWorkforce: [36, 50, 26][idx] + i,
      hseIncidentsCount: 0,
      milestonesAchieved: `Avancement régulier semaine ${18 + i}`,
      milestonesAtRisk: null,
      notes: null,
    }));
    await p.cdtWeeklyReportSite.createMany({ data: snapshots });
    created++;
  }
  console.log(`✓ CDT : ${created} rapport(s) hebdo VALIDATED ajouté(s)`);
}

// ============================================================================
async function seedDtHistorical() {
  const dt = await p.user.findFirst({ where: { role: "TECH_DIRECTOR" } });
  if (!dt) return console.log("✗ Aucun TECH_DIRECTOR — skip DT");
  const dg = await pickDg(dt.tenantId);

  const months = [
    {
      period: new Date("2026-01-01T00:00:00Z"),
      label: "Janvier 2026",
      validated: new Date("2026-02-08T10:00:00Z"),
      avgPhy: 35.2,
      avgFin: 31.8,
      revenue: 1_120_000_000n,
      spent: 920_000_000n,
      margin: 18.0,
      sitesActive: 21,
      sitesCompleted: 0,
      sitesRisk: 3,
      tf1: 8.5,
      hseInc: 4,
      ncOpen: 14,
      ncCritical: 1,
      sub: 12,
      subRisk: 1,
      execSum: "Janvier 2026 — démarrage d'année. Avancement modéré (35,2 %). Marge tendue à 18 %, sous l'objectif. 4 incidents HSE — vigilance.",
      financial: "CA produit 1,12 Mds FCFA. Pression sur le BFR liée aux retards de paiement de fin d'année. DSO à 81 jours.",
      qhse: "TF1 à 8,5 — au-dessus seuil branche. 4 incidents dont 2 chutes. Audit ISO 9001 prévu mi-février.",
      sub_analysis: "12 sous-traitants actifs. ETANCHEO en redressement après pénalités décembre.",
      risks: "Trésorerie tendue Q1. CHT-2025-018 dépassement budgétaire confirmé (8 %).",
      decisions: "Validation acquisition compresseur 7 bars + 3 vibrateurs béton.",
      reco: "Demande arbitrage COMEX : ouverture découvert bancaire 200 M FCFA pour passer le creux janvier-mars.",
      outlook: "Cible février : avct moyen 40 %, marge ≥ 20 %, TF1 ≤ 7,5.",
    },
    {
      period: new Date("2026-02-01T00:00:00Z"),
      label: "Février 2026",
      validated: new Date("2026-03-08T10:00:00Z"),
      avgPhy: 41.2,
      avgFin: 37.5,
      revenue: 1_320_000_000n,
      spent: 1_050_000_000n,
      margin: 20.5,
      sitesActive: 22,
      sitesCompleted: 0,
      sitesRisk: 2,
      tf1: 6.8,
      hseInc: 2,
      ncOpen: 12,
      ncCritical: 1,
      sub: 13,
      subRisk: 1,
      execSum: "Février 2026 — montée en cadence. Marge revient à 20,5 %. TF1 améliore à 6,8. Bonne dynamique.",
      financial: "CA produit 1,32 Mds FCFA (+18 % vs janvier). Recouvrement amélioré : 165 M FCFA encaissés.",
      qhse: "TF1 6,8 (vs 8,5 en janvier). 2 incidents dont 1 coupure main. Plan formation EPI déployé.",
      sub_analysis: "13 sous-traitants actifs. ETANCHEO en redressement, sous surveillance.",
      risks: "Saison sèche favorable. Vigilance sur CHT-2026-007 (sous-effectif maçons).",
      decisions: "Standardisation gants anti-coupure HA-cat3 toutes équipes ferraillage.",
      reco: "Validation budget renfort équipe ferraillage CHT-2026-007 — 8 M FCFA/mois sur 4 mois.",
      outlook: "Cible mars : maintenir cadence, TF1 ≤ 6,0, démarrer 2 nouveaux chantiers.",
    },
    {
      period: new Date("2026-03-01T00:00:00Z"),
      label: "Mars 2026",
      validated: new Date("2026-04-06T10:00:00Z"),
      avgPhy: 44.5,
      avgFin: 40.8,
      revenue: 1_485_000_000n,
      spent: 1_170_000_000n,
      margin: 21.2,
      sitesActive: 22,
      sitesCompleted: 0,
      sitesRisk: 2,
      tf1: 6.0,
      hseInc: 2,
      ncOpen: 13,
      ncCritical: 2,
      sub: 14,
      subRisk: 2,
      execSum: "Mars 2026 — consolidation. Marge à 21,2 %. TF1 à 6,0. Avancement moyen 44,5 %. Performance globale satisfaisante.",
      financial: "CA produit 1,485 Mds FCFA. Marge brute confortable. DSO redescend à 68 jours.",
      qhse: "TF1 6,0 — meilleur niveau depuis 6 mois. 2 incidents sans gravité. Audit ISO 9001 réussi.",
      sub_analysis: "14 sous-traitants actifs. 2 sous-traitants à risque sous plan de progrès.",
      risks: "Saison des pluies imminente — préparation campagne sensibilisation et balisage permanent.",
      decisions: "Lancement étude méthode coffrage banche grimpante (gain planning 18 j/chantier).",
      reco: "Provision intempéries S2 — 65 M FCFA à constituer dès avril.",
      outlook: "Cible avril : Q1 réussi, focus préparation saison pluies.",
    },
  ];

  let created = 0;
  for (const m of months) {
    const exists = await p.dtMonthlyTechReport.findFirst({
      where: { authorId: dt.id, period: m.period },
    });
    if (exists) continue;
    await p.dtMonthlyTechReport.create({
      data: {
        tenantId: dt.tenantId,
        authorId: dt.id,
        period: m.period,
        periodLabel: m.label,
        status: "VALIDATED",
        submittedAt: new Date(m.validated.getTime() - 86_400_000 * 3),
        validatedAt: m.validated,
        validatedById: dg?.id ?? null,
        sitesActiveCount: m.sitesActive,
        sitesCompletedCount: m.sitesCompleted,
        sitesAtRiskCount: m.sitesRisk,
        avgPhysicalProgress: m.avgPhy,
        avgFinancialProgress: m.avgFin,
        totalRevenueXAF: m.revenue,
        totalSpentXAF: m.spent,
        portfolioMarginPercent: m.margin,
        hseTotalIncidents: m.hseInc,
        hseTf1: m.tf1,
        hseAuditsConducted: 7,
        hseNcOpen: m.ncOpen,
        subcontractorsActive: m.sub,
        subcontractorsAtRisk: m.subRisk,
        executiveSummary: m.execSum,
        financialAnalysis: m.financial,
        qhseAnalysis: m.qhse,
        subcontractingAnalysis: m.sub_analysis,
        majorRisks: m.risks,
        technicalDecisions: m.decisions,
        recommendations: m.reco,
        nextMonthOutlook: m.outlook,
      },
    });
    created++;
  }
  console.log(`✓ DT : ${created} rapport(s) mensuel(s) VALIDATED ajouté(s)`);
}

// ============================================================================
async function seedDtravHistorical() {
  const dtrav = await p.user.findFirst({ where: { role: "WORKS_DIRECTOR" } });
  if (!dtrav) return console.log("✗ Aucun WORKS_DIRECTOR — skip DTrav");
  const dg = await pickDg(dtrav.tenantId);

  const months = [
    {
      period: new Date("2026-01-01T00:00:00Z"),
      label: "Janvier 2026",
      validated: new Date("2026-02-09T10:00:00Z"),
      rev: 1_120_000_000n,
      delivered: 980_000_000n,
      margin: 18.0,
      recv: 920_000_000n,
      overdue: 285_000_000n,
      dso: 81,
      decN: 6,
      decAmt: 720_000_000n,
      amend: 1,
      penalt: 8_500_000n,
      lit: 1,
      cdt: 4,
      cdtVal: 12,
      cdtUnder: 1,
      wf: 472,
      ot: 1_080,
      wfCost: 268_000_000n,
      sum: "Janvier 2026 — démarrage d'année tendu côté trésorerie. DSO à 81 jours — au-dessus du seuil. 4 CDT supervisés.",
      prod: "CA produit 1,12 Mds FCFA. 0 chantier livré ce mois.",
      coll: "Encours élevé hérité fin 2025. 285 M FCFA en retard. Plan de relance déployé.",
      contract: "1 avenant signé. 1 litige ELEC-SOLUTIONS en cours.",
      cdtPerf: "12 rapports validés sur 16 attendus. F. ATEBA en difficulté éditoriale.",
      wf_analysis: "Effectif 472, heures sup 1080. Pic janvier sur CHT-2026-031.",
      issues: "Trésorerie tendue, retards paiements Commune Yaoundé III.",
      arb: "Ouverture découvert bancaire 200 M FCFA — pré-validé.",
      strat: "Février : reprendre la cadence, descendre DSO < 75j.",
    },
    {
      period: new Date("2026-02-01T00:00:00Z"),
      label: "Février 2026",
      validated: new Date("2026-03-09T10:00:00Z"),
      rev: 1_320_000_000n,
      delivered: 1_180_000_000n,
      margin: 20.5,
      recv: 880_000_000n,
      overdue: 245_000_000n,
      dso: 76,
      decN: 7,
      decAmt: 830_000_000n,
      amend: 2,
      penalt: 12_000_000n,
      lit: 1,
      cdt: 4,
      cdtVal: 14,
      cdtUnder: 1,
      wf: 478,
      ot: 1_150,
      wfCost: 275_000_000n,
      sum: "Février 2026 — amélioration globale. CA en hausse, marge à 20,5 %. DSO descend à 76 j.",
      prod: "CA produit 1,32 Mds (+18 %). Bonne dynamique sur 3 chantiers majeurs.",
      coll: "Encaissements 165 M FCFA. DSO 76j (vs 81 en janvier). Effort de recouvrement payant.",
      contract: "2 avenants signés. Litige ELEC en cours, audience prévue mars.",
      cdtPerf: "14 rapports validés. F. ATEBA en progrès. Coaching maintenu.",
      wf_analysis: "Effectif 478, heures sup 1150. Démarrage soutenu sur CHT-2026-040.",
      issues: "Saison sèche favorable. Vigilance sous-effectif CHT-2026-007.",
      arb: "Validation budget renfort équipe ferraillage CHT-2026-007.",
      strat: "Mars : marge ≥ 21 %, DSO ≤ 72 j.",
    },
    {
      period: new Date("2026-03-01T00:00:00Z"),
      label: "Mars 2026",
      validated: new Date("2026-04-07T10:00:00Z"),
      rev: 1_485_000_000n,
      delivered: 1_340_000_000n,
      margin: 21.2,
      recv: 870_000_000n,
      overdue: 215_000_000n,
      dso: 68,
      decN: 8,
      decAmt: 900_000_000n,
      amend: 2,
      penalt: 14_500_000n,
      lit: 1,
      cdt: 4,
      cdtVal: 15,
      cdtUnder: 1,
      wf: 482,
      ot: 1_205,
      wfCost: 280_000_000n,
      sum: "Mars 2026 — consolidation. Marge 21,2 %. DSO à 68 j. Production stable. Q1 globalement réussi.",
      prod: "CA produit 1,485 Mds. Bonne performance. Préparation Q2.",
      coll: "DSO 68j (vs 76 février). Reprise des paiements MINHDU.",
      contract: "2 avenants. Litige ELEC en cours de médiation.",
      cdtPerf: "15 rapports validés. F. ATEBA noté B (en progrès).",
      wf_analysis: "Effectif 482, heures sup 1205. Stable.",
      issues: "Saison des pluies imminente. Préparation sensibilisation HSE.",
      arb: "Provision intempéries 65 M FCFA validée.",
      strat: "Avril : maintenir performance, préparer Q2 et saison pluies.",
    },
  ];

  let created = 0;
  for (const m of months) {
    const exists = await p.dtravMonthlyReport.findFirst({
      where: { authorId: dtrav.id, period: m.period },
    });
    if (exists) continue;
    await p.dtravMonthlyReport.create({
      data: {
        tenantId: dtrav.tenantId,
        authorId: dtrav.id,
        period: m.period,
        periodLabel: m.label,
        status: "VALIDATED",
        submittedAt: new Date(m.validated.getTime() - 86_400_000 * 3),
        validatedAt: m.validated,
        validatedById: dg?.id ?? null,
        revenueProducedXAF: m.rev,
        revenueDeliveredXAF: m.delivered,
        marginPercent: m.margin,
        sitesDelivered: 0,
        receivablesXAF: m.recv,
        overdueReceivablesXAF: m.overdue,
        dso: m.dso,
        decompteIssuedCount: m.decN,
        decompteIssuedXAF: m.decAmt,
        amendmentsCount: m.amend,
        penaltiesAppliedXAF: m.penalt,
        litigationsOpen: m.lit,
        cdtCount: m.cdt,
        cdtReportsValidated: m.cdtVal,
        cdtUnderperforming: m.cdtUnder,
        workforceTotal: m.wf,
        workforceOvertimeHours: m.ot,
        workforceCostXAF: m.wfCost,
        executiveSummary: m.sum,
        productionAnalysis: m.prod,
        collectionsAnalysis: m.coll,
        contractualSituation: m.contract,
        cdtPerformance: m.cdtPerf,
        workforceAnalysis: m.wf_analysis,
        majorIssues: m.issues,
        arbitragesRequested: m.arb,
        nextMonthStrategy: m.strat,
      },
    });
    created++;
  }
  console.log(`✓ DTrav : ${created} rapport(s) mensuel(s) VALIDATED ajouté(s)`);
}

// ============================================================================
async function seedQhseHistorical() {
  const author = await p.user.findFirst({ where: { role: "TECH_DIRECTOR" } });
  if (!author) return console.log("✗ Aucun TECH_DIRECTOR — skip QHSE");
  const dg = await pickDg(author.tenantId);

  const months = [
    {
      period: new Date("2026-01-01T00:00:00Z"),
      label: "Janvier 2026",
      validated: new Date("2026-02-10T11:00:00Z"),
      hours: 84_960n,
      tot: 4, lti: 3, nlti: 1, days: 12, tf1: 35.3, tg: 0.14, daysOk: 5,
      cuts: 2, falls: 1, elec: 0, chem: 0, veh: 1, other: 0,
      inAudit: 6, exAudit: 0, insp: 18, obs: 38,
      ncO: 14, ncC: 5, ncCr: 2, ncOver: 5,
      trS: 4, trH: 32.0, trP: 68,
      epi: 180, epiOk: 78.0,
      exec: "Janvier 2026 — démarrage difficile QHSE. TF1 à 35,3 — très au-dessus du seuil branche. 4 incidents dont 3 avec arrêt. Plan d'action d'urgence engagé.",
      inc: "Incidents janvier : 2 coupures, 1 chute, 1 véhicule. Causes : non-port EPI gants + balisage insuffisant. Sanctions disciplinaires + nouvelles formations.",
      audit: "6 audits internes. Pas d'audit externe (ISO 45001 programmé février).",
      nc: "14 NC ouvertes, 5 critiques. Plan de rattrapage déployé.",
      train: "4 sessions, 32 h, 68 personnes formées.",
      epi_a: "EPI conformité 78 % — très en deçà cible 95 %. Programme intensif déployé.",
      action: "PA-2026-01-001 à 010 — Renforcement port EPI sur tous les chantiers.",
      trends: "Démarrage difficile. TF1 historiquement élevé en janvier (saisonnalité fin année).",
      chsct: "RECO 1 : campagne EPI obligatoire. RECO 2 : audit balisage tous chantiers.",
    },
    {
      period: new Date("2026-02-01T00:00:00Z"),
      label: "Février 2026",
      validated: new Date("2026-03-10T11:00:00Z"),
      hours: 86_040n,
      tot: 3, lti: 2, nlti: 1, days: 9, tf1: 23.2, tg: 0.10, daysOk: 8,
      cuts: 1, falls: 1, elec: 0, chem: 0, veh: 0, other: 1,
      inAudit: 7, exAudit: 1, insp: 20, obs: 42,
      ncO: 12, ncC: 6, ncCr: 1, ncOver: 4,
      trS: 5, trH: 38.0, trP: 82,
      epi: 195, epiOk: 84.0,
      exec: "Février 2026 — amélioration sensible. TF1 descend à 23,2 (vs 35,3 janvier). Effet des actions janvier. Audit ISO 45001 réussi à 88 %.",
      inc: "3 incidents (vs 4 janvier). 1 coupure, 1 chute. Causes mieux maîtrisées. Plan d'action efficace.",
      audit: "7 audits internes + 1 audit externe (TÜV — préparation ISO 45001). Résultat partiel : 88 %.",
      nc: "12 NC ouvertes (vs 14). Effort de clôture maintenu.",
      train: "5 sessions, 38 h, 82 personnes formées.",
      epi_a: "EPI conformité 84 % (+6 pts). Effet des contrôles renforcés.",
      action: "Maintien des plans d'action. Lancement campagne saison pluies.",
      trends: "TF1 en baisse continue. Tendance favorable mais reste élevé.",
      chsct: "RECO 1 : poursuite formations EPI. RECO 2 : préparer audit externe ISO 45001 mars.",
    },
    {
      period: new Date("2026-03-01T00:00:00Z"),
      label: "Mars 2026",
      validated: new Date("2026-04-09T11:00:00Z"),
      hours: 87_120n,
      tot: 2, lti: 1, nlti: 1, days: 4, tf1: 11.5, tg: 0.05, daysOk: 18,
      cuts: 1, falls: 0, elec: 0, chem: 0, veh: 0, other: 1,
      inAudit: 7, exAudit: 1, insp: 21, obs: 45,
      ncO: 11, ncC: 7, ncCr: 1, ncOver: 4,
      trS: 5, trH: 40.0, trP: 88,
      epi: 205, epiOk: 86.5,
      exec: "Mars 2026 — performance HSE solide. TF1 descend à 11,5 — proche du seuil branche. Audit ISO 45001 réussi à 90 %. Certification maintenue.",
      inc: "2 incidents dont 1 avec arrêt (coupure). Niveau historiquement bas.",
      audit: "Audit ISO 45001 finalisé : 90 % conformité, 0 NC majeure → certification maintenue.",
      nc: "11 NC ouvertes, 7 clôturées. Taux de clôture excellent.",
      train: "5 sessions, 40 h, 88 personnes formées.",
      epi_a: "EPI conformité 86,5 %. Approche cible 90 %.",
      action: "Préparation campagne intensive saison pluies. Renforcement balisage.",
      trends: "TF1 trimestriel glissant 23,3 — en baisse régulière. Effort à poursuivre.",
      chsct: "RECO 1 : campagne saison pluies déployée avril. RECO 2 : objectif TF1 ≤ 8 d'ici fin Q2.",
    },
  ];

  let created = 0;
  for (const m of months) {
    const exists = await p.qhseMonthlyReport.findFirst({
      where: { authorId: author.id, period: m.period },
    });
    if (exists) continue;
    await p.qhseMonthlyReport.create({
      data: {
        tenantId: author.tenantId,
        authorId: author.id,
        period: m.period,
        periodLabel: m.label,
        status: "VALIDATED",
        submittedAt: new Date(m.validated.getTime() - 86_400_000 * 3),
        validatedAt: m.validated,
        validatedById: dg?.id ?? null,
        totalHoursWorked: m.hours,
        totalIncidents: m.tot,
        lostTimeIncidents: m.lti,
        noLostTimeIncidents: m.nlti,
        daysLost: m.days,
        tf1: m.tf1,
        tg: m.tg,
        daysWithoutAccident: m.daysOk,
        cutsCount: m.cuts,
        fallsCount: m.falls,
        electricalCount: m.elec,
        chemicalCount: m.chem,
        vehiclesCount: m.veh,
        otherCount: m.other,
        internalAudits: m.inAudit,
        externalAudits: m.exAudit,
        inspectionsCount: m.insp,
        observationsCount: m.obs,
        ncOpened: m.ncO,
        ncClosed: m.ncC,
        ncCritical: m.ncCr,
        ncOverdue: m.ncOver,
        safetyTrainings: m.trS,
        trainingHours: m.trH,
        personsTrained: m.trP,
        epiDistributed: m.epi,
        epiCheckCompliance: m.epiOk,
        executiveSummary: m.exec,
        incidentsAnalysis: m.inc,
        auditFindings: m.audit,
        ncAnalysis: m.nc,
        trainingsAnalysis: m.train,
        epiAnalysis: m.epi_a,
        actionPlans: m.action,
        trendsAnalysis: m.trends,
        chsctRecommendations: m.chsct,
      },
    });
    created++;
  }
  console.log(`✓ QHSE : ${created} rapport(s) mensuel(s) VALIDATED ajouté(s)`);
}

// ============================================================================
async function main() {
  console.log("Seed historique des rapports techniques — démarrage...\n");
  await seedCcHistorical();
  await seedCdtHistorical();
  await seedDtHistorical();
  await seedDtravHistorical();
  await seedQhseHistorical();
  console.log("\n✓ Seed historique terminé.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
