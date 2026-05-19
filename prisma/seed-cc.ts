import "./_guard-prod";
/**
 * Seed complémentaire — données Chef Chantier (Jean KAMGA · Bloc 0 + 1).
 *
 * À lancer APRÈS le seed principal :
 *   pnpm exec tsx prisma/seed-cc.ts
 *
 * Ajoute :
 *  - Affecte Jean KAMGA à Pont Mfoundi via assignedSiteIds
 *  - Crée 6 ouvriers Pont Mfoundi avec phones réalistes (si pas déjà créés)
 *  - Membres SiteWorkforceMember pour Jean (FOREMAN) + ouvriers
 *  - Causerie sécurité HSE semaine courante
 *  - 1 livraison BICAM ciment à 10h
 */
import { PrismaClient, Role, WorkforceRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const WORKERS_SEED = [
  { firstName: "Pierre", lastName: "ABEGA", matricule: "EMP-2023-00301", position: "Ferrailleur", phone: "+237689012301" },
  { firstName: "Patrick", lastName: "ABEGA", matricule: "EMP-2023-00302", position: "Ferrailleur", phone: "+237689012302" },
  { firstName: "Marc", lastName: "ESSAMA", matricule: "EMP-2023-00303", position: "Coffreur", phone: "+237689012303" },
  { firstName: "Bertin", lastName: "OWONA", matricule: "EMP-2023-00304", position: "Coffreur", phone: "+237689012304" },
  { firstName: "André", lastName: "MOUSSA", matricule: "EMP-2024-00305", position: "Manœuvre", phone: "+237689012305" },
  { firstName: "Cédric", lastName: "NGONO", matricule: "EMP-2024-00306", position: "Manœuvre", phone: "+237689012306" },
];

async function main() {
  console.log("🌱 Seed CC (Jean KAMGA)...");

  const jean = await prisma.user.findFirst({ where: { email: "jean@batimcam.cm" }, select: { id: true, tenantId: true } });
  if (!jean) {
    console.error("Jean KAMGA introuvable (email jean@batimcam.cm)");
    return;
  }

  const pontMfoundi = await prisma.site.findFirst({
    where: { code: "CHT-2025-031" },
    select: { id: true, tenantId: true },
  });
  if (!pontMfoundi) {
    console.error("Pont Mfoundi introuvable");
    return;
  }

  // 1) Assigne Jean au chantier
  await prisma.user.update({
    where: { id: jean.id },
    data: { assignedSiteIds: [pontMfoundi.id] },
  });
  console.log("  ✓ Jean KAMGA → Pont Mfoundi");

  // 2) Crée les ouvriers manquants
  const passwordHash = await bcrypt.hash("Demo2026!", 12);
  for (const w of WORKERS_SEED) {
    const email = `${w.firstName.toLowerCase()}.${w.lastName.toLowerCase()}@batimcam.cm`;
    await prisma.user.upsert({
      where: { email },
      create: {
        tenantId: pontMfoundi.tenantId,
        email,
        firstName: w.firstName,
        lastName: w.lastName,
        employeeId: w.matricule,
        phone: w.phone,
        position: w.position,
        passwordHash,
        role: Role.WORKER,
        emailVerified: true,
        hireDate: new Date("2023-06-01"),
      },
      update: { phone: w.phone, position: w.position },
    });
  }
  console.log(`  ✓ ${WORKERS_SEED.length} ouvriers créés/mis à jour`);

  // 3) SiteWorkforceMember pour Jean + ouvriers
  await prisma.siteWorkforceMember.deleteMany({
    where: { siteId: pontMfoundi.id, role: { in: [WorkforceRole.FOREMAN, WorkforceRole.WORKER] } },
  });
  await prisma.siteWorkforceMember.create({
    data: {
      siteId: pontMfoundi.id,
      userId: jean.id,
      role: WorkforceRole.FOREMAN,
      isLeader: true,
      startedAt: new Date("2025-09-01"),
    },
  });
  // Récupère les équipes existantes (Terrassement, Coffrage) créées par seed-dtrav
  const teams = await prisma.siteTeam.findMany({ where: { siteId: pontMfoundi.id } });
  for (let i = 0; i < WORKERS_SEED.length; i++) {
    const w = WORKERS_SEED[i];
    const email = `${w.firstName.toLowerCase()}.${w.lastName.toLowerCase()}@batimcam.cm`;
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) continue;
    const team = teams[i % Math.max(1, teams.length)];
    await prisma.siteWorkforceMember.create({
      data: {
        siteId: pontMfoundi.id,
        userId: user.id,
        teamId: team?.id ?? null,
        reportsToId: jean.id,
        role: WorkforceRole.WORKER,
        startedAt: new Date("2025-09-01"),
      },
    });
  }
  console.log(`  ✓ Hiérarchie chantier (Jean + ${WORKERS_SEED.length} ouvriers)`);

  // 4) Causerie sécurité de la semaine
  const now = new Date();
  const weekIso = `${now.getFullYear()}-W${String(getISOWeek(now)).padStart(2, "0")}`;
  await prisma.hseSafetyTalk.upsert({
    where: { siteId_weekIso: { siteId: pontMfoundi.id, weekIso } },
    create: {
      siteId: pontMfoundi.id,
      weekIso,
      theme: "Travail en hauteur",
      description:
        "Vérification systématique des harnais avant montée. Inspection lignes de vie et garde-corps piles 3 et 4. Rappel des consignes EPI individuel.",
    },
    update: {},
  });
  console.log(`  ✓ Causerie sécurité ${weekIso} prête`);

  // 5) Livraison BICAM ciment à 10h
  const today = new Date();
  const at10h = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0);
  const bicam = await prisma.supplier.findFirst({
    where: { name: { contains: "BICAM", mode: "insensitive" } },
    select: { id: true },
  });
  await prisma.delivery.create({
    data: {
      siteId: pontMfoundi.id,
      supplierId: bicam?.id ?? null,
      scheduledAt: at10h,
      status: "CONFIRMED",
      deliveryNoteRef: "BL-2026-0451",
      items: [
        { articleCode: "CIM-HPC", label: "Ciment HPC 42,5R", expectedQty: 320, receivedQty: 0 },
      ],
    },
  });
  console.log("  ✓ Livraison BICAM 10h prête");

  console.log("✅ Seed CC terminé");
  console.log("");
  console.log("👉 Connectez-vous : jean@batimcam.cm / Demo2026!");
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
