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
  Prisma,
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
      dateOfBirth: new Date("1988-04-12"),
      address: "Yaoundé · Mvog-Mbi",
      role: Role.CANDIDATE,
      status: UserStatus.ACTIVE,
      tenantId: null,
      emailVerified: true,
      preferredLanguage: "fr-CM",
      notificationChannel: "EMAIL",
      // Recherche
      desiredJob: "Conducteur de Travaux Senior",
      desiredContractType: ContractType.CDI,
      desiredLocation: "Yaoundé",
      desiredSalaryMin: 850_000n,
      desiredSalaryMax: 1_200_000n,
      availability: "Immédiate",
      mobilityDailyTravel: true,
      mobilityMissions: true,
      mobilityExpatriation: false,
      candidateSkills: [
        "Suivi de chantier",
        "AutoCAD",
        "MS Project",
        "Gestion équipes",
        "SYSCOHADA chantier",
      ],
      candidateLanguages: [
        { name: "Français", level: "natif" },
        { name: "Anglais", level: "intermediaire" },
      ] as Prisma.InputJsonValue,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
    update: {
      passwordHash,
      role: Role.CANDIDATE,
      status: UserStatus.ACTIVE,
      tenantId: null,
      dateOfBirth: new Date("1988-04-12"),
      address: "Yaoundé · Mvog-Mbi",
      desiredJob: "Conducteur de Travaux Senior",
      desiredContractType: ContractType.CDI,
      desiredLocation: "Yaoundé",
      desiredSalaryMin: 850_000n,
      desiredSalaryMax: 1_200_000n,
      availability: "Immédiate",
      mobilityDailyTravel: true,
      mobilityMissions: true,
      mobilityExpatriation: false,
      candidateSkills: [
        "Suivi de chantier",
        "AutoCAD",
        "MS Project",
        "Gestion équipes",
        "SYSCOHADA chantier",
      ],
      candidateLanguages: [
        { name: "Français", level: "natif" },
        { name: "Anglais", level: "intermediaire" },
      ] as Prisma.InputJsonValue,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
    select: { id: true, email: true },
  });
  console.log(`✓ Candidat : ${jean.email} / ${PWD}`);

  // Expériences + Formations Jean
  await prisma.candidateExperience.deleteMany({ where: { userId: jean.id } });
  await prisma.candidateFormation.deleteMany({ where: { userId: jean.id } });

  await prisma.candidateExperience.createMany({
    data: [
      {
        userId: jean.id,
        position: "Conducteur de Travaux",
        company: "SOGEA SATOM Cameroun",
        location: "Douala",
        startDate: new Date("2020-09-01"),
        endDate: null,
        isCurrent: true,
        description:
          "Pilotage chantier Pont sur le Wouri (250 MFCFA), équipe de 35 personnes, sous-traitants.",
        order: 0,
      },
      {
        userId: jean.id,
        position: "Chef de Chantier",
        company: "Razel-Bec Cameroun",
        location: "Yaoundé",
        startDate: new Date("2016-03-01"),
        endDate: new Date("2020-08-31"),
        isCurrent: false,
        description:
          "Encadrement quotidien chantier logements collectifs Bastos (180 logements).",
        order: 1,
      },
      {
        userId: jean.id,
        position: "Ingénieur travaux junior",
        company: "Arab Contractors",
        location: "Douala",
        startDate: new Date("2013-09-01"),
        endDate: new Date("2016-02-28"),
        isCurrent: false,
        description: "Études techniques, métré, suivi avancement.",
        order: 2,
      },
    ],
  });
  await prisma.candidateFormation.createMany({
    data: [
      {
        userId: jean.id,
        diploma: "Master 2 Génie Civil",
        institution: "ENSP Yaoundé",
        year: 2013,
        description: "Spécialité Bâtiment et travaux publics.",
        order: 0,
      },
      {
        userId: jean.id,
        diploma: "Licence Génie Civil",
        institution: "Université de Yaoundé I",
        year: 2010,
        description: null,
        order: 1,
      },
    ],
  });
  console.log("✓ Expériences (3) + Formations (2) de Jean");

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

  // ---- 5. JobMatches initiaux (fn 1.5) ----
  const { computeMatch } = await import("../src/lib/cand-matching");
  const fullJean = await prisma.user.findUnique({
    where: { id: jean.id },
    select: {
      candidateSkills: true,
      desiredLocation: true,
      desiredContractType: true,
      desiredSalaryMin: true,
      desiredSalaryMax: true,
    },
  });
  const jeanExperiences = await prisma.candidateExperience.findMany({
    where: { userId: jean.id },
    select: { startDate: true, endDate: true, isCurrent: true },
  });
  const experienceYears = Math.round(
    jeanExperiences.reduce((acc, e) => {
      const end = e.isCurrent ? new Date() : (e.endDate ?? e.startDate);
      return acc + (end.getTime() - e.startDate.getTime()) / (365.25 * 24 * 3600 * 1000);
    }, 0),
  );
  const allOffers = await prisma.jobOffer.findMany({
    where: { status: JobStatus.PUBLISHED },
    select: {
      id: true,
      title: true,
      region: true,
      contractType: true,
      category: true,
      description: true,
      requirements: true,
      salaryMin: true,
      salaryMax: true,
    },
  });
  await prisma.jobMatch.deleteMany({ where: { candidateId: jean.id } });
  const appliedIds = new Set([appReceived.id, appShortlist.id, appInterview.id]);
  const unappliedOffers = allOffers.filter((o) => {
    // Exclure les offres déjà postulées via applications
    return ![offers[0].id, offers[1].id, offers[2].id].includes(o.id);
  });
  // Inclure aussi les offres où Jean n'a pas postulé
  for (const offer of allOffers) {
    if ([offers[0].id, offers[1].id, offers[2].id].includes(offer.id)) continue;
    const result = computeMatch(
      {
        skills: fullJean!.candidateSkills,
        experienceYears,
        desiredLocation: fullJean!.desiredLocation,
        desiredContractType: fullJean!.desiredContractType,
        desiredSalaryMin: fullJean!.desiredSalaryMin,
        desiredSalaryMax: fullJean!.desiredSalaryMax,
      },
      offer,
    );
    await prisma.jobMatch.create({
      data: {
        candidateId: jean.id,
        jobOfferId: offer.id,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingRequirements: result.missingRequirements,
      },
    });
  }
  const matchesAbove75 = await prisma.jobMatch.count({
    where: { candidateId: jean.id, score: { gte: 75 } },
  });
  console.log(
    `✓ JobMatches calculés (${experienceYears} ans d'exp, ${matchesAbove75} match≥75 sur ${allOffers.length - 3} offres non postulées)`,
  );
  void appliedIds;
  void unappliedOffers;

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
