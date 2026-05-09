/**
 * T-ERP — Seed de données démo
 * Crée 1 tenant (BatimCAM SA) avec 12 profils utilisateurs, 6 chantiers, 5 offres d'emploi.
 *
 * Usage : pnpm db:seed
 */

import {
  PrismaClient,
  Role,
  ContractType,
  SiteType,
  SiteStatus,
  Plan,
  JobStatus,
  PayslipStatus,
  ObjectiveCategory,
  ObjectivePeriod,
  ObjectiveStatus,
  CashFlowType,
  BoardReportType,
  BoardReportStatus,
  ValidationType,
  ValidationStatus,
  ValidationPriority,
  ReportType,
  ReportStatus,
} from "@prisma/client";
import { buildDefaultWorkflow, approveCurrentStep } from "../src/lib/validation-workflow";
import { TEMPLATE_BLOCKS } from "../src/lib/report-blocks";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const PWD = "Demo2026!";

async function main() {
  console.log("🌱 Seeding T-ERP...");

  // Hash du mot de passe commun aux comptes démo
  const passwordHash = await bcrypt.hash(PWD, 12);

  // Nettoyer (dev seulement)
  await prisma.siteDecision.deleteMany();
  await prisma.siteAlert.deleteMany();
  await prisma.sitePhoto.deleteMany();
  await prisma.siteContract.deleteMany();
  await prisma.session.deleteMany();
  await prisma.customRole.deleteMany();
  await prisma.report.deleteMany();
  await prisma.delegation.deleteMany();
  await prisma.validation.deleteMany();
  await prisma.boardReport.deleteMany();
  await prisma.cashFlowProjection.deleteMany();
  await prisma.objective.deleteMany();
  await prisma.payslipLine.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobOffer.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // ===== TENANT =====
  // ===== TENANT MÈRE (BatimCAM SA = holding) =====
  const tenant = await prisma.tenant.create({
    data: {
      slug: "batimcam",
      name: "BatimCAM SA",
      taxId: "M102316152502L",
      cnpsId: "10-1000001",
      plan: Plan.BUSINESS,
      primaryColor: "#A855F7",
      isGroup: true, // Phase 2 / fn 1.2 — société mère du groupe
      sector: "Holding",
    },
  });
  console.log(`✓ Tenant mère : ${tenant.name} (${tenant.slug}) · isGroup=true`);

  // ===== FILIALES (Phase 2 / fn 1.2) =====
  const subsidiaries = await Promise.all([
    prisma.tenant.create({
      data: {
        slug: "batimcam-yaounde",
        name: "BatimCAM Yaoundé",
        taxId: "M102316152502L-Y",
        cnpsId: "10-1000002",
        plan: Plan.STANDARD,
        primaryColor: "#15803D",
        parentId: tenant.id,
        sector: "Bâtiment",
      },
    }),
    prisma.tenant.create({
      data: {
        slug: "batimcam-douala",
        name: "BatimCAM Douala",
        taxId: "M102316152502L-D",
        cnpsId: "10-1000003",
        plan: Plan.STANDARD,
        primaryColor: "#B45309",
        parentId: tenant.id,
        sector: "Routier",
      },
    }),
    prisma.tenant.create({
      data: {
        slug: "batimcam-logistique",
        name: "BatimCAM Logistique",
        taxId: "M102316152502L-L",
        cnpsId: "10-1000004",
        plan: Plan.STARTER,
        primaryColor: "#7C3AED",
        parentId: tenant.id,
        sector: "Logistique",
      },
    }),
  ]);
  const [yaounde, douala, logistique] = subsidiaries;
  console.log(`✓ 3 filiales créées : ${subsidiaries.map((s) => s.slug).join(", ")}`);

  // ===== UTILISATEURS (12 profils) =====
  const users = [
    {
      email: "albert@batimcam.cm",
      firstName: "Albert",
      lastName: "DAAYANG",
      role: Role.DG,
      employeeId: "EMP-2018-00001",
      position: "Directeur Général",
      category: "Cadre Sup HC",
      cnpsNumber: "10-1000001-A",
      hireDate: new Date("2018-03-02"),
    },
    {
      email: "marie@batimcam.cm",
      firstName: "Marie",
      lastName: "NGONO",
      role: Role.DAF,
      employeeId: "EMP-2019-00012",
      position: "Directrice Administrative et Financière",
      category: "Cadre 12",
      hireDate: new Date("2019-06-15"),
    },
    {
      email: "brigitte@batimcam.cm",
      firstName: "Brigitte",
      lastName: "FOTSO",
      role: Role.SG,
      position: "Secrétaire Générale",
      hireDate: new Date("2020-01-12"),
    },
    {
      email: "sandrine@batimcam.cm",
      firstName: "Sandrine",
      lastName: "ONANA",
      role: Role.HR,
      position: "Responsable RH",
      hireDate: new Date("2020-08-03"),
    },
    {
      email: "daniel@batimcam.cm",
      firstName: "Daniel",
      lastName: "ESSOMBA",
      role: Role.TECH_DIRECTOR,
      employeeId: "EMP-2020-00042",
      position: "Directeur Technique",
      category: "Cadre 12",
      hireDate: new Date("2020-04-20"),
    },
    {
      email: "paul@batimcam.cm",
      firstName: "Paul",
      lastName: "ETOUNDI",
      role: Role.WORKS_DIRECTOR,
      employeeId: "EMP-2021-00086",
      position: "Directeur de travaux Pont Mfoundi",
      category: "Cadre 11",
      hireDate: new Date("2021-09-01"),
    },
    {
      email: "samuel@batimcam.cm",
      firstName: "Samuel",
      lastName: "MBARGA",
      role: Role.WORKS_MANAGER,
      employeeId: "EMP-2022-00142",
      position: "Conducteur de travaux",
      category: "ETAM 8",
      hireDate: new Date("2022-02-14"),
    },
    {
      email: "jean@batimcam.cm",
      firstName: "Jean",
      lastName: "KAMGA",
      role: Role.SITE_MANAGER,
      employeeId: "EMP-2023-00203",
      position: "Chef de chantier Pont Mfoundi",
      category: "ETAM 7",
      hireDate: new Date("2023-05-22"),
    },
    {
      email: "lucas@batimcam.cm",
      firstName: "Lucas",
      lastName: "TIENTCHEU",
      role: Role.WAREHOUSE,
      employeeId: "EMP-2024-00318",
      position: "Magasinier central",
      category: "OS 5",
      hireDate: new Date("2024-01-08"),
    },
    {
      email: "olivier@batimcam.cm",
      firstName: "Olivier",
      lastName: "MEKA",
      role: Role.TENANT_ADMIN,
      position: "Administrateur informatique",
      hireDate: new Date("2022-11-15"),
    },
    {
      email: "fatima@batimcam.cm",
      firstName: "Fatima",
      lastName: "BELLO",
      role: Role.EMPLOYEE,
      employeeId: "EMP-2024-00422",
      position: "Assistante de direction",
      category: "ETAM 6",
      hireDate: new Date("2024-03-04"),
    },
    {
      email: "pierre@batimcam.cm",
      firstName: "Pierre",
      lastName: "ABEGA",
      role: Role.WORKER,
      employeeId: "JRN-2026-00472",
      position: "Maçon coffreur",
      category: "OQ 3",
      hireDate: new Date("2026-04-15"),
    },
  ];

  const createdUsers = [];
  for (const u of users) {
    const created = await prisma.user.create({
      data: {
        ...u,
        tenantId: tenant.id,
        passwordHash,
        emailVerified: true,
        phone: `+237 6 ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)}`,
        contractType: u.role === Role.WORKER ? ContractType.JOURNALIER : ContractType.CDI,
      },
    });
    createdUsers.push(created);
  }
  console.log(`✓ ${createdUsers.length} utilisateurs créés (mot de passe : ${PWD})`);

  // ===== SUPER-ADMIN SaaS (plateforme, pas de tenant) =====
  await prisma.user.create({
    data: {
      email: "superadmin@terp.cm",
      firstName: "Super",
      lastName: "ADMIN",
      role: Role.SUPER_ADMIN,
      passwordHash,
      emailVerified: true,
      tenantId: null,
      position: "Administrateur plateforme T-ERP",
    },
  });
  console.log(`✓ Super-admin SaaS créé (superadmin@terp.cm / ${PWD})`);

  // ===== CHANTIERS =====
  const sites = [
    {
      code: "CHT-2025-018",
      name: "Route Yaoundé–Nsimalen",
      client: "MINTP",
      type: SiteType.ROAD,
      region: "Centre",
      budget: 840_000_000n,
      progress: 82,
      margin: 23.4,
      status: SiteStatus.ACTIVE,
    },
    {
      code: "CHT-2025-024",
      name: "Immeuble R+8 Bastos",
      client: "SCI Bastos Plus",
      type: SiteType.BUILDING,
      region: "Centre",
      budget: 520_000_000n,
      progress: 64,
      margin: 20.1,
      status: SiteStatus.ACTIVE,
    },
    {
      code: "CHT-2025-031",
      name: "Pont Mfoundi",
      client: "Commune Yaoundé I",
      type: SiteType.CIVIL_ENG,
      region: "Centre",
      budget: 280_000_000n,
      progress: 78,
      margin: 6.0,
      status: SiteStatus.DRIFTING,
    },
    {
      code: "CHT-2026-003",
      name: "Lotissement Odza phase 2",
      client: "SOCOPRIM",
      type: SiteType.DEVELOPMENT,
      region: "Centre",
      budget: 1_200_000_000n,
      progress: 42,
      margin: 17.2,
      status: SiteStatus.ACTIVE,
    },
    {
      code: "CHT-2026-014",
      name: "Voirie Bonabéri",
      client: "Commune Douala IV",
      type: SiteType.ROAD,
      region: "Littoral",
      budget: 460_000_000n,
      progress: 8,
      margin: 18.5,
      status: SiteStatus.ACTIVE,
    },
    {
      code: "CHT-2026-018",
      name: "Forage AEP Mbalmayo",
      client: "CDE",
      type: SiteType.HYDRAULIC,
      region: "Centre",
      budget: 95_000_000n,
      progress: 55,
      margin: 22.1,
      status: SiteStatus.ACTIVE,
    },
  ];

  const dirTravaux = createdUsers.find((u) => u.role === Role.WORKS_DIRECTOR);

  // Phase 2 / fn 1.2 — distribution des 6 chantiers entre les 3 filiales (2 chacune).
  // BatimCAM SA reste une holding pure (0 chantier). L'API /api/dashboard/dg
  // utilise getTenantScopeIds() pour agréger sur la mère + ses enfants.
  const siteAssignments = [
    yaounde.id,    // CHT-2025-018  Route Yaoundé–Nsimalen (atypique pour Yaoundé mais OK pour la démo)
    yaounde.id,    // CHT-2025-024  Immeuble R+8 Bastos
    douala.id,     // CHT-2025-031  Pont Mfoundi (rebasculé Douala : génie civil)
    douala.id,     // CHT-2026-003  Lotissement Odza phase 2
    logistique.id, // CHT-2026-014  Voirie Bonabéri (Logistique gère la flotte travaux)
    logistique.id, // CHT-2026-018  Forage AEP Mbalmayo
  ];

  for (let i = 0; i < sites.length; i++) {
    const s = sites[i];
    await prisma.site.create({
      data: {
        ...s,
        tenantId: siteAssignments[i],
        startDate: new Date("2025-01-15"),
        plannedEndDate: new Date("2026-12-31"),
        managerId: dirTravaux?.id, // le manager reste un user de la holding (cross-tenant en démo)
      },
    });
  }
  console.log(`✓ ${sites.length} chantiers créés (2 par filiale)`);

  // ===== CONTRATS / PHOTOS / ALERTES (Phase 2 / Bloc 3 — fn 3.1) =====
  const allSites = await prisma.site.findMany({
    where: { tenantId: { in: [tenant.id, yaounde.id, douala.id, logistique.id] } },
    select: { id: true, code: true, name: true, client: true, status: true, budget: true, region: true },
  });
  // Coords approximatives par région
  const regionCoords: Record<string, { lat: number; lng: number }> = {
    Centre: { lat: 3.866667, lng: 11.516667 },
    Littoral: { lat: 4.05, lng: 9.7 },
    Ouest: { lat: 5.483333, lng: 10.416667 },
    Nord: { lat: 9.3, lng: 13.4 },
    Sud: { lat: 2.9, lng: 11.15 },
  };
  for (const s of allSites) {
    const coords = (s.region ? regionCoords[s.region] : null) || regionCoords.Centre;
    await prisma.site.update({
      where: { id: s.id },
      data: {
        lat: coords.lat + (Math.random() - 0.5) * 0.08,
        lng: coords.lng + (Math.random() - 0.5) * 0.08,
      },
    });
    const isPublic = /MINTP|MINHDU|FEICOM|Commune|CDE/i.test(s.client);
    const initialAmount = (s.budget * 9n) / 10n; // 10% d'avenants déjà passés
    const amendments = [
      { ref: `AV-${s.code}-01`, amount: ((s.budget - initialAmount) / 2n).toString(), date: "2025-09-15", reason: "Plus-value terrassements", validatedBy: "DG" },
      { ref: `AV-${s.code}-02`, amount: ((s.budget - initialAmount) / 2n).toString(), date: "2026-01-08", reason: "Avenant études complémentaires", validatedBy: "DG" },
    ];
    await prisma.siteContract.create({
      data: {
        siteId: s.id,
        reference: `MAR-${s.code}`,
        initialAmount,
        currentAmount: s.budget,
        amendments: amendments as object,
        guarantees: { caution: "5%", retention: "5%", penalties: "1‰/jour de retard plafonné à 10%" } as object,
        paymentTerms: isPublic ? "Mensuel · 60 jours fin de mois" : "Mensuel · 30 jours fin de mois",
        publicMarket: isPublic,
        procuringEntity: isPublic ? (s.client.includes("MINTP") ? "MINTP" : s.client.includes("Commune") ? "Commune" : "FEICOM") : null,
        signedAt: new Date("2025-01-10"),
      },
    });
    // 2-4 photos par chantier (placeholders SVG via picsum)
    const photoCount = 2 + Math.floor(Math.random() * 3);
    for (let p = 0; p < photoCount; p++) {
      await prisma.sitePhoto.create({
        data: {
          siteId: s.id,
          url: `https://picsum.photos/seed/${s.code}-${p}/640/420`,
          caption: ["Vue générale", "Avancement gros œuvre", "Pose ferraillage", "Coulage béton", "Réception lot"][p],
          takenAt: new Date(Date.now() - (photoCount - p) * 30 * 86_400_000),
          uploadedBy: dirTravaux?.id ?? createdUsers[0].id,
        },
      });
    }
  }
  console.log(`✓ ${allSites.length} contrats + photos seedés`);

  // 3 chantiers en alerte critique
  const driftingSite = allSites.find((s) => s.status === "DRIFTING");
  if (driftingSite) {
    await prisma.siteAlert.create({
      data: {
        siteId: driftingSite.id,
        severity: "CRITICAL",
        type: "BUDGET_OVERRUN",
        message: `Dépassement budgétaire estimé à 18 % sur ${driftingSite.name}. Marge prévue 12 % → réalisée 6 %.`,
      },
    });
    await prisma.siteAlert.create({
      data: {
        siteId: driftingSite.id,
        severity: "HIGH",
        type: "MARGIN_DROP",
        message: "Marge en chute libre depuis 3 mois — revue budgétaire urgente recommandée.",
      },
    });
  }
  // Quelques alertes mineures sur les autres
  for (const s of allSites.slice(0, 3)) {
    if (s.id === driftingSite?.id) continue;
    await prisma.siteAlert.create({
      data: {
        siteId: s.id,
        severity: "MEDIUM",
        type: "DELAY",
        message: "Retard de 5 jours sur le planning initial — à surveiller.",
      },
    });
  }
  console.log(`✓ Alertes chantiers créées`);

  // ===== OFFRES D'EMPLOI =====
  const jobs = [
    {
      reference: "REC-2026-008",
      title: "Ingénieur travaux BTP",
      department: "Direction Technique",
      contractType: ContractType.CDI,
      category: "Cadre",
      positions: 3,
      description: "Suivi de chantiers de construction d'immeubles R+5 à R+12 sur la région du Centre. Pilotage des équipes terrain, validation des situations mensuelles, interface MOA.",
      requirements: "Bac+5 Génie civil · 4 ans d'expérience minimum BTP · Maîtrise AutoCAD/Robot · Permis B",
      salaryMin: 1_200_000n,
      salaryMax: 1_800_000n,
      region: "Yaoundé",
      status: JobStatus.PUBLISHED,
      publishedAt: new Date("2026-04-15"),
    },
    {
      reference: "REC-2026-009",
      title: "Comptable chantier",
      department: "Comptabilité",
      contractType: ContractType.CDI,
      category: "ETAM",
      positions: 1,
      description: "Suivi comptable et budgétaire de chantiers. Saisie des écritures, rapprochements bancaires, situations chantier mensuelles.",
      requirements: "Bac+3 Comptabilité · 3 ans d'expérience BTP de préférence · Maîtrise SYSCOHADA · Sage ou équivalent",
      salaryMin: 450_000n,
      salaryMax: 650_000n,
      region: "Yaoundé",
      status: JobStatus.PUBLISHED,
      publishedAt: new Date("2026-04-22"),
    },
    {
      reference: "REC-2026-010",
      title: "Magasinier",
      department: "Magasin",
      contractType: ContractType.CDI,
      category: "OS",
      positions: 2,
      description: "Gestion des entrées-sorties matériaux et matériel sur chantier. Inventaires, bons de réception et de sortie.",
      requirements: "Bac · 2 ans en magasinage BTP · Connaissance Excel · Rigueur",
      salaryMin: 220_000n,
      salaryMax: 320_000n,
      region: "Yaoundé · Douala",
      status: JobStatus.PUBLISHED,
      publishedAt: new Date("2026-05-02"),
    },
    {
      reference: "REC-2026-011",
      title: "Conducteur engin pelle hydraulique",
      department: "Production",
      contractType: ContractType.CDI,
      category: "OQ",
      positions: 1,
      description: "Conduite de pelles hydrauliques CAT 320 pour terrassements et fondations.",
      requirements: "CACES R482 cat. B1 · 5 ans d'expérience · Permis poids lourd souhaité",
      salaryMin: 380_000n,
      salaryMax: 480_000n,
      region: "Multi-chantiers",
      status: JobStatus.PUBLISHED,
      publishedAt: new Date("2026-05-05"),
    },
    {
      reference: "REC-2026-012",
      title: "Maçon coffreur OQ",
      department: "Production",
      contractType: ContractType.CDD,
      category: "OQ",
      positions: 5,
      description: "Coffrage traditionnel et industrialisé pour ouvrages d'art et bâtiment. Mission 12 mois renouvelable.",
      requirements: "CAP/BEP maçonnerie · 3 ans d'expérience minimum · Travail en hauteur",
      salaryMin: 280_000n,
      salaryMax: 380_000n,
      region: "Yaoundé",
      status: JobStatus.PUBLISHED,
      publishedAt: new Date("2026-05-03"),
    },
  ];

  for (const j of jobs) {
    await prisma.jobOffer.create({
      data: {
        ...j,
        tenantId: tenant.id,
      },
    });
  }
  console.log(`✓ ${jobs.length} offres d'emploi publiées`);

  // ===== BULLETIN DE PAIE DÉMO (Albert DAAYANG · Septembre 2025) =====
  const dg = createdUsers.find((u) => u.role === Role.DG)!;

  const payslip = await prisma.payslip.create({
    data: {
      tenantId: tenant.id,
      userId: dg.id,
      period: new Date("2025-09-01"),
      paymentDate: new Date("2025-09-30"),
      paymentMode: "VIREMENT",
      grossAmount: 200_000n,
      taxableGross: 200_000n,
      netAmount: 200_000n,
      status: PayslipStatus.PAID,
      paidAt: new Date("2025-09-30"),
    },
  });

  // Lignes A001-A072 (selon le modèle ENSAH)
  const lines = [
    { code: "A001", label: "Salaire de base", quantity: 30, base: 6_667n, amountPlus: 200_000n, order: 1 },
    { code: "A045", label: "IND TRANSPORT", order: 2 },
    { code: "A050", label: "Salaire brut", amountPlus: 200_000n, order: 3 },
    { code: "A056", label: "IRPP", rate: 0, order: 10 },
    { code: "A057", label: "CAC", rate: 10.0, order: 11 },
    { code: "A058", label: "TC", order: 12 },
    { code: "A059", label: "RAV", order: 13 },
    { code: "A060", label: "CFS", rate: 1.0, order: 14 },
    { code: "A061", label: "CNPS", rate: 4.20, order: 15 },
    { code: "A062", label: "CFP", rate: 1.5, order: 16 },
    { code: "A063", label: "FNE", rate: 1.0, order: 17 },
    { code: "A070", label: "COT. PF", rate: 7.00, order: 20 },
    { code: "A071", label: "COT. PVID", rate: 4.20, order: 21 },
    { code: "A072", label: "COT. AT", rate: 5.00, order: 22 },
  ];

  for (const l of lines) {
    await prisma.payslipLine.create({
      data: { ...l, payslipId: payslip.id },
    });
  }
  console.log(`✓ Bulletin de paie démo créé pour ${dg.firstName} ${dg.lastName}`);

  // ===== OBJECTIFS DG 2026 (Phase 2 / fn 1.3) =====
  const yearStart = new Date("2026-01-01");
  const yearEnd = new Date("2026-12-31");
  const objectives = [
    {
      category: ObjectiveCategory.FINANCIAL,
      title: "CA annuel 2026",
      description: "Atteindre 4 Md FCFA de chiffre d'affaires consolidé sur l'exercice.",
      targetValue: 4_000_000_000,
      actualValue: 2_840_000_000,
      unit: "FCFA",
      weight: 5,
      status: ObjectiveStatus.IN_PROGRESS,
    },
    {
      category: ObjectiveCategory.FINANCIAL,
      title: "Marge moyenne consolidée",
      description: "Marge brute moyenne supérieure à 22 % sur l'ensemble des chantiers.",
      targetValue: 22,
      actualValue: 18.4,
      unit: "%",
      weight: 4,
      status: ObjectiveStatus.AT_RISK,
    },
    {
      category: ObjectiveCategory.HR,
      title: "Effectif total",
      description: "Recruter pour atteindre 520 collaborateurs (vs 487 en début d'année).",
      targetValue: 520,
      actualValue: 487,
      unit: "employés",
      weight: 3,
      status: ObjectiveStatus.IN_PROGRESS,
    },
    {
      category: ObjectiveCategory.COMMERCIAL,
      title: "Nouveaux contrats signés",
      description: "Signer 15 nouveaux marchés (publics ou privés) sur 2026.",
      targetValue: 15,
      actualValue: 12,
      unit: "contrats",
      weight: 4,
      status: ObjectiveStatus.IN_PROGRESS,
    },
    {
      category: ObjectiveCategory.HSE,
      title: "Jours sans accident",
      description: "Maintenir un compteur sans accident du travail sur l'année entière.",
      targetValue: 365,
      actualValue: 142,
      unit: "jours",
      weight: 5,
      status: ObjectiveStatus.IN_PROGRESS,
    },
    {
      category: ObjectiveCategory.STRATEGIC,
      title: "Certifications qualité",
      description: "Obtenir ISO 9001 + qualibat (2 certifications stratégiques).",
      targetValue: 2,
      actualValue: 1,
      unit: "certifications",
      weight: 3,
      status: ObjectiveStatus.IN_PROGRESS,
    },
  ];

  for (const o of objectives) {
    await prisma.objective.create({
      data: {
        ...o,
        tenantId: tenant.id,
        ownerId: dg.id,
        period: ObjectivePeriod.ANNUAL,
        year: 2026,
        startDate: yearStart,
        endDate: yearEnd,
      },
    });
  }
  console.log(`✓ ${objectives.length} objectifs DG 2026 créés`);

  // ===== TRÉSORERIE PRÉVISIONNELLE 12 SEMAINES (Phase 2 / fn 1.4) =====
  const now = new Date();
  const seedDate = (offset: number) => {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    return d;
  };

  const cashflows: Array<{
    type: CashFlowType;
    category: string;
    label: string;
    amount: bigint;
    expectedDate: Date;
    probability: number;
    sourceType: string;
  }> = [];

  // 1) Encaissements clients étalés (12 lignes, prob variable selon client)
  const clientPayments = [
    { client: "MINTP", amount: 142_000_000n, week: 0, prob: 95 },
    { client: "SCI Bastos Plus", amount: 68_000_000n, week: 1, prob: 90 },
    { client: "Commune Yaoundé I", amount: 38_500_000n, week: 1, prob: 70 },
    { client: "MINTP", amount: 95_000_000n, week: 2, prob: 80 },
    { client: "SOCOPRIM", amount: 120_000_000n, week: 3, prob: 85 },
    { client: "Commune Douala IV", amount: 54_000_000n, week: 4, prob: 60 },
    { client: "MINTP", amount: 85_000_000n, week: 5, prob: 75 },
    { client: "CDE", amount: 28_000_000n, week: 6, prob: 90 },
    { client: "SCI Bastos Plus", amount: 92_000_000n, week: 6, prob: 85 },
    { client: "MINTP", amount: 110_000_000n, week: 8, prob: 65 },
    { client: "SOCOPRIM", amount: 75_000_000n, week: 10, prob: 70 },
    { client: "Commune Yaoundé I", amount: 42_000_000n, week: 11, prob: 55 },
  ];
  for (const p of clientPayments) {
    cashflows.push({
      type: CashFlowType.INCOME,
      category: "CLIENT_PAYMENT",
      label: `Encaissement ${p.client}`,
      amount: p.amount,
      expectedDate: seedDate(p.week * 7 + 3),
      probability: p.prob,
      sourceType: "INVOICE",
    });
  }

  // 2) Décaissements fournisseurs (8 lignes)
  const suppliers = [
    { name: "CIMENCAM", amount: 38_500_000n, week: 1 },
    { name: "Sotrabat (acier)", amount: 22_000_000n, week: 2 },
    { name: "Total Carburants", amount: 18_500_000n, week: 2 },
    { name: "CCBM (béton)", amount: 27_000_000n, week: 4 },
    { name: "Lubrifiants Cameroun", amount: 12_000_000n, week: 5 },
    { name: "CIMENCAM", amount: 41_000_000n, week: 7 },
    { name: "Loueur Bobcat", amount: 14_500_000n, week: 8 },
    { name: "Sotrabat (acier)", amount: 24_000_000n, week: 10 },
  ];
  for (const s of suppliers) {
    cashflows.push({
      type: CashFlowType.EXPENSE,
      category: "SUPPLIER",
      label: `Règlement ${s.name}`,
      amount: s.amount,
      expectedDate: seedDate(s.week * 7 + 5),
      probability: 100,
      sourceType: "PURCHASE_ORDER",
    });
  }

  // 3) Salaires + charges sociales (3 mois × 186 M)
  for (let m = 0; m < 3; m++) {
    const payDate = new Date(now.getFullYear(), now.getMonth() + m, 5);
    cashflows.push({
      type: CashFlowType.EXPENSE,
      category: "SALARY",
      label: `Paie nette ${payDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
      amount: 186_000_000n,
      expectedDate: payDate,
      probability: 100,
      sourceType: "PAYROLL",
    });
  }

  // 4) Échéances fiscales (3 mois × TVA + CNPS + IRPP au 15)
  const taxes = [
    { code: "TAX_VAT", label: "TVA mensuelle", amount: 28_400_000n },
    { code: "TAX_CNPS", label: "Cotisations CNPS", amount: 28_100_000n },
    { code: "TAX_IRPP", label: "IRPP retenu", amount: 14_200_000n },
  ];
  for (let m = 0; m < 3; m++) {
    const due = new Date(now.getFullYear(), now.getMonth() + m, 15);
    for (const t of taxes) {
      cashflows.push({
        type: CashFlowType.EXPENSE,
        category: t.code,
        label: `${t.label} ${due.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
        amount: t.amount,
        expectedDate: due,
        probability: 100,
        sourceType: "TAX",
      });
    }
  }

  // 5) Quelques entrées "autres"
  cashflows.push({
    type: CashFlowType.INCOME,
    category: "OTHER",
    label: "Loyer matériel à filiale Logistique",
    amount: 8_500_000n,
    expectedDate: seedDate(20),
    probability: 100,
    sourceType: "MANUAL",
  });
  cashflows.push({
    type: CashFlowType.INCOME,
    category: "OTHER",
    label: "Intérêts placement BICEC",
    amount: 3_200_000n,
    expectedDate: seedDate(45),
    probability: 100,
    sourceType: "MANUAL",
  });

  await prisma.cashFlowProjection.createMany({
    data: cashflows.map((c) => ({ ...c, tenantId: tenant.id })),
  });
  console.log(`✓ ${cashflows.length} projections de trésorerie créées`);

  // ===== RAPPORTS CONSEIL D'ADMINISTRATION (Phase 2 / fn 1.5) =====
  const reportPeriods = [
    {
      period: "2026-02",
      boardDate: new Date("2026-03-15"),
      ca: 720_000_000,
      margin: 17.8,
      treasury: 380_000_000,
      sites: 4,
      synthesis:
        "Bonne dynamique commerciale en février : 3 nouveaux contrats signés. Vigilance sur la marge du Pont Mfoundi.",
    },
    {
      period: "2026-03",
      boardDate: new Date("2026-04-15"),
      ca: 1_980_000_000,
      margin: 18.1,
      treasury: 395_000_000,
      sites: 5,
      synthesis:
        "T1 clos avec un CA cumulé de 1,98 Md FCFA, conforme au prévisionnel. Marge en légère progression vs T4 2025.",
    },
    {
      period: "2026-04",
      boardDate: new Date("2026-05-15"),
      ca: 2_580_000_000,
      margin: 18.4,
      treasury: 412_000_000,
      sites: 6,
      synthesis:
        "Mois d'avril solide. Lancement opérationnel Voirie Bonabéri (CHT-2026-014). Deux dérives à arbitrer en CA.",
    },
  ];
  for (const r of reportPeriods) {
    await prisma.boardReport.create({
      data: {
        tenantId: tenant.id,
        authorId: dg.id,
        type: BoardReportType.MONTHLY,
        period: r.period,
        boardDate: r.boardDate,
        status: BoardReportStatus.ARCHIVED,
        chapters: {
          synthesis: true,
          financial: true,
          operational: true,
          commercial: true,
          hr: true,
          hse: true,
          strategic: true,
          risks: true,
          outlook: true,
        },
        comments: {
          synthesis: r.synthesis,
          financial: "P&L conforme · BFR maîtrisé · trésorerie au-dessus du seuil de confort.",
          operational: "Avancements globalement à temps. Suivi renforcé sur les chantiers en dérive.",
          commercial: "Pipeline qualifié de 1,1 Md FCFA. Carnet supérieur à l'année dernière.",
          hr: "Effectif stable, absentéisme en baisse, pas de risque social majeur.",
          hse: "Pas d'accident grave sur la période. Audit CARSAT planifié en T2.",
          strategic: "Avancement des certifications ISO 9001 et Qualibat dans le calendrier.",
          risks: "Surveillance des délais de paiement publics. DSO en hausse à 62 j.",
          outlook: "Prochaine étape : sécuriser la trésorerie de juin (échéances fiscales + paie).",
        },
        data: {
          generatedAt: new Date().toISOString(),
          kpis: {
            revenue: r.ca,
            margin: r.margin,
            treasury: r.treasury,
            activeSites: r.sites,
          },
        },
        pdfUrl: null,
        sentTo: [
          { email: "president.ca@batimcam.cm", name: "Président du Conseil", sentAt: r.boardDate.toISOString() },
          { email: "tresorier@batimcam.cm", name: "Trésorier", sentAt: r.boardDate.toISOString() },
        ],
      },
    });
  }
  console.log(`✓ ${reportPeriods.length} rapports CA archivés créés`);

  // ===== CONVERSATION DÉMO =====
  const conv = await prisma.conversation.create({
    data: {
      tenantId: tenant.id,
      name: "Pont Mfoundi · équipe",
      isGroup: true,
      lastMessageAt: new Date(),
    },
  });

  const equipeRoles: Role[] = [Role.DG, Role.TECH_DIRECTOR, Role.WORKS_DIRECTOR, Role.SITE_MANAGER];
  const equipe = createdUsers.filter((u) => equipeRoles.includes(u.role));

  for (const u of equipe) {
    await prisma.conversationParticipant.create({
      data: { conversationId: conv.id, userId: u.id },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId: equipe[3].id, // chef chantier
      content: "Bonjour, le coulage de la pile centrale est prévu pour mardi 12 mai. Préparation OK ce matin, équipe au complet.",
    },
  });
  await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId: equipe[2].id, // dir travaux
      content: "Merci Jean. MOA prévenu, ils seront sur site à 6h30. Penser à confirmer la livraison béton la veille.",
    },
  });
  console.log(`✓ Conversation démo créée`);

  // ===== VALIDATIONS DG (Phase 2 / Bloc 2 — fn 2.1) =====
  const dgUser = createdUsers.find((u) => u.role === Role.DG)!;
  const dafUser = createdUsers.find((u) => u.role === Role.DAF)!;
  const hrUser = createdUsers.find((u) => u.role === Role.HR);
  const techDir = createdUsers.find((u) => u.role === Role.TECH_DIRECTOR);
  const accountant = createdUsers.find((u) => u.role === Role.ACCOUNTANT);
  const initiator = accountant ?? dafUser;

  const dgName = `${dgUser.firstName} ${dgUser.lastName}`;
  const dafName = `${dafUser.firstName} ${dafUser.lastName}`;
  const hrName = hrUser ? `${hrUser.firstName} ${hrUser.lastName}` : "RH";

  // Calcule un workflow pour lequel les étapes amont sont déjà approuvées,
  // et l'étape DG est PENDING (d'où le badge "7" dans la sidebar).
  function workflowAtDgStep(type: ValidationType, dafApproved = true) {
    let wf = buildDefaultWorkflow(type);
    // Approuver toutes les étapes sauf la dernière (DG)
    while (wf.steps.findIndex((s) => s.status === "PENDING") < wf.steps.length - 1) {
      const idx = wf.steps.findIndex((s) => s.status === "PENDING");
      const step = wf.steps[idx];
      const approver = step.role === "HR" ? { id: hrUser?.id ?? dafUser.id, name: hrName } : { id: dafUser.id, name: dafName };
      const result = approveCurrentStep(wf, approver);
      wf = result.workflow;
      // Backdate les décisions
      wf.steps[idx].decidedAt = new Date(Date.now() - (wf.steps.length - idx) * 86400000).toISOString();
    }
    return wf;
  }

  const pendingValidations = [
    {
      type: ValidationType.PAYROLL,
      reference: "VAL-2026-0042",
      title: "Paie mensuelle Avril 2026 — 487 employés",
      description: "Bulletins calculés et validés N1+N2. Total brut : 142 000 000 FCFA / Net : 96 240 000 FCFA.",
      amount: BigInt(96_240_000),
      priority: ValidationPriority.HIGH,
    },
    {
      type: ValidationType.CONTRACT,
      reference: "VAL-2026-0043",
      title: "Avenant Pont Mfoundi — Plus-value travaux supplémentaires",
      description: "Augmentation de l'enveloppe de 18 M FCFA pour terrassement complémentaire.",
      amount: BigInt(18_000_000),
      priority: ValidationPriority.NORMAL,
    },
    {
      type: ValidationType.PURCHASE,
      reference: "VAL-2026-0044",
      title: "BC Carburant Avril 2026 — Total Cameroun",
      description: "Approvisionnement gazole 45 000 L pour parc engins (4 chantiers).",
      amount: BigInt(28_500_000),
      priority: ValidationPriority.NORMAL,
    },
    {
      type: ValidationType.HIRING,
      reference: "VAL-2026-0045",
      title: "Embauche 3 ingénieurs travaux BTP",
      description: "Recrutement validé par RH pour démarrage chantier Bonabéri.",
      priority: ValidationPriority.NORMAL,
    },
    {
      type: ValidationType.PURCHASE,
      reference: "VAL-2026-0046",
      title: "BC Pelle hydraulique CAT 320D",
      description: "Acquisition matériel TP, fournisseur Tractafric.",
      amount: BigInt(85_000_000),
      priority: ValidationPriority.HIGH,
    },
    {
      type: ValidationType.CONTRACT,
      reference: "VAL-2026-0047",
      title: "Marché Bonabéri — Lot terrassement",
      description: "Adjudication du lot terrassement à BatimCAM Douala.",
      amount: BigInt(120_000_000),
      priority: ValidationPriority.URGENT,
      dueDate: new Date(Date.now() + 2 * 86400000),
    },
    {
      type: ValidationType.LEAVE,
      reference: "VAL-2026-0048",
      title: "Congé exceptionnel — M. BELLO Issa (chef chantier)",
      description: "12 jours ouvrés en mai pour raisons familiales.",
      priority: ValidationPriority.LOW,
    },
  ];

  for (const v of pendingValidations) {
    const wf = workflowAtDgStep(v.type);
    const currentStep = wf.steps.find((s) => s.status === "PENDING");
    await prisma.validation.create({
      data: {
        tenantId: tenant.id,
        type: v.type,
        reference: v.reference,
        title: v.title,
        description: v.description,
        amount: v.amount ?? null,
        priority: v.priority,
        initiatorId: initiator.id,
        currentStep: currentStep?.key ?? null,
        currentApproverId: dgUser.id,
        workflow: wf as any,
        status: ValidationStatus.PENDING,
        dueDate: (v as any).dueDate ?? null,
      },
    });
  }
  console.log(`✓ ${pendingValidations.length} validations en attente créées`);

  // 30 validations historiques (validées/rejetées dans les 60 derniers jours)
  const histTypes: ValidationType[] = [
    ValidationType.PAYROLL,
    ValidationType.EXPENSE,
    ValidationType.PURCHASE,
    ValidationType.HIRING,
    ValidationType.CONTRACT,
    ValidationType.LEAVE,
  ];
  for (let i = 1; i <= 30; i++) {
    const t = histTypes[i % histTypes.length];
    const isApproved = i % 6 !== 0; // ~5/6 approuvées
    let wf = buildDefaultWorkflow(t);
    // Approuver/rejeter toutes les étapes
    let approver = { id: hrUser?.id ?? dafUser.id, name: hrName };
    while (wf.steps.findIndex((s) => s.status === "PENDING") >= 0) {
      const step = wf.steps.find((s) => s.status === "PENDING")!;
      approver = step.role === "HR" ? { id: hrUser?.id ?? dafUser.id, name: hrName }
        : step.role === "DAF" ? { id: dafUser.id, name: dafName }
        : { id: dgUser.id, name: dgName };
      const isLast = wf.steps.filter((s) => s.status === "PENDING").length === 1;
      if (!isApproved && isLast) {
        wf = { steps: wf.steps.map((s) => s.status === "PENDING" ? { ...s, status: "REJECTED" as const, decidedById: approver.id, decidedByName: approver.name, decidedAt: new Date().toISOString(), comment: "Budget insuffisant" } : s) };
        break;
      }
      const r = approveCurrentStep(wf, approver);
      wf = r.workflow;
    }
    const daysAgo = (i * 2) % 60 + 1;
    const decisionAt = new Date(Date.now() - daysAgo * 86400000);
    await prisma.validation.create({
      data: {
        tenantId: tenant.id,
        type: t,
        reference: `VAL-2026-${String(1000 + i).padStart(4, "0")}`,
        title: `${t === "PAYROLL" ? "Paie" : t === "EXPENSE" ? "Dépense" : t === "PURCHASE" ? "BC" : t === "HIRING" ? "Embauche" : t === "CONTRACT" ? "Marché" : "Congé"} historique #${i}`,
        description: `Demande historique pour test (J-${daysAgo}).`,
        amount: t === "LEAVE" || t === "HIRING" ? null : BigInt(Math.floor(Math.random() * 50_000_000) + 1_000_000),
        priority: ValidationPriority.NORMAL,
        initiatorId: initiator.id,
        workflow: wf as any,
        status: isApproved ? ValidationStatus.APPROVED : ValidationStatus.REJECTED,
        decidedById: approver.id,
        decisionAt,
        decisionReason: isApproved ? null : "Budget insuffisant",
        createdAt: new Date(decisionAt.getTime() - 3 * 86400000),
      },
    });
  }
  console.log(`✓ 30 validations historiques créées`);

  // 2 délégations actives
  if (techDir) {
    await prisma.delegation.create({
      data: {
        tenantId: tenant.id,
        fromUserId: dgUser.id,
        toUserId: dafUser.id,
        types: [ValidationType.EXPENSE, ValidationType.PURCHASE],
        maxAmount: BigInt(20_000_000),
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 86400000),
        active: true,
        reason: "Couverture pendant les déplacements DG (mai-juin 2026)",
      },
    });
    await prisma.delegation.create({
      data: {
        tenantId: tenant.id,
        fromUserId: dgUser.id,
        toUserId: techDir.id,
        types: [ValidationType.HIRING, ValidationType.CONTRACT],
        maxAmount: BigInt(50_000_000),
        startDate: new Date(),
        endDate: null, // permanente
        active: true,
        reason: "Délégation permanente technique",
      },
    });
    console.log(`✓ 2 délégations actives créées`);
  }

  // ===== RAPPORTS CONSOLIDÉS (Phase 2 / Bloc 2 — fn 2.2) =====
  // 4 rapports historiques + 4 trimestriels + 2 planifiés
  const reportSnapshot = {
    generatedAt: new Date().toISOString(),
    period: "—",
    scope: "GROUP" as const,
    kpis: {
      revenue: 1_650_000_000,
      margin: 17.4,
      treasury: 482_000_000,
      activeSites: 5,
      headcount: 12,
      backlog: 3_200_000_000,
    },
    topSites: [
      { code: "BTM-DLA-01", name: "Pont sur le Wouri (lot 2)", progress: 62, margin: 18.4, budget: "1450000000" },
      { code: "BTM-YDE-01", name: "Tour Mfoundi (gros œuvre)", progress: 48, margin: 16.1, budget: "980000000" },
      { code: "BTM-LOG-01", name: "Plateforme logistique Bonabéri", progress: 75, margin: 22.0, budget: "650000000" },
      { code: "BTM-YDE-02", name: "Réhabilitation lycée bilingue", progress: 88, margin: 14.5, budget: "320000000" },
      { code: "BTM-DLA-02", name: "Voirie quartier Bonamoussadi", progress: 35, margin: 12.8, budget: "240000000" },
    ],
    subsidiaries: [
      { name: "BatimCAM Yaoundé", revenue: 720_000_000, margin: 16.3, sites: 2 },
      { name: "BatimCAM Douala", revenue: 615_000_000, margin: 17.8, sites: 2 },
      { name: "BatimCAM Logistique", revenue: 315_000_000, margin: 22.0, sites: 1 },
    ],
  };

  // 4 mensuels (3 derniers mois + courant)
  const months = [
    { period: "2026-01", title: "Tableau de bord stratégique — Janvier 2026" },
    { period: "2026-02", title: "Tableau de bord stratégique — Février 2026" },
    { period: "2026-03", title: "Tableau de bord stratégique — Mars 2026" },
    { period: "2026-04", title: "Tableau de bord stratégique — Avril 2026" },
  ];
  for (const m of months) {
    await prisma.report.create({
      data: {
        tenantId: tenant.id,
        authorId: dgUser.id,
        type: ReportType.MONTHLY_DASHBOARD,
        title: m.title,
        period: m.period,
        parameters: { scope: "GROUP", signature: "Albert DAAYANG, DG" } as object,
        blocks: TEMPLATE_BLOCKS.MONTHLY_DASHBOARD as object,
        data: reportSnapshot as object,
        status: ReportStatus.PUBLISHED,
        recipients: [
          { email: "ca@batimcam.cm", name: "Conseil d'administration", sentAt: new Date().toISOString() },
        ] as object,
        generatedAt: new Date(`${m.period}-05`),
      },
    });
  }

  // 4 trimestrielles (4 derniers trimestres)
  const quarters = [
    { period: "2025-T1", title: "Note d'activité — T1 2025" },
    { period: "2025-T2", title: "Note d'activité — T2 2025" },
    { period: "2025-T3", title: "Note d'activité — T3 2025" },
    { period: "2025-T4", title: "Note d'activité — T4 2025" },
  ];
  for (const q of quarters) {
    await prisma.report.create({
      data: {
        tenantId: tenant.id,
        authorId: dgUser.id,
        type: ReportType.QUARTERLY_NOTE,
        title: q.title,
        period: q.period,
        parameters: { scope: "GROUP" } as object,
        blocks: TEMPLATE_BLOCKS.QUARTERLY_NOTE as object,
        data: reportSnapshot as object,
        status: ReportStatus.PUBLISHED,
        recipients: [
          { email: "uba@partenaires.cm", name: "UBA Cameroun", sentAt: new Date().toISOString() },
          { email: "bicec@partenaires.cm", name: "BICEC", sentAt: new Date().toISOString() },
        ] as object,
        generatedAt: new Date(),
      },
    });
  }

  // 2 rapports planifiés
  await prisma.report.create({
    data: {
      tenantId: tenant.id,
      authorId: dgUser.id,
      type: ReportType.EXECUTIVE_SUMMARY,
      title: "Synthèse exécutive hebdomadaire",
      period: "scheduled",
      parameters: { scope: "GROUP" } as object,
      blocks: TEMPLATE_BLOCKS.EXECUTIVE_SUMMARY as object,
      data: {} as object,
      status: ReportStatus.SCHEDULED,
      scheduledRule: "WEEKLY_MONDAY_06",
      recipients: [
        { email: "albert@batimcam.cm", name: "Albert DAAYANG" },
        { email: "marie@batimcam.cm", name: "Marie NGONO (DAF)" },
        { email: "daniel@batimcam.cm", name: "Daniel ESSOMBA (Dir. technique)" },
      ] as object,
    },
  });
  await prisma.report.create({
    data: {
      tenantId: tenant.id,
      authorId: dgUser.id,
      type: ReportType.MONTHLY_DASHBOARD,
      title: "Synthèse mensuelle CA",
      period: "scheduled",
      parameters: { scope: "GROUP" } as object,
      blocks: TEMPLATE_BLOCKS.MONTHLY_DASHBOARD as object,
      data: {} as object,
      status: ReportStatus.SCHEDULED,
      scheduledRule: "MONTHLY_FIRST_08",
      recipients: [{ email: "ca@batimcam.cm", name: "Conseil d'administration" }] as object,
    },
  });
  console.log(`✓ 8 rapports historiques + 2 planifiés créés`);

  // ===== SESSIONS ACTIVES (Phase 2 / Bloc 2 — fn 2.4) =====
  // 20 sessions simulées (IPs variées, dont 2 suspectes)
  const ipPool = ["41.205.18.42", "154.0.5.111", "92.184.108.5", "185.220.101.8", "154.0.5.99", "169.255.58.220"];
  const uaPool = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) Safari/17.2",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1) Safari/17.1",
  ];
  const locPool = ["Yaoundé · Cameroun", "Douala · Cameroun", "Bafoussam · Cameroun", "Paris · France", "Tor Exit Node"];
  const sessionUsers = createdUsers.slice(0, 12);
  for (let i = 0; i < 20; i++) {
    const u = sessionUsers[i % sessionUsers.length];
    const ip = ipPool[i % ipPool.length];
    const loc = locPool[i % locPool.length];
    const suspicious = i === 4 || i === 17; // 2 sessions suspectes
    await prisma.session.create({
      data: {
        userId: u.id,
        ipAddress: ip,
        userAgent: uaPool[i % uaPool.length],
        location: suspicious ? "Tor Exit Node" : loc,
        suspicious,
        lastActivityAt: new Date(Date.now() - i * 60_000),
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });
  }
  console.log(`✓ 20 sessions actives créées (dont 2 suspectes)`);

  // 100 entrées audit_log historiques (60 derniers jours)
  const actions = [
    "user.login", "user.logout", "validation.approve", "validation.reject",
    "site.update", "payslip.validate", "report.generate", "report.send",
    "config.modules.update", "config.paie.update", "user.create", "user.suspend",
  ];
  const auditUsers = createdUsers.slice(0, 8);
  for (let i = 0; i < 100; i++) {
    const u = auditUsers[i % auditUsers.length];
    const action = actions[i % actions.length];
    const daysAgo = Math.floor(Math.random() * 60);
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: u.id,
        action,
        entityType: action.split(".")[0],
        entityId: `seed-${i}`,
        ipAddress: ipPool[i % ipPool.length],
        metadata: { seeded: true, idx: i },
        createdAt: new Date(Date.now() - daysAgo * 86_400_000 - Math.random() * 86_400_000),
      },
    });
  }
  console.log(`✓ 100 entrées audit log historiques créées`);

  // 2 rôles personnalisés
  await prisma.customRole.create({
    data: {
      tenantId: tenant.id,
      name: "Validateur dérogatoire",
      basedOn: Role.DAF,
      permissions: {
        validations: ["read", "approve"],
        sites: ["read"],
        payroll: ["read"],
      } as object,
      userCount: 1,
    },
  });
  await prisma.customRole.create({
    data: {
      tenantId: tenant.id,
      name: "Auditeur externe",
      basedOn: Role.ACCOUNTANT,
      permissions: {
        accounting: ["read"],
        finances: ["read"],
        reports: ["read"],
        audit: ["read"],
      } as object,
      userCount: 0,
    },
  });
  console.log(`✓ 2 rôles personnalisés créés`);

  console.log("\n✅ Seed terminé.\n");
  console.log(`Login : albert@batimcam.cm / ${PWD}`);
  console.log(`URL   : http://batimcam.terp.local:5000\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
