/**
 * Seed un planning BTP réaliste sur un chantier existant, pour pouvoir tester
 * la saisie + le PDF côté Directeur des travaux.
 *
 * Usage :
 *   node scripts/seed-test-planning.js                        → 1er chantier actif du dernier tenant créé
 *   node scripts/seed-test-planning.js <code-chantier>        → ce chantier précis
 *   node scripts/seed-test-planning.js --tenant <slug>        → 1er chantier de ce tenant
 *
 * Idempotent : si un planning existe déjà, on supprime ses phases/tâches/jalons
 * puis on les recrée avec le jeu de données standard.
 *
 * Phases standard (échelonnées à la durée réelle du chantier) :
 *   1. Installation de chantier
 *   2. Terrassement
 *   3. Fondations
 *   4. Élévation gros œuvre
 *   5. Charpente / Couverture
 *   6. Second œuvre (cloisons + réseaux)
 *   7. Revêtements & menuiseries
 *   8. Finitions & réception
 *
 * Jalons MOA standard : J1 démarrage, J2 hors d'eau/hors d'air, J3 livraison
 * provisoire, J4 livraison définitive.
 */
// Charge .env (DATABASE_URL) sans dépendre de dotenv — Prisma client JS ne le
// fait pas tout seul (seule la CLI le fait).
(() => {
  const fs = require("node:fs");
  const path = require("node:path");
  for (const f of [".env", ".env.production", ".env.local"]) {
    try {
      const txt = fs.readFileSync(path.join(process.cwd(), f), "utf8");
      for (const line of txt.split("\n")) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*?)"?\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
      }
    } catch {
      /* fichier absent — ok */
    }
  }
})();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PHASES = [
  {
    name: "Installation de chantier",
    weight: 5, // pourcentage de la durée totale
    progress: 100,
    status: "COMPLETED",
    tasks: [
      "Clôture + signalisation",
      "Implantation et piquetage topographique",
      "Branchements provisoires (eau, électricité)",
      "Installation base vie + sanitaires",
    ],
  },
  {
    name: "Terrassement",
    weight: 10,
    progress: 90,
    status: "IN_PROGRESS",
    tasks: [
      "Décapage de la terre végétale",
      "Fouilles en pleine masse",
      "Fouilles en rigoles pour fondations",
      "Évacuation des déblais",
    ],
  },
  {
    name: "Fondations",
    weight: 12,
    progress: 60,
    status: "IN_PROGRESS",
    tasks: [
      "Béton de propreté",
      "Coffrage et ferraillage semelles isolées",
      "Coulage semelles béton",
      "Longrines et chaînages bas",
      "Dallage RDC + polyane",
    ],
  },
  {
    name: "Élévation gros œuvre",
    weight: 25,
    progress: 20,
    status: "IN_PROGRESS",
    tasks: [
      "Coffrage poteaux niveau RDC",
      "Coulage planchers haut RDC",
      "Élévation maçonnerie agglos RDC",
      "Coffrage poteaux niveau R+1",
      "Coulage planchers haut R+1",
      "Élévations maçonnerie R+1",
    ],
  },
  {
    name: "Charpente & couverture",
    weight: 10,
    progress: 0,
    status: "PLANNED",
    tasks: [
      "Préfabrication charpente bois",
      "Pose charpente + chevrons",
      "Couverture tôle bac acier",
      "Pose chéneaux et descentes EP",
    ],
  },
  {
    name: "Second œuvre — cloisons & réseaux",
    weight: 18,
    progress: 0,
    status: "PLANNED",
    tasks: [
      "Cloisons de distribution",
      "Réseaux électriques (passage gaines + tableaux)",
      "Réseaux plomberie (alim + EU/EV)",
      "Pose climatisation (gainage + UI)",
      "Étanchéité dalle terrasse",
    ],
  },
  {
    name: "Revêtements & menuiseries",
    weight: 12,
    progress: 0,
    status: "PLANNED",
    tasks: [
      "Enduits intérieurs + extérieurs",
      "Carrelage sols + faïence pièces humides",
      "Pose portes et fenêtres alu",
      "Peinture deux couches",
    ],
  },
  {
    name: "Finitions & réception",
    weight: 8,
    progress: 0,
    status: "PLANNED",
    tasks: [
      "Pose appareillage électrique + sanitaire",
      "Nettoyage final livraison",
      "Levée des réserves OPR",
      "Réception provisoire MOA",
    ],
  },
];

const MILESTONES = [
  { code: "J1", description: "Ordre de service / démarrage effectif", offsetPct: 0 },
  { code: "J2", description: "Hors d'eau / hors d'air", offsetPct: 65 },
  { code: "J3", description: "Livraison provisoire", offsetPct: 95 },
  { code: "J4", description: "Livraison définitive (fin GPA)", offsetPct: 100 },
];

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + Math.round(n));
  return r;
}

async function pickSite(args) {
  // --tenant <slug>
  const ti = args.indexOf("--tenant");
  if (ti >= 0 && args[ti + 1]) {
    const slug = args[ti + 1];
    const tenant = await prisma.tenant.findFirst({ where: { slug } });
    if (!tenant) throw new Error(`Tenant introuvable : ${slug}`);
    const site = await prisma.site.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });
    if (!site) throw new Error(`Aucun chantier pour le tenant "${slug}".`);
    return site;
  }
  // <code-chantier>
  const code = args[0];
  if (code) {
    const site = await prisma.site.findFirst({ where: { code } });
    if (!site) throw new Error(`Aucun chantier avec le code "${code}".`);
    return site;
  }
  // Fallback : chantier le plus récent
  const site = await prisma.site.findFirst({ orderBy: { createdAt: "desc" } });
  if (!site) throw new Error("Aucun chantier dans la base. Crée-en un d'abord via /informatique/sites/new.");
  return site;
}

(async () => {
  const site = await pickSite(process.argv.slice(2));
  console.log(`✓ Chantier cible : ${site.code} — ${site.name}`);
  console.log(`  Période : ${site.startDate.toISOString().slice(0, 10)} → ${site.plannedEndDate.toISOString().slice(0, 10)}`);

  const totalDays = Math.max(
    30,
    Math.round((site.plannedEndDate.getTime() - site.startDate.getTime()) / 86_400_000),
  );

  // Bootstrap planning (idempotent)
  let planning = await prisma.sitePlanning.findUnique({ where: { siteId: site.id } });
  if (planning) {
    await prisma.sitePhase.deleteMany({ where: { planningId: planning.id } });
    await prisma.siteMilestone.deleteMany({ where: { planningId: planning.id } });
    await prisma.sitePlanning.update({
      where: { id: planning.id },
      data: { totalDurationDays: totalDays },
    });
    console.log("  ↻ Planning existant — phases/jalons remis à zéro");
  } else {
    planning = await prisma.sitePlanning.create({
      data: { siteId: site.id, totalDurationDays: totalDays },
    });
    console.log("  + Planning créé");
  }

  // Phases échelonnées proportionnellement à totalDays
  let cursor = new Date(site.startDate);
  let orderIndex = 0;
  for (const ph of PHASES) {
    const days = Math.max(3, Math.round((totalDays * ph.weight) / 100));
    const start = new Date(cursor);
    const end = addDays(start, days);
    const phase = await prisma.sitePhase.create({
      data: {
        planningId: planning.id,
        orderIndex,
        name: ph.name,
        plannedStart: start,
        plannedEnd: end,
        progressPercent: ph.progress,
        status: ph.status,
        actualStart: ph.progress > 0 ? start : null,
        actualEnd: ph.progress >= 100 ? end : null,
      },
    });
    // Tâches : on distribue uniformément sur la durée de la phase
    const slice = days / ph.tasks.length;
    for (let i = 0; i < ph.tasks.length; i++) {
      const tStart = addDays(start, slice * i);
      const tEnd = addDays(start, slice * (i + 1));
      await prisma.siteTask.create({
        data: {
          phaseId: phase.id,
          name: ph.tasks[i],
          plannedStart: tStart,
          plannedEnd: tEnd,
          progressPercent: Math.min(100, ph.progress),
        },
      });
    }
    console.log(`  · ${String(orderIndex + 1).padStart(2, "0")}. ${ph.name} (${days} j, ${ph.tasks.length} tâches, ${ph.progress}%)`);
    orderIndex++;
    cursor = end;
  }

  // Jalons
  for (const m of MILESTONES) {
    const due = addDays(site.startDate, (totalDays * m.offsetPct) / 100);
    await prisma.siteMilestone.create({
      data: {
        planningId: planning.id,
        code: m.code,
        description: m.description,
        contractDueDate: due,
      },
    });
  }
  console.log(`  · ${MILESTONES.length} jalons MOA créés`);

  console.log("\n✓ Données de test prêtes.");
  console.log(`  → Connecte-toi en Directeur des travaux, sélectionne le chantier ${site.code} dans la barre supérieure,`);
  console.log(`    puis ouvre /direction-travaux ou /directeur-travaux/planning pour voir le résultat.`);
  console.log(`  → Bouton "Télécharger le PDF" en haut à droite de la page Planning.`);

  await prisma.$disconnect();
})().catch((e) => {
  console.error("\n❌ Erreur :", e.message);
  process.exit(1);
});
