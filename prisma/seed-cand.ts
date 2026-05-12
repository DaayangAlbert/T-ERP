/**
 * Seed complémentaire — Espace candidat (Zone 3 / PROMPT 0).
 *
 * À lancer APRÈS le seed principal :
 *   pnpm exec tsx prisma/seed-cand.ts
 *
 * Crée :
 *  - Jean NGONGO (jean.ngongo@email.cm / Demo2026!) — Role.CANDIDATE, tenantId=null
 *  - 3 JobOffer BatimCAM (si pas déjà présentes)
 *  - 3 Application : Reçue, Présélection, Entretien
 *  - 1 Interview demain 14h (mode VIDEO, non confirmé)
 */
import {
  PrismaClient,
  Role,
  UserStatus,
  AppStage,
  JobStatus,
  ContractType,
  InterviewMode,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const PWD = "Demo2026!";

async function main() {
  console.log("🌱 Seed Candidat (Jean NGONGO)...");

  const batimcam = await prisma.tenant.findUnique({
    where: { slug: "batimcam" },
    select: { id: true, name: true },
  });
  if (!batimcam) {
    console.error("Tenant BatimCAM introuvable — lance d'abord `pnpm db:seed`");
    process.exit(1);
  }

  // ---- 1. JobOffers (créer si absentes) ----
  const offers = await Promise.all(
    [
      {
        reference: "REC-2026-001",
        title: "Conducteur de Travaux Senior",
        department: "Direction Technique",
        contractType: ContractType.CDI,
        category: "Cadre",
        description: "Pilotage de chantier BTP de grande envergure (>500 MFCFA).",
        requirements: "Bac+5 BTP, 8 ans d'expérience, maîtrise SYSCOHADA chantier.",
        region: "Yaoundé",
        salaryMin: 850_000n,
        salaryMax: 1_100_000n,
      },
      {
        reference: "REC-2026-002",
        title: "Chef de chantier Bonabéri",
        department: "Production",
        contractType: ContractType.CDI,
        category: "ETAM",
        description: "Supervision quotidienne d'un chantier de logements collectifs à Douala.",
        requirements: "BTS Génie Civil, 5 ans d'expérience terrain.",
        region: "Douala",
        salaryMin: 550_000n,
        salaryMax: 750_000n,
      },
      {
        reference: "REC-2026-003",
        title: "Ingénieur Méthodes BTP",
        department: "Direction Technique",
        contractType: ContractType.CDI,
        category: "Cadre",
        description: "Études techniques et optimisation des plannings chantiers.",
        requirements: "Ingénieur GC, 3 ans d'expérience, maîtrise MS Project.",
        region: "Yaoundé",
        salaryMin: 700_000n,
        salaryMax: 950_000n,
      },
    ].map((data) =>
      prisma.jobOffer.upsert({
        where: {
          tenantId_reference: {
            tenantId: batimcam.id,
            reference: data.reference,
          },
        },
        create: {
          ...data,
          tenantId: batimcam.id,
          positions: 1,
          status: JobStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        update: {
          status: JobStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      }),
    ),
  );
  console.log(`✓ ${offers.length} offres BatimCAM (upsert)`);

  // ---- 2. Jean NGONGO ----
  const passwordHash = await bcrypt.hash(PWD, 12);
  const jean = await prisma.user.upsert({
    where: { email: "jean.ngongo@email.cm" },
    create: {
      email: "jean.ngongo@email.cm",
      passwordHash,
      firstName: "Jean",
      lastName: "NGONGO",
      phone: "+237 690 12 34 56",
      position: "Conducteur de Travaux",
      role: Role.CANDIDATE,
      status: UserStatus.ACTIVE,
      tenantId: null,
      emailVerified: true,
      preferredLanguage: "fr-CM",
      notificationChannel: "EMAIL",
    },
    update: {
      passwordHash,
      role: Role.CANDIDATE,
      status: UserStatus.ACTIVE,
      tenantId: null,
    },
    select: { id: true, email: true },
  });
  console.log(`✓ Candidat : ${jean.email} / ${PWD}`);

  // ---- 3. Applications ----
  // Nettoyer applications précédentes de Jean pour idempotence
  const prevApps = await prisma.application.findMany({
    where: { userId: jean.id },
    select: { id: true },
  });
  if (prevApps.length > 0) {
    await prisma.interview.deleteMany({
      where: { applicationId: { in: prevApps.map((a) => a.id) } },
    });
  }
  await prisma.application.deleteMany({ where: { userId: jean.id } });

  const [appReceived, appShortlist, appInterview] = await Promise.all([
    prisma.application.create({
      data: {
        jobOfferId: offers[2].id, // Ingénieur Méthodes
        userId: jean.id,
        stage: AppStage.RECEIVED,
        coverLetter:
          "Madame, Monsieur, je vous adresse ma candidature pour le poste d'Ingénieur Méthodes…",
      },
      select: { id: true, stage: true },
    }),
    prisma.application.create({
      data: {
        jobOfferId: offers[1].id, // Chef de chantier Bonabéri
        userId: jean.id,
        stage: AppStage.SHORTLISTED,
        coverLetter:
          "Fort de 6 ans d'expérience sur des chantiers similaires à Douala…",
        notes: "Bon profil — à convoquer rapidement.",
      },
      select: { id: true, stage: true },
    }),
    prisma.application.create({
      data: {
        jobOfferId: offers[0].id, // Conducteur de Travaux Senior
        userId: jean.id,
        stage: AppStage.INTERVIEW,
        coverLetter:
          "Mon parcours en tant que conducteur de travaux sur 8 ans répond pleinement…",
        notes: "Entretien programmé demain — équipe technique présente.",
      },
      select: { id: true, stage: true },
    }),
  ]);
  console.log(
    `✓ 3 candidatures : ${appReceived.stage}, ${appShortlist.stage}, ${appInterview.stage}`,
  );

  // ---- 4. Interview demain 14h ----
  const tomorrow14h = new Date();
  tomorrow14h.setDate(tomorrow14h.getDate() + 1);
  tomorrow14h.setHours(14, 0, 0, 0);

  const interviewer = await prisma.user.findFirst({
    where: { tenantId: batimcam.id, role: Role.HR },
    select: { id: true, email: true },
  });

  const interview = await prisma.interview.create({
    data: {
      applicationId: appInterview.id,
      scheduledAt: tomorrow14h,
      duration: 60,
      interviewers: interviewer ? [interviewer.id] : [],
      mode: InterviewMode.VIDEO,
      location: "Lien Meet envoyé par email",
      completed: false,
    },
    select: { id: true, scheduledAt: true },
  });
  console.log(
    `✓ Entretien programmé : ${interview.scheduledAt.toISOString()} (60 min · VIDEO)`,
  );

  console.log("\n=== Compte de démo ===");
  console.log(`  Email    : jean.ngongo@email.cm`);
  console.log(`  Password : ${PWD}`);
  console.log(`  URL      : http://localhost:5000/cand/login`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
