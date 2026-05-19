import "./_guard-prod";
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

  // ---- 1. JobOffers (12 offres BatimCAM réalistes) ----
  const offerSeeds: Array<{
    reference: string;
    slug: string;
    title: string;
    department: string;
    contractType: ContractType;
    category: string;
    positions: number;
    summary: string;
    description: string;
    requirements: string;
    missions: string[];
    profileItems: string[];
    benefits: string[];
    experienceMin: number;
    region: string;
    salaryMin: bigint | null;
    salaryMax: bigint | null;
  }> = [
    {
      reference: "REC-2026-001",
      slug: "conducteur-de-travaux-senior",
      title: "Conducteur de Travaux Senior",
      department: "Direction Technique",
      contractType: ContractType.CDI,
      category: "Cadre",
      positions: 1,
      summary: "Pilotez nos chantiers Génie civil et bâtiment (>500 MFCFA).",
      description: "Pilotage de chantier BTP de grande envergure, encadrement de 30+ personnes, interface MOE/MOA.",
      requirements: "Bac+5 BTP, 8 ans d'expérience, maîtrise SYSCOHADA chantier, MS Project.",
      missions: [
        "Piloter le planning et le budget du chantier",
        "Encadrer une équipe de 30+ personnes",
        "Gérer les sous-traitants et fournisseurs",
        "Garantir la sécurité (Zero Accident)",
        "Reporter mensuellement au Directeur Travaux",
      ],
      profileItems: [
        "Bac+5 Ingénieur Génie Civil ou équivalent",
        "8+ ans d'expérience en pilotage chantier BTP",
        "Maîtrise MS Project, AutoCAD",
        "Connaissance SYSCOHADA appliquée chantier",
        "Permis B, mobilité régionale",
      ],
      benefits: [
        "Salaire +15% vs marché",
        "Voiture de fonction",
        "Mutuelle santé famille",
        "13ème mois + intéressement résultats",
        "Formation continue 40h/an",
      ],
      experienceMin: 8,
      region: "Yaoundé",
      salaryMin: 850_000n,
      salaryMax: 1_100_000n,
    },
    {
      reference: "REC-2026-002",
      slug: "chef-de-chantier-bonaberi",
      title: "Chef de chantier Bonabéri",
      department: "Production",
      contractType: ContractType.CDI,
      category: "ETAM",
      positions: 2,
      summary: "Supervision quotidienne d'un chantier de logements collectifs Bonabéri (Douala).",
      description: "Supervision quotidienne d'un chantier de logements collectifs.",
      requirements: "BTS Génie Civil, 5 ans d'expérience terrain.",
      missions: [
        "Animer les équipes ouvrières au quotidien",
        "Contrôler l'avancement et la qualité",
        "Faire respecter la sécurité",
        "Gérer le matériel et les approvisionnements",
        "Tenir le journal de chantier",
      ],
      profileItems: [
        "BTS Génie Civil ou équivalent",
        "5+ ans d'expérience comme chef d'équipe",
        "Leadership et sens du terrain",
        "Lecture de plans",
      ],
      benefits: [
        "Prime de chantier mensuelle",
        "Logement de fonction",
        "Mutuelle famille",
        "Formation HSE",
      ],
      experienceMin: 5,
      region: "Douala",
      salaryMin: 550_000n,
      salaryMax: 750_000n,
    },
    {
      reference: "REC-2026-003",
      slug: "ingenieur-methodes-btp",
      title: "Ingénieur Méthodes BTP",
      department: "Direction Technique",
      contractType: ContractType.CDI,
      category: "Cadre",
      positions: 1,
      summary: "Études techniques et optimisation des plannings chantiers.",
      description: "Études techniques, optimisation plannings et coûts.",
      requirements: "Ingénieur GC, 3 ans d'expérience, maîtrise MS Project.",
      missions: [
        "Établir les modes opératoires",
        "Optimiser les plannings (Gantt)",
        "Préparer les études d'exécution",
        "Suivre les coûts prévisionnels",
      ],
      profileItems: [
        "Bac+5 Ingénieur Génie Civil",
        "3+ ans en méthodes / études",
        "MS Project, AutoCAD, Revit",
      ],
      benefits: ["Salaire attractif", "Mutuelle famille", "Formation continue"],
      experienceMin: 3,
      region: "Yaoundé",
      salaryMin: 700_000n,
      salaryMax: 950_000n,
    },
    {
      reference: "REC-2026-004",
      slug: "directeur-travaux-adjoint",
      title: "Directeur Travaux Adjoint",
      department: "Direction Technique",
      contractType: ContractType.CDI,
      category: "Cadre",
      positions: 1,
      summary: "Bras droit du Directeur Travaux, supervision multi-chantiers.",
      description: "Coordination de 5 à 8 chantiers simultanés, validation budgets.",
      requirements: "10 ans d'expérience minimum BTP, gestion P&L projet.",
      missions: [
        "Coordonner 5-8 chantiers en parallèle",
        "Valider les budgets et plannings",
        "Représenter l'entreprise auprès des MOA",
        "Animer le comité technique hebdomadaire",
      ],
      profileItems: [
        "10+ ans d'expérience BTP confirmée",
        "Gestion P&L projet",
        "Anglais professionnel",
        "Leadership reconnu",
      ],
      benefits: [
        "Salaire ++ + bonus annuel",
        "Voiture haute gamme",
        "Mutuelle premium",
        "Stock-options (Phase 2)",
      ],
      experienceMin: 10,
      region: "Yaoundé",
      salaryMin: 1_200_000n,
      salaryMax: 1_500_000n,
    },
    {
      reference: "REC-2026-005",
      slug: "magasinier-chef",
      title: "Magasinier Chef · Yaoundé Nord",
      department: "Logistique",
      contractType: ContractType.CDI,
      category: "ETAM",
      positions: 1,
      summary: "Gestion du magasin central et flux sortants chantiers.",
      description: "Gestion stocks, inventaires, BL sortants.",
      requirements: "BTS Logistique, 4 ans d'expérience.",
      missions: [
        "Tenir l'inventaire en temps réel (T-ERP)",
        "Valider les BL entrants/sortants",
        "Organiser les inventaires trimestriels",
        "Suivre les pertes et anomalies",
      ],
      profileItems: [
        "BTS Logistique ou équivalent",
        "Rigueur, sens du contrôle",
        "Maîtrise Excel + ERP",
      ],
      benefits: ["Prime mensuelle", "Mutuelle famille", "Formation T-ERP"],
      experienceMin: 4,
      region: "Yaoundé",
      salaryMin: 400_000n,
      salaryMax: 550_000n,
    },
    {
      reference: "REC-2026-006",
      slug: "comptable-chantier",
      title: "Comptable chantier",
      department: "Direction Financière",
      contractType: ContractType.CDI,
      category: "ETAM",
      positions: 2,
      summary: "Suivi comptable des chantiers BatimCAM (analytique projet).",
      description: "Écritures SYSCOHADA, rapprochements bancaires, factures chantier.",
      requirements: "DUT/BTS Compta, 3 ans d'expérience, maîtrise SYSCOHADA.",
      missions: [
        "Saisir les écritures SYSCOHADA par chantier",
        "Rapprocher les comptes bancaires Afriland",
        "Préparer les déclarations CNPS/DGI",
        "Suivre les retenues à la source",
      ],
      profileItems: [
        "DUT/BTS Comptabilité",
        "3+ ans d'expérience comptable BTP",
        "Maîtrise SYSCOHADA, IRPP, CNPS",
      ],
      benefits: ["Salaire net négocié", "Mutuelle", "Formation T-ERP"],
      experienceMin: 3,
      region: "Yaoundé",
      salaryMin: 450_000n,
      salaryMax: 600_000n,
    },
    {
      reference: "REC-2026-007",
      slug: "chauffeur-poids-lourd",
      title: "Chauffeur Poids Lourd",
      department: "Logistique",
      contractType: ContractType.CDI,
      category: "OQ",
      positions: 4,
      summary: "Transport matériaux entre dépôt et chantiers.",
      description: "Conduite camion 38T, transport matériaux.",
      requirements: "Permis EC, 5 ans d'expérience PL, casier vierge.",
      missions: [
        "Conduire le camion 38T en toute sécurité",
        "Charger/décharger avec les magasiniers",
        "Tenir le carnet de bord du véhicule",
      ],
      profileItems: [
        "Permis EC en cours de validité",
        "5+ ans d'expérience PL",
        "Casier judiciaire vierge",
      ],
      benefits: ["Indemnité repas", "Mutuelle", "Heures supplémentaires payées"],
      experienceMin: 5,
      region: "Douala",
      salaryMin: 250_000n,
      salaryMax: 350_000n,
    },
    {
      reference: "REC-2026-008",
      slug: "ingenieur-travaux-btp-junior",
      title: "Ingénieur Travaux BTP — junior",
      department: "Direction Technique",
      contractType: ContractType.CDD,
      category: "Cadre",
      positions: 3,
      summary: "Encadrement de chantier sous tutorat d'un Senior — démarrage de carrière.",
      description: "CDD 18 mois renouvelable, encadrement progressif.",
      requirements: "Bac+5 GC fraîchement diplômé ou 1-2 ans d'exp.",
      missions: [
        "Assister un Conducteur Senior",
        "Suivi planning et budget chantier",
        "Reporting hebdomadaire MS Project",
      ],
      profileItems: [
        "Bac+5 Ingénieur GC (ENSP, ENSTP)",
        "0-2 ans d'expérience",
        "Anglais correct",
      ],
      benefits: [
        "Formation continue intensive",
        "Mentor dédié",
        "CDI à l'issue si performance",
      ],
      experienceMin: 0,
      region: "Yaoundé",
      salaryMin: 500_000n,
      salaryMax: 700_000n,
    },
    {
      reference: "REC-2026-009",
      slug: "responsable-qhse",
      title: "Responsable QHSE",
      department: "QHSE",
      contractType: ContractType.CDI,
      category: "Cadre",
      positions: 1,
      summary: "Pilotage politique sécurité Zero Accident sur tous nos chantiers.",
      description: "Démarche QHSE, audits, formations sécurité.",
      requirements: "Master QHSE, 7 ans d'expérience BTP.",
      missions: [
        "Animer la politique sécurité Zero Accident",
        "Mener les audits trimestriels sur chantier",
        "Former les chefs de chantier (causeries hebdo)",
        "Suivre les indicateurs HSE",
        "Représenter BatimCAM auprès des MOA",
      ],
      profileItems: [
        "Master QHSE",
        "7+ ans d'expérience BTP",
        "Certification ISO 45001 appréciée",
      ],
      benefits: ["Salaire ++ + bonus sécurité", "Voiture", "Mutuelle famille"],
      experienceMin: 7,
      region: "Yaoundé",
      salaryMin: 900_000n,
      salaryMax: 1_300_000n,
    },
    {
      reference: "REC-2026-010",
      slug: "secretaire-de-direction",
      title: "Secrétaire de Direction trilingue",
      department: "Secrétariat Général",
      contractType: ContractType.CDI,
      category: "ETAM",
      positions: 1,
      summary: "Assistante du Directeur Général, agenda et représentation.",
      description: "Gestion agenda DG, courrier, déplacements.",
      requirements: "BTS Secrétariat, FR/EN/ES, 5 ans d'expérience direction.",
      missions: [
        "Gérer l'agenda du DG",
        "Préparer les réunions et rapports",
        "Organiser les déplacements (CEMAC)",
        "Filtrer les communications",
      ],
      profileItems: [
        "BTS Secrétariat ou équivalent",
        "Trilingue FR/EN + ES un plus",
        "5+ ans en assistanat direction",
      ],
      benefits: ["Mutuelle famille", "Formation langues", "Tickets restaurant"],
      experienceMin: 5,
      region: "Yaoundé",
      salaryMin: 450_000n,
      salaryMax: 600_000n,
    },
    {
      reference: "REC-2026-011",
      slug: "stagiaire-genie-civil",
      title: "Stagiaire Génie Civil (3 à 6 mois)",
      department: "Direction Technique",
      contractType: ContractType.STAGE,
      category: "Stagiaire",
      positions: 5,
      summary: "Stages pré-emploi sur nos chantiers Yaoundé et Douala.",
      description: "Stage encadré sur un chantier réel, sujet de fin d'études.",
      requirements: "Étudiant Bac+4/+5 GC, lettre de motivation + sujet.",
      missions: [
        "Participer au suivi quotidien d'un chantier",
        "Réaliser un mini-projet d'optimisation",
        "Présenter ton travail en fin de stage",
      ],
      profileItems: [
        "Étudiant Bac+4/+5 Génie Civil",
        "Motivation forte pour le terrain",
        "Lettre de motivation + CV",
      ],
      benefits: [
        "Indemnité de stage attractive",
        "Logement à proximité chantier",
        "Possibilité CDI à l'issue",
      ],
      experienceMin: 0,
      region: "Yaoundé",
      salaryMin: 100_000n,
      salaryMax: 150_000n,
    },
    {
      reference: "REC-2026-012",
      slug: "electricien-chantier",
      title: "Électricien Chantier",
      department: "Production",
      contractType: ContractType.JOURNALIER,
      category: "OQ",
      positions: 6,
      summary: "Installation électrique des bâtiments en construction.",
      description: "Installations électriques BT/HT sur chantiers résidentiels.",
      requirements: "CAP/BEP Électricité, 3 ans d'expérience chantier, habilitation B1V.",
      missions: [
        "Poser les gaines et câbles",
        "Installer tableaux et points lumineux",
        "Tester la conformité",
      ],
      profileItems: [
        "CAP/BEP Électricité",
        "Habilitation B1V à jour",
        "3+ ans en chantier résidentiel",
      ],
      benefits: ["Tarif journalier attractif", "Indemnité repas", "EPI fournis"],
      experienceMin: 3,
      region: "Douala",
      salaryMin: 180_000n,
      salaryMax: 280_000n,
    },
  ];

  const offers = await Promise.all(
    offerSeeds.map((data) =>
      prisma.jobOffer.upsert({
        where: {
          tenantId_reference: {
            tenantId: batimcam.id,
            reference: data.reference,
          },
        },
        create: {
          tenantId: batimcam.id,
          reference: data.reference,
          slug: data.slug,
          title: data.title,
          department: data.department,
          contractType: data.contractType,
          category: data.category,
          positions: data.positions,
          summary: data.summary,
          description: data.description,
          requirements: data.requirements,
          missions: data.missions as Prisma.InputJsonValue,
          profileItems: data.profileItems as Prisma.InputJsonValue,
          benefits: data.benefits as Prisma.InputJsonValue,
          experienceMin: data.experienceMin,
          region: data.region,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          status: JobStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        update: {
          slug: data.slug,
          title: data.title,
          summary: data.summary,
          missions: data.missions as Prisma.InputJsonValue,
          profileItems: data.profileItems as Prisma.InputJsonValue,
          benefits: data.benefits as Prisma.InputJsonValue,
          experienceMin: data.experienceMin,
          region: data.region,
          positions: data.positions,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          status: JobStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      }),
    ),
  );
  console.log(`✓ ${offers.length} offres BatimCAM (upsert avec missions/profile/benefits)`);

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
