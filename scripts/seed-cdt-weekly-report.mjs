import "./_guard-prod.js";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  // CDT = WORKS_MANAGER. On en prend un du tenant batimcam principal.
  const cdt = await p.user.findFirst({
    where: { role: "WORKS_MANAGER" },
    include: { tenant: { select: { id: true, slug: true } } },
  });
  if (!cdt) throw new Error("Aucun WORKS_MANAGER trouvé en base");

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
  if (sites.length === 0) throw new Error("Aucun chantier actif");

  // Supprimer les rapports CDT antérieurs de ce CDT
  await p.cdtWeeklyReport.deleteMany({ where: { authorId: cdt.id } });

  // Semaine 18 mai → 24 mai 2026
  const weekStart = new Date("2026-05-18T00:00:00Z");
  const weekEnd = new Date("2026-05-24T23:59:59Z");

  const report = await p.cdtWeeklyReport.create({
    data: {
      tenantId: cdt.tenantId,
      authorId: cdt.id,
      weekStart,
      weekEnd,
      weekLabel: "Semaine 21 — 18/05 → 24/05/2026",
      status: "SUBMITTED",
      submittedAt: new Date("2026-05-25T17:30:00Z"),
      workingDays: 6,
      weatherDays: 1,
      subcontractorsPresent: 4,
      globalSummary:
        "Semaine globalement productive sur les 3 chantiers. Bonne dynamique RH avec un pic d'effectif jeudi 21/05. " +
        "Une journée d'arrêt total mardi 19/05 pour cause d'orage (zone Yaoundé Sud).",
      keyAchievements:
        "CHT-2026-031 : coulage R+1 réussi (210 m³ de béton)\n" +
        "CHT-2026-007 : finalisation du gros œuvre bâtiment B\n" +
        "CHT-2025-024 : démarrage second œuvre cloisons légères\n" +
        "Audit BCT semaine S21 : 0 réserve bloquante sur les 3 chantiers",
      transverseIssues:
        "Tension d'approvisionnement sur les granulats 5/15 — qualité variable\n" +
        "Sous-effectif maçons sur CHT-2026-007 (3 absences maladie cumulées)\n" +
        "Coupure ENEO récurrente quartier Mfoundi : impact bétonnière fixe",
      scheduleSlippages:
        "CHT-2026-007 : retard 3 jours sur la dalle R+2 (combinaison intempéries + sous-effectif)\n" +
        "CHT-2025-024 : jalon \"étanchéité toiture\" à risque pour S23 (commande membrane EPDM décalée)",
      arbitrationsNeeded:
        "Arbitrage demandé sur le renfort effectif maçons CHT-2026-007 (2 intérimaires sur 4 semaines)\n" +
        "Validation budget loueur groupe électrogène 100 kVA pour les 4 prochaines semaines",
      nextWeekPlan:
        "CHT-2026-031 : démarrage maçonnerie R+1\n" +
        "CHT-2026-007 : rattrapage dalle R+2 + démarrage études exécution lot CVC\n" +
        "CHT-2025-024 : finition cloisons B1 et B2, démarrage faux-plafonds\n" +
        "Réunion hebdo méthodes vendredi 30/05 pour calage planning intégré",
    },
  });

  // 3 site snapshots
  const snapshots = sites.slice(0, 3).map((s, idx) => ({
    reportId: report.id,
    siteId: s.id,
    physicalProgressPercent: 42 + idx * 8.5,
    financialProgressPercent: 38 + idx * 7.2,
    valueProducedXAF: BigInt([85_000_000, 120_000_000, 67_000_000][idx]),
    avgWorkforce: [38, 52, 28][idx],
    hseIncidentsCount: idx === 1 ? 1 : 0,
    milestonesAchieved: idx === 0
      ? "Coulage R+1 réussi (210 m³)\nPose ferraillage poteaux R+1 finalisée"
      : idx === 1
        ? "Finalisation gros œuvre bâtiment B\nRéception étanchéité B1"
        : "Démarrage cloisons légères\nLivraison faïence sanitaires complète",
    milestonesAtRisk: idx === 1
      ? "Dalle R+2 — retard 3 jours, jalon à recadrer S22"
      : idx === 2
        ? "Étanchéité toiture S23 — commande membrane décalée"
        : null,
    notes: idx === 1 ? "1 incident HSE niveau 1 (coupure main droite), arrêt 3 jours, soigné chantier" : null,
  }));

  await p.cdtWeeklyReportSite.createMany({ data: snapshots });

  console.log(`✓ Rapport hebdomadaire CDT créé — id=${report.id}`);
  console.log(`  Auteur : ${cdt.firstName} ${cdt.lastName} (${cdt.tenant.slug})`);
  console.log(`  ${snapshots.length} chantiers couverts`);
  console.log(`  Statut : SUBMITTED (visible côté DTrav pour validation)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
