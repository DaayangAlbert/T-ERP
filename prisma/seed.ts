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
  await prisma.performanceBonus.deleteMany();
  await prisma.benefitInKind.deleteMany();
  await prisma.interestDeclaration.deleteMany();
  await prisma.agendaEvent.deleteMany();
  await prisma.userSignature.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.loss.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.fixedAsset.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplierEvaluation.deleteMany();
  await prisma.frameworkContract.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.annualClosure.deleteMany();
  await prisma.accountingLine.deleteMany();
  await prisma.accountingEntry.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.financialCommitment.deleteMany();
  await prisma.financialPeriod.deleteMany();
  await prisma.training.deleteMany();
  await prisma.successionPlan.deleteMany();
  await prisma.socialIndicator.deleteMany();
  await prisma.resourceConflict.deleteMany();
  await prisma.milestone.deleteMany();
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

  // ===== JALONS STRATÉGIQUES + CONFLITS RESSOURCES (Phase 2 / Bloc 3 — fn 3.2) =====
  const today = new Date();

  // 30 jalons répartis sur 12 mois
  const milestoneSeed: Array<{ daysFromNow: number; type: "SITE_START" | "SITE_DELIVERY" | "MILESTONE" | "FINANCIAL" | "COMMERCIAL" | "INTERNAL"; title: string; critical?: boolean }> = [
    { daysFromNow: -25, type: "SITE_START", title: "Démarrage Forage AEP Mbalmayo" },
    { daysFromNow: -10, type: "MILESTONE", title: "Réception lot terrassement Pont Mfoundi" },
    { daysFromNow: 5, type: "FINANCIAL", title: "Acompte TVA T1", critical: true },
    { daysFromNow: 12, type: "COMMERCIAL", title: "Remise dossier AO Voirie Bertoua", critical: true },
    { daysFromNow: 18, type: "INTERNAL", title: "Conseil d'administration trimestriel" },
    { daysFromNow: 22, type: "SITE_DELIVERY", title: "Livraison Lycée bilingue Yaoundé" },
    { daysFromNow: 28, type: "FINANCIAL", title: "Échéance CNPS Avril" },
    { daysFromNow: 35, type: "COMMERCIAL", title: "Visite chantier MINTP" },
    { daysFromNow: 40, type: "MILESTONE", title: "Coulage dalle R+3 Bastos" },
    { daysFromNow: 50, type: "SITE_START", title: "Démarrage extension Bonabéri" },
    { daysFromNow: 55, type: "INTERNAL", title: "Audit qualité ISO 9001" },
    { daysFromNow: 62, type: "FINANCIAL", title: "Acompte IS S1" },
    { daysFromNow: 68, type: "COMMERCIAL", title: "Soutenance offre marché AEP Bafia", critical: true },
    { daysFromNow: 75, type: "SITE_DELIVERY", title: "Réception Tour Mfoundi" },
    { daysFromNow: 82, type: "MILESTONE", title: "Pose charpente Lotissement Odza" },
    { daysFromNow: 90, type: "FINANCIAL", title: "Solde TVA T2" },
    { daysFromNow: 98, type: "INTERNAL", title: "Assemblée générale annuelle", critical: true },
    { daysFromNow: 110, type: "SITE_START", title: "Démarrage Voirie Yaoundé III" },
    { daysFromNow: 120, type: "COMMERCIAL", title: "AO réhabilitation hôpital Garoua" },
    { daysFromNow: 130, type: "FINANCIAL", title: "Déclaration DGI mensuelle" },
    { daysFromNow: 145, type: "MILESTONE", title: "Phase 2 Lotissement Odza" },
    { daysFromNow: 160, type: "SITE_DELIVERY", title: "Livraison Pont Mfoundi" },
    { daysFromNow: 175, type: "INTERNAL", title: "Revue mi-parcours stratégie 2026" },
    { daysFromNow: 190, type: "FINANCIAL", title: "Acompte IS S2" },
    { daysFromNow: 210, type: "COMMERCIAL", title: "Salon Promote Cameroun" },
    { daysFromNow: 230, type: "MILESTONE", title: "Réception VRD Lotissement Odza" },
    { daysFromNow: 250, type: "FINANCIAL", title: "Bilan comptable annuel" },
    { daysFromNow: 280, type: "SITE_DELIVERY", title: "Livraison Forage Mbalmayo" },
    { daysFromNow: 310, type: "INTERNAL", title: "Comex de fin d'exercice" },
    { daysFromNow: 340, type: "COMMERCIAL", title: "Dépôt budget prévisionnel CA" },
  ];
  for (const m of milestoneSeed) {
    await prisma.milestone.create({
      data: {
        tenantId: tenant.id,
        type: m.type as any,
        title: m.title,
        date: new Date(today.getTime() + m.daysFromNow * 86_400_000),
        critical: m.critical ?? false,
        status: m.daysFromNow < 0 ? "DONE" : "PLANNED",
      },
    });
  }
  console.log(`✓ ${milestoneSeed.length} jalons stratégiques créés`);

  // 4 conflits ressources
  const sitesIds = allSites.map((s) => s.id);
  const conflicts = [
    {
      resourceType: "CREW",
      resourceLabel: "Maçons coffreurs (équipe A)",
      periodStart: new Date(today.getTime() + 14 * 86_400_000),
      periodEnd: new Date(today.getTime() + 28 * 86_400_000),
      demandLevel: 135,
      siteIds: sitesIds.slice(0, 3),
      arbitration: true,
      arbitrationNote: "Faut-il sous-traiter une partie du coffrage Bastos ou décaler Voirie Bonabéri ?",
    },
    {
      resourceType: "CREW",
      resourceLabel: "Maçons coffreurs (équipe B)",
      periodStart: new Date(today.getTime() + 21 * 86_400_000),
      periodEnd: new Date(today.getTime() + 42 * 86_400_000),
      demandLevel: 118,
      siteIds: sitesIds.slice(2, 4),
      arbitration: false,
    },
    {
      resourceType: "EQUIPMENT",
      resourceLabel: "Pelle hydraulique 20T",
      periodStart: new Date(today.getTime() + 7 * 86_400_000),
      periodEnd: new Date(today.getTime() + 21 * 86_400_000),
      demandLevel: 145,
      siteIds: sitesIds.slice(0, 2),
      arbitration: true,
      arbitrationNote: "Location externe à 850 K FCFA / mois ou priorisation ?",
    },
    {
      resourceType: "EQUIPMENT",
      resourceLabel: "Grue à tour Liebherr",
      periodStart: new Date(today.getTime() + 30 * 86_400_000),
      periodEnd: new Date(today.getTime() + 60 * 86_400_000),
      demandLevel: 105,
      siteIds: sitesIds.slice(1, 3),
      arbitration: true,
      arbitrationNote: "Conflit Lotissement Odza vs Tour Mfoundi sur le mois de juin.",
    },
  ];
  for (const c of conflicts) {
    await prisma.resourceConflict.create({
      data: {
        tenantId: tenant.id,
        ...c,
        arbitrationStatus: "PENDING",
      },
    });
  }
  console.log(`✓ ${conflicts.length} conflits ressources créés (3 arbitrages DG en attente)`);

  // ===== RH STRATÉGIQUE (Phase 2 / Bloc 3 — fn 3.3) =====
  // Plan de succession pour 8 postes clés
  const successions: Array<{ position: string; incumbentRole: Role; successorRole?: Role; readyInMonths?: number; status: "IDENTIFIED" | "AT_RISK" | "NONE" | "READY_NOW"; notes?: string }> = [
    { position: "Directeur Général", incumbentRole: Role.DG, status: "AT_RISK", notes: "Successeur potentiel à former : 18 mois minimum." },
    { position: "DAF", incumbentRole: Role.DAF, successorRole: Role.ACCOUNTANT, readyInMonths: 12, status: "IDENTIFIED" },
    { position: "Directeur Technique", incumbentRole: Role.TECH_DIRECTOR, successorRole: Role.WORKS_DIRECTOR, readyInMonths: 6, status: "READY_NOW" },
    { position: "Directeur de Travaux Sud", incumbentRole: Role.WORKS_DIRECTOR, successorRole: Role.WORKS_MANAGER, readyInMonths: 24, status: "IDENTIFIED" },
    { position: "Directeur de Travaux Nord", incumbentRole: Role.WORKS_DIRECTOR, status: "NONE", notes: "Aucun successeur interne identifié — recrutement externe à envisager." },
    { position: "Conducteur de Travaux Senior", incumbentRole: Role.WORKS_MANAGER, successorRole: Role.SITE_MANAGER, readyInMonths: 18, status: "IDENTIFIED" },
    { position: "Responsable RH", incumbentRole: Role.HR, status: "AT_RISK", notes: "Profil rare sur la place de Yaoundé." },
    { position: "Comptable Principal", incumbentRole: Role.ACCOUNTANT, status: "NONE" },
  ];

  for (const sp of successions) {
    const incumbent = createdUsers.find((u) => u.role === sp.incumbentRole);
    if (!incumbent) continue;
    const successor = sp.successorRole ? createdUsers.find((u) => u.role === sp.successorRole) : null;
    await prisma.successionPlan.create({
      data: {
        tenantId: tenant.id,
        positionTitle: sp.position,
        incumbentId: incumbent.id,
        successorId: successor?.id ?? null,
        readyInMonths: sp.readyInMonths ?? null,
        status: sp.status,
        notes: sp.notes ?? null,
      },
    });
  }
  console.log(`✓ ${successions.length} plans de succession créés`);

  // 50 formations historiques + 20 en cours + 15 planifiées
  const trainingTitles = [
    { title: "CACES Catégorie B (engins terrassement)", category: "CACES", expires: 5 * 365 },
    { title: "Habilitation électrique BR", category: "Sécurité", expires: 3 * 365 },
    { title: "Travail en hauteur", category: "Sécurité", expires: 365 },
    { title: "AIPR Encadrant", category: "Sécurité", expires: 5 * 365 },
    { title: "Management d'équipe chantier", category: "Management", expires: null },
    { title: "Lecture de plans BTP", category: "Métier", expires: null },
    { title: "Coffrage moderne", category: "Métier", expires: null },
    { title: "Soudure ARC niveau 2", category: "Métier", expires: 3 * 365 },
    { title: "ISO 9001 Auditeur interne", category: "Qualité", expires: 3 * 365 },
    { title: "SST Sauveteur Secouriste", category: "Sécurité", expires: 2 * 365 },
  ];

  const trainingUsers = createdUsers.filter((u) => u.role !== Role.SUPER_ADMIN);
  let trainingCount = 0;

  // 50 historiques
  for (let i = 0; i < 50; i++) {
    const t = trainingTitles[i % trainingTitles.length];
    const u = trainingUsers[i % trainingUsers.length];
    const startDate = new Date(Date.now() - (300 - i * 5) * 86_400_000);
    const endDate = new Date(startDate.getTime() + (3 + Math.floor(Math.random() * 4)) * 86_400_000);
    const expires = t.expires ? new Date(endDate.getTime() + t.expires * 86_400_000) : null;
    await prisma.training.create({
      data: {
        tenantId: tenant.id,
        userId: u.id,
        title: t.title,
        category: t.category,
        provider: ["INFOSEC Cameroun", "AFB Formation", "BTP Academy", "Centre Métiers"][i % 4],
        startDate,
        endDate,
        cost: BigInt(150_000 + Math.floor(Math.random() * 350_000)),
        status: "COMPLETED",
        expiresAt: expires,
      },
    });
    trainingCount++;
  }

  // 20 en cours
  for (let i = 0; i < 20; i++) {
    const t = trainingTitles[i % trainingTitles.length];
    const u = trainingUsers[(i + 5) % trainingUsers.length];
    const startDate = new Date(Date.now() - 7 * 86_400_000);
    const endDate = new Date(Date.now() + 7 * 86_400_000);
    await prisma.training.create({
      data: {
        tenantId: tenant.id,
        userId: u.id,
        title: t.title,
        category: t.category,
        provider: "Centre Métiers BTP",
        startDate,
        endDate,
        cost: BigInt(280_000),
        status: "IN_PROGRESS",
      },
    });
    trainingCount++;
  }

  // 15 planifiées
  for (let i = 0; i < 15; i++) {
    const t = trainingTitles[i % trainingTitles.length];
    const u = trainingUsers[(i + 10) % trainingUsers.length];
    const startDate = new Date(Date.now() + (i + 1) * 14 * 86_400_000);
    const endDate = new Date(startDate.getTime() + 5 * 86_400_000);
    await prisma.training.create({
      data: {
        tenantId: tenant.id,
        userId: u.id,
        title: t.title,
        category: t.category,
        provider: "AFB Formation",
        startDate,
        endDate,
        cost: BigInt(220_000),
        status: "PLANNED",
      },
    });
    trainingCount++;
  }
  console.log(`✓ ${trainingCount} formations créées (50 historiques + 20 en cours + 15 planifiées)`);

  // 5 certifications expirent dans 60 jours (forçage)
  for (let i = 0; i < 5; i++) {
    const u = trainingUsers[i + 1];
    const expires = new Date(Date.now() + (10 + i * 8) * 86_400_000);
    await prisma.training.create({
      data: {
        tenantId: tenant.id,
        userId: u.id,
        title: `CACES Catégorie ${["A", "B", "C", "D", "F"][i]}`,
        category: "CACES",
        provider: "INFOSEC Cameroun",
        startDate: new Date(expires.getTime() - 5 * 365 * 86_400_000),
        endDate: new Date(expires.getTime() - 5 * 365 * 86_400_000 + 5 * 86_400_000),
        status: "COMPLETED",
        expiresAt: expires,
      },
    });
  }
  console.log(`✓ 5 certifications CACES expirantes dans 60j (alertes)`);

  // 12 mois d'indicateurs sociaux
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
    const period = d.toISOString().slice(0, 7);
    await prisma.socialIndicator.create({
      data: {
        tenantId: tenant.id,
        period,
        indicators: {
          turnover: { rate: 8.5 + (Math.random() - 0.5) * 4, byCategory: [{ category: "OQ", rate: 12 }, { category: "Manœuvres", rate: 18 }] },
          absenteeism: { rate: 4.2 + (Math.random() - 0.5) * 1.5, byReason: [{ reason: "Maladie", rate: 2.1 }, { reason: "Accident", rate: 0.8 }] },
          seniorityAvg: 6.5 + i * 0.05,
          genderEquity: { femaleRatio: 0.18 + i * 0.005, femaleSalaryGap: 0.08 - i * 0.002 },
          climate: { score: 4.0 + (Math.random() - 0.5) * 0.5, lastSurveyDate: period + "-15" },
          conflicts: i % 4 === 0 ? 1 : 0,
        } as object,
      },
    });
  }
  console.log(`✓ 12 mois d'indicateurs sociaux créés`);

  // ===== FINANCES (Phase 2 / Bloc 4 — fn 4.1) =====
  // 24 mois historiques + budget annuel
  const baseRevenue = 142_000_000; // mensuel
  const finToday = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(finToday.getFullYear(), finToday.getMonth() - 23 + i, 1);
    const period = d.toISOString().slice(0, 7);
    const seasonal = 1 + Math.sin((i / 12) * Math.PI * 2) * 0.07;
    const trend = 1 + (i / 24) * 0.05;
    const revenue = Math.round(baseRevenue * seasonal * trend);
    const purchases = Math.round(revenue * 0.42);
    const personnel = Math.round(revenue * 0.28);
    const subcontracting = Math.round(revenue * 0.08);
    const depreciation = Math.round(revenue * 0.04);
    const otherExpenses = Math.round(revenue * 0.06);
    const operatingResult = revenue + Math.round(revenue * 0.01) - (purchases + personnel + subcontracting + depreciation + otherExpenses);
    const financialResult = -Math.round(revenue * 0.015);
    const exceptionalResult = i % 6 === 0 ? Math.round(revenue * 0.01) : 0;
    const netResult = Math.round((operatingResult + financialResult + exceptionalResult) * 0.7); // après IS

    // Bilan synthétique : valeurs cumulées approximatives
    const cumulated = baseRevenue * (i + 1);
    const immo = Math.round(cumulated * 1.2);
    const stocks = Math.round(revenue * 0.15);
    const receivables = Math.round(revenue * 1.8);
    const treasury = Math.round(revenue * 0.5 + i * 5_000_000);
    const equity = Math.round(cumulated * 0.6);
    const financialDebts = Math.round(cumulated * 0.4);
    const suppliers = Math.round(revenue * 1.4);
    const otherLiab = Math.round(revenue * 0.5);
    const totalActif = immo + stocks + receivables + treasury;

    await prisma.financialPeriod.create({
      data: {
        tenantId: tenant.id,
        period,
        pnl: {
          products: { revenue, otherProducts: Math.round(revenue * 0.01) },
          expenses: { purchases, personnel, subcontracting, depreciation, other: otherExpenses },
          operatingResult,
          financialResult,
          exceptionalResult,
          netResult,
        } as object,
        balance: {
          actif: { immobilisations: immo, stocks, receivables, treasury },
          passif: { equity, financialDebts, suppliers, other: otherLiab },
          ratios: {
            autonomy: Number(((equity / totalActif) * 100).toFixed(1)),
            liquidity: Number(((stocks + receivables + treasury) / (suppliers + otherLiab)).toFixed(2)),
            leverage: Number((financialDebts / equity).toFixed(2)),
          },
        } as object,
        bfr: {
          dso: 50 + Math.floor(Math.random() * 30), // 50-80
          dpo: 40 + Math.floor(Math.random() * 20), // 40-60
          stockRotation: 14 + Math.floor(Math.random() * 8),
          bfr: stocks + receivables - suppliers,
          treasury,
        } as object,
        locked: i < 22, // les 2 derniers mois ouverts
      },
    });
  }
  // Budget de l'année courante
  const yearCur = finToday.getFullYear();
  const budgetRevenue = baseRevenue * 12 * 1.08;
  await prisma.financialPeriod.create({
    data: {
      tenantId: tenant.id,
      period: `${yearCur}-BUDGET`,
      pnl: {
        products: { revenue: budgetRevenue, otherProducts: budgetRevenue * 0.01 },
        expenses: {
          purchases: budgetRevenue * 0.4,
          personnel: budgetRevenue * 0.27,
          subcontracting: budgetRevenue * 0.08,
          depreciation: budgetRevenue * 0.04,
          other: budgetRevenue * 0.05,
        },
        operatingResult: budgetRevenue * 0.17,
        financialResult: -budgetRevenue * 0.015,
        exceptionalResult: 0,
        netResult: budgetRevenue * 0.105,
      } as object,
      balance: {} as object,
      bfr: {} as object,
      locked: false,
    },
  });
  console.log(`✓ 24 mois de FinancialPeriod + budget créés`);

  // 8 engagements actifs (cautions sur les chantiers)
  const sitesForCommitments = await prisma.site.findMany({
    where: { tenantId: { in: [tenant.id, yaounde.id, douala.id, logistique.id] } },
    select: { id: true, code: true, budget: true, client: true },
  });
  const banks = ["UBA Cameroun", "BICEC", "Afriland First Bank", "Ecobank", "SGBC"];
  for (let i = 0; i < 8; i++) {
    const site = sitesForCommitments[i % sitesForCommitments.length];
    await prisma.financialCommitment.create({
      data: {
        tenantId: tenant.id,
        type: i < 5 ? "BANK_GUARANTEE" : i < 7 ? "FIRST_DEMAND_GUARANTEE" : "PURCHASE_COMMITMENT",
        reference: `CAU-2026-${String(i + 1).padStart(3, "0")}`,
        bank: banks[i % banks.length],
        beneficiary: site.client,
        amount: BigInt(Math.round(Number(site.budget) * 0.05)),
        siteId: site.id,
        issueDate: new Date(finToday.getTime() - 60 * 86_400_000),
        maturityDate: new Date(finToday.getTime() + (180 + i * 30) * 86_400_000),
        status: "ACTIVE",
      },
    });
  }
  console.log(`✓ 8 engagements actifs créés`);

  // 5 comptes bancaires (DAF Bloc 1 / fn 1.2 — couleurs + sync)
  const bankSeed: Array<{ bank: string; balance: bigint; granted: bigint; used: bigint; manager: string; color: string; sync: "LIVE" | "DELAYED" | "MANUAL" | "ERROR" }> = [
    { bank: "UBA Cameroun", balance: 482_000_000n, granted: 1_500_000_000n, used: 920_000_000n, manager: "Patrick MBALLA", color: "#B91C1C", sync: "LIVE" },
    { bank: "BICEC", balance: 215_000_000n, granted: 800_000_000n, used: 320_000_000n, manager: "Estelle FOTSING", color: "#0F766E", sync: "LIVE" },
    { bank: "Afriland First Bank", balance: 168_000_000n, granted: 500_000_000n, used: 180_000_000n, manager: "Sandrine MEKA", color: "#A855F7", sync: "DELAYED" },
    { bank: "Ecobank", balance: 95_000_000n, granted: 400_000_000n, used: 280_000_000n, manager: "Jean TCHOFFO", color: "#1D4ED8", sync: "MANUAL" },
    { bank: "SGBC", balance: 312_000_000n, granted: 1_200_000_000n, used: 640_000_000n, manager: "Roland NJOYA", color: "#DC2626", sync: "LIVE" },
  ];
  const createdBankIds: string[] = [];
  for (const [i, b] of bankSeed.entries()) {
    const history = Array.from({ length: 12 }, (_, j) => {
      const d = new Date(finToday.getFullYear(), finToday.getMonth() - 11 + j, 1);
      const wave = 1 + Math.sin((j / 12) * Math.PI * 2) * 0.15;
      return {
        month: d.toISOString().slice(0, 7),
        balance: Math.round(Number(b.balance) * wave),
      };
    });
    const created = await prisma.bankAccount.create({
      data: {
        tenantId: tenant.id,
        bank: b.bank,
        accountNumber: `${10005 + i}-00012-${String(i).padStart(2, "0")}5678901-${42 + i}`,
        accountType: i === 3 ? "ESCROW" : "CURRENT",
        balance: b.balance,
        creditLineGranted: b.granted,
        creditLineUsed: b.used,
        renewalDate: new Date(finToday.getFullYear() + 1, (i * 2) % 12, 15),
        contact: { name: b.manager, phone: `+237 6 ${78 + i} ${10 + i}${i + 5} ${20 + i}${i} ${30 + i}${i}`, email: `${b.manager.toLowerCase().replace(/\s+/g, ".")}@${b.bank.split(" ")[0].toLowerCase()}.cm` } as object,
        history12m: history as object,
        primaryColor: b.color,
        syncStatus: b.sync,
        lastSyncAt: b.sync === "LIVE" ? new Date(Date.now() - 30_000) : b.sync === "DELAYED" ? new Date(Date.now() - 3 * 60_000) : null,
      },
    });
    createdBankIds.push(created.id);
  }
  console.log(`✓ 5 comptes bancaires créés (UBA, BICEC, Afriland, Ecobank, SGBC)`);

  // Mouvements bancaires récents (DAF fn 1.2)
  const movementSeeds = [
    { bankIdx: 0, dir: "INBOUND" as const, amount: 45_000_000n, label: "Virement client SCI Bastos Plus", counter: "SCI Bastos Plus", hoursAgo: 2 },
    { bankIdx: 1, dir: "OUTBOUND" as const, amount: 28_500_000n, label: "BC Carburant Total Cameroun", counter: "Total Cameroun", hoursAgo: 4 },
    { bankIdx: 0, dir: "INBOUND" as const, amount: 18_200_000n, label: "Acompte Voirie Bonabéri", counter: "Commune Douala IV", hoursAgo: 6 },
    { bankIdx: 2, dir: "OUTBOUND" as const, amount: 12_350_000n, label: "Paiement fournisseur CIMENCAM", counter: "CIMENCAM", hoursAgo: 8 },
    { bankIdx: 4, dir: "OUTBOUND" as const, amount: 8_400_000n, label: "Acompte CNPS Avril", counter: "CNPS Cameroun", hoursAgo: 22 },
  ];
  for (const m of movementSeeds) {
    await prisma.bankMovement.create({
      data: {
        bankAccountId: createdBankIds[m.bankIdx],
        direction: m.dir,
        amount: m.amount,
        label: m.label,
        counterparty: m.counter,
        occurredAt: new Date(Date.now() - m.hoursAgo * 3_600_000),
      },
    });
  }
  console.log(`✓ ${movementSeeds.length} mouvements bancaires récents créés`);

  // ===== COMPTABILITÉ (Phase 2 / Bloc 4 — fn 4.2) =====
  // 12 mois ouverts pour 2026 + 4 derniers mois clôturés pour 2025
  const yearCurrentForAccounting = finToday.getFullYear();
  for (let m = 1; m <= 12; m++) {
    await prisma.accountingPeriod.create({
      data: {
        tenantId: tenant.id,
        period: `${yearCurrentForAccounting}-${String(m).padStart(2, "0")}`,
        status: "OPEN",
      },
    });
  }
  for (let m = 9; m <= 12; m++) {
    await prisma.accountingPeriod.create({
      data: {
        tenantId: tenant.id,
        period: `${yearCurrentForAccounting - 1}-${String(m).padStart(2, "0")}`,
        status: "CLOSED",
        closedAt: new Date(yearCurrentForAccounting - 1, m, 5),
        closedBy: createdUsers.find((u) => u.role === Role.DG)?.id ?? createdUsers[0].id,
      },
    });
  }

  // Écritures synthétiques sur les 4 derniers mois pour alimenter grand livre / balance.
  // On crée des écritures équilibrées par paires : achat / vente / paie / banque.
  const accountingPeriodsForEntries = [`${yearCurrentForAccounting - 1}-12`, `${yearCurrentForAccounting}-01`, `${yearCurrentForAccounting}-02`, `${yearCurrentForAccounting}-03`];
  let entryCount = 0;

  for (const acctPeriod of accountingPeriodsForEntries) {
    const [yr, mo] = acctPeriod.split("-").map(Number);
    const dateBase = new Date(yr, mo - 1, 1);

    // 1. Achats fournisseurs (3 par mois)
    for (let i = 0; i < 3; i++) {
      const amount = BigInt(8_000_000 + i * 3_000_000);
      const tva = (amount * 1925n) / 10000n; // ~19.25%
      const ttc = amount + tva;
      const date = new Date(yr, mo - 1, 5 + i * 8);
      const ref = `AC-${acctPeriod}-${String(i + 1).padStart(3, "0")}`;
      await prisma.accountingEntry.create({
        data: {
          tenantId: tenant.id,
          period: acctPeriod,
          reference: ref,
          date,
          journal: "AC",
          label: `Achat matériaux fournisseur F${i + 1}`,
          totalDebit: ttc,
          totalCredit: ttc,
          lines: {
            create: [
              { account: "604", label: "Achats matières", debit: amount, credit: 0n },
              { account: "445", label: "TVA déductible", debit: tva, credit: 0n },
              { account: "401", label: `Fournisseur F${i + 1}`, debit: 0n, credit: ttc },
            ],
          },
        },
      });
      entryCount++;
    }

    // 2. Ventes clients (4 par mois)
    for (let i = 0; i < 4; i++) {
      const amount = BigInt(15_000_000 + i * 5_000_000);
      const tva = (amount * 1925n) / 10000n;
      const ttc = amount + tva;
      const date = new Date(yr, mo - 1, 8 + i * 5);
      const ref = `VE-${acctPeriod}-${String(i + 1).padStart(3, "0")}`;
      await prisma.accountingEntry.create({
        data: {
          tenantId: tenant.id,
          period: acctPeriod,
          reference: ref,
          date,
          journal: "VE",
          label: `Facture client C${i + 1} — Travaux`,
          totalDebit: ttc,
          totalCredit: ttc,
          lines: {
            create: [
              { account: "411", label: `Client C${i + 1}`, debit: ttc, credit: 0n },
              { account: "706", label: "Services vendus", debit: 0n, credit: amount },
              { account: "443", label: "TVA collectée", debit: 0n, credit: tva },
            ],
          },
        },
      });
      entryCount++;
    }

    // 3. Paie (1 OD par mois)
    const grossSalaries = BigInt(142_000_000);
    const cnps = (grossSalaries * 420n) / 10000n;
    const irpp = (grossSalaries * 1500n) / 10000n;
    const netToPay = grossSalaries - cnps - irpp;
    await prisma.accountingEntry.create({
      data: {
        tenantId: tenant.id,
        period: acctPeriod,
        reference: `PA-${acctPeriod}-001`,
        date: new Date(yr, mo - 1, 28),
        journal: "PA",
        label: `Paie mensuelle ${acctPeriod}`,
        totalDebit: grossSalaries,
        totalCredit: grossSalaries,
        lines: {
          create: [
            { account: "661", label: "Salaires bruts", debit: grossSalaries, credit: 0n },
            { account: "421", label: "Net à payer", debit: 0n, credit: netToPay },
            { account: "431", label: "CNPS à payer", debit: 0n, credit: cnps },
            { account: "442", label: "IRPP à reverser", debit: 0n, credit: irpp },
          ],
        },
      },
    });
    entryCount++;

    // 4. Règlements clients (encaissements via banque)
    const enc = BigInt(45_000_000);
    await prisma.accountingEntry.create({
      data: {
        tenantId: tenant.id,
        period: acctPeriod,
        reference: `BQ-${acctPeriod}-001`,
        date: new Date(yr, mo - 1, 22),
        journal: "BQ",
        label: `Encaissement clients (virements ${acctPeriod})`,
        totalDebit: enc,
        totalCredit: enc,
        lines: {
          create: [
            { account: "521", label: "Banque UBA", debit: enc, credit: 0n },
            { account: "411", label: "Clients (encaissement)", debit: 0n, credit: enc },
          ],
        },
      },
    });
    entryCount++;
  }

  // Mise à jour des compteurs sur les périodes
  for (const acctPeriod of accountingPeriodsForEntries) {
    const entries = await prisma.accountingEntry.findMany({
      where: { tenantId: tenant.id, period: acctPeriod },
    });
    const totalDebit = entries.reduce((s, e) => s + e.totalDebit, 0n);
    const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0n);
    await prisma.accountingPeriod.update({
      where: { tenantId_period: { tenantId: tenant.id, period: acctPeriod } },
      data: {
        totalEntries: entries.length,
        totalDebit,
        totalCredit,
      },
    });
  }
  console.log(`✓ ${entryCount} écritures comptables créées sur 4 périodes`);

  // 1 clôture annuelle 2025 en attente DG
  await prisma.annualClosure.create({
    data: {
      tenantId: tenant.id,
      fiscalYear: yearCurrentForAccounting - 1,
      status: "PENDING_DG_VALIDATION",
      pnlValidated: true,
      balanceValidated: true,
      adjustmentsValidated: false,
      adjustments: [
        { ref: "OD-AJ-001", label: "Provision client douteux", amount: 12_500_000, validated: false },
        { ref: "OD-AJ-002", label: "Charges constatées d'avance assurance", amount: 3_200_000, validated: true },
      ] as object,
    },
  });
  console.log(`✓ Clôture annuelle ${yearCurrentForAccounting - 1} en attente DG`);

  // ===== ACHATS / FOURNISSEURS (Phase 2 / Bloc 4 — fn 4.3) =====
  const supplierData: Array<{ name: string; category: string; strategic?: boolean; payment?: number }> = [
    // Stratégiques (10) — fournisseurs réels camerounais
    { name: "CIMENCAM", category: "Ciment & granulats", strategic: true, payment: 60 },
    { name: "SOCATAM", category: "Acier & ferraillage", strategic: true, payment: 45 },
    { name: "METALCAM", category: "Métallurgie", strategic: true, payment: 45 },
    { name: "Total Cameroun", category: "Carburant & lubrifiants", strategic: true, payment: 30 },
    { name: "TRADEX", category: "Carburant & lubrifiants", strategic: true, payment: 30 },
    { name: "CFAO Motors", category: "Engins & véhicules", strategic: true, payment: 90 },
    { name: "Caterpillar Cameroun", category: "Engins TP", strategic: true, payment: 90 },
    { name: "Tractafric Equipment", category: "Engins TP", strategic: true, payment: 90 },
    { name: "ENEO", category: "Énergie", strategic: true, payment: 30 },
    { name: "CDE", category: "Eau", strategic: true, payment: 30 },
    // Autres fournisseurs (76) — répartition par catégorie
    ...Array.from({ length: 8 }, (_, i) => ({ name: `Quincaillerie Centrale ${i + 1}`, category: "Quincaillerie", payment: 30 })),
    ...Array.from({ length: 6 }, (_, i) => ({ name: `Sablière du ${["Nyong", "Wouri", "Sanaga", "Mbam", "Faro", "Dja"][i]}`, category: "Sable & gravier", payment: 30 })),
    ...Array.from({ length: 5 }, (_, i) => ({ name: `Carrelage ${["Plus", "Pro", "Express", "Direct", "Premium"][i]}`, category: "Carrelage & faïence", payment: 45 })),
    ...Array.from({ length: 4 }, (_, i) => ({ name: `Plomberie ${["du Centre", "BTP", "Industrielle", "Pro"][i]}`, category: "Plomberie", payment: 45 })),
    ...Array.from({ length: 4 }, (_, i) => ({ name: `Électricité ${["Cameroun", "Pro", "Industrie", "Service"][i]}`, category: "Électricité bâtiment", payment: 45 })),
    ...Array.from({ length: 6 }, (_, i) => ({ name: `Sous-traitant Coffrage ${i + 1}`, category: "Sous-traitance", payment: 60 })),
    ...Array.from({ length: 5 }, (_, i) => ({ name: `Transport ${["Cameroun", "Express", "Logistic", "Premium", "Service"][i]}`, category: "Transport & logistique", payment: 30 })),
    ...Array.from({ length: 4 }, (_, i) => ({ name: `Assurance ${["AXA", "Activa", "Saham", "Allianz"][i]} Cameroun`, category: "Assurance", payment: 30 })),
    ...Array.from({ length: 5 }, (_, i) => ({ name: `Bureau d'études ${i + 1}`, category: "Études techniques", payment: 60 })),
    ...Array.from({ length: 4 }, (_, i) => ({ name: `Sécurité ${["Pro", "Garde", "Watchman", "Patrol"][i]}`, category: "Sécurité chantier", payment: 30 })),
    ...Array.from({ length: 4 }, (_, i) => ({ name: `Restauration chantier ${i + 1}`, category: "Restauration", payment: 15 })),
    ...Array.from({ length: 6 }, (_, i) => ({ name: `EPI Pro ${i + 1}`, category: "EPI & sécurité", payment: 45 })),
    ...Array.from({ length: 5 }, (_, i) => ({ name: `Telecom ${["MTN", "Orange", "Camtel", "Nexttel", "Yoomee"][i]} Pro`, category: "Télécommunications", payment: 30 })),
    ...Array.from({ length: 4 }, (_, i) => ({ name: `Imprimerie ${["Universelle", "Saint-Paul", "Express", "Pro"][i]}`, category: "Impression & papeterie", payment: 30 })),
    ...Array.from({ length: 4 }, (_, i) => ({ name: `Maintenance engins ${i + 1}`, category: "Maintenance", payment: 60 })),
    ...Array.from({ length: 2 }, (_, i) => ({ name: `Location bungalows ${i + 1}`, category: "Hébergement chantier", payment: 30 })),
  ];

  const createdSuppliers: Array<{ id: string; name: string; volumeYTD: bigint; poCount: number }> = [];
  for (const [i, s] of supplierData.entries()) {
    const volumeYTD = BigInt(
      s.strategic
        ? 80_000_000 + Math.floor(Math.random() * 250_000_000)
        : 5_000_000 + Math.floor(Math.random() * 60_000_000)
    );
    const poCount = s.strategic ? 12 + Math.floor(Math.random() * 25) : 2 + Math.floor(Math.random() * 12);
    const created = await prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: s.name,
        category: s.category,
        taxId: `M${String(102316150000 + i)}L`,
        rccm: `RC/DLA/2018/B/${String(1000 + i).padStart(5, "0")}`,
        phone: `+237 6 ${78 + (i % 10)} ${10 + (i % 90)} ${20 + (i % 80)} ${30 + (i % 70)}`,
        email: `contact@${s.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.cm`,
        address: ["Bonabéri, Douala", "Bastos, Yaoundé", "Akwa, Douala", "Mvan, Yaoundé"][i % 4],
        paymentTerms: s.payment ?? 45,
        ratingQuality: s.strategic ? 4 + Math.random() : 3 + Math.random() * 2,
        ratingDelay: s.strategic ? 4 + Math.random() : 2.5 + Math.random() * 2.5,
        ratingPrice: 3 + Math.random() * 2,
        strategic: s.strategic ?? false,
        blocked: i === 70, // 1 fournisseur bloqué
        blockReason: i === 70 ? "Litige qualité 2025-Q4" : null,
        volumeYTD,
        poCount,
      },
    });
    createdSuppliers.push({ id: created.id, name: s.name, volumeYTD, poCount });
  }
  console.log(`✓ ${createdSuppliers.length} fournisseurs créés (10 stratégiques)`);

  // 5 contrats-cadres actifs sur les stratégiques
  const strategicSuppliers = createdSuppliers.slice(0, 5);
  for (const [i, s] of strategicSuppliers.entries()) {
    const maxAmount = BigInt(500_000_000 + i * 200_000_000);
    const usedAmount = (maxAmount * BigInt(20 + i * 12)) / 100n;
    await prisma.frameworkContract.create({
      data: {
        tenantId: tenant.id,
        supplierId: s.id,
        reference: `CC-2026-${String(i + 1).padStart(3, "0")}`,
        subject: ["Approvisionnement ciment groupe", "Acier HA 6-32 mm", "Carburant flotte travaux", "Location pelles 20T", "Maintenance engins TP"][i],
        maxAmount,
        usedAmount,
        startDate: new Date(finToday.getFullYear(), 0, 1),
        endDate: new Date(finToday.getFullYear(), 11, 31),
        conditions: { paymentTerms: 60, penalties: "1‰/jour", revisionClause: "Indexation trimestrielle" } as object,
        status: "ACTIVE",
      },
    });
  }
  console.log(`✓ 5 contrats-cadres actifs créés`);

  // 30 évaluations historiques (sur les 20 plus gros)
  const dgUserForEvals = createdUsers.find((u) => u.role === Role.DG) ?? createdUsers[0];
  for (let i = 0; i < 30; i++) {
    const s = createdSuppliers[i % 20];
    const period = `${finToday.getFullYear()}-${String((i % 12) + 1).padStart(2, "0")}`;
    await prisma.supplierEvaluation.create({
      data: {
        supplierId: s.id,
        evaluatorId: dgUserForEvals.id,
        period,
        ratingQuality: 3 + Math.random() * 2,
        ratingDelay: 3 + Math.random() * 2,
        ratingPrice: 3 + Math.random() * 2,
        comments: i % 3 === 0 ? "Évaluation routine — RAS." : null,
      },
    });
  }
  console.log(`✓ 30 évaluations historiques créées`);

  // 5 BC en attente DG (montants > 50 M FCFA)
  const pendingPos = [
    { supplierIdx: 0, label: "Approvisionnement ciment Q2", amount: 85_000_000n, category: "Ciment", days: 2 },
    { supplierIdx: 1, label: "Acier HA pour ponts", amount: 120_000_000n, category: "Acier", days: 5 },
    { supplierIdx: 5, label: "Pelle hydraulique CAT 320", amount: 220_000_000n, category: "Engins", days: 8 },
    { supplierIdx: 3, label: "Carburant gros chantiers Q2", amount: 95_000_000n, category: "Carburant", days: 3 },
    { supplierIdx: 6, label: "Bulldozer D6 occasion", amount: 180_000_000n, category: "Engins", days: 11 },
  ];
  const dafUserForPos = createdUsers.find((u) => u.role === Role.DAF) ?? createdUsers[0];
  const accountantUser = createdUsers.find((u) => u.role === Role.ACCOUNTANT) ?? createdUsers[0];
  for (const [i, p] of pendingPos.entries()) {
    const supplier = createdSuppliers[p.supplierIdx];
    const created = new Date(finToday.getTime() - p.days * 86_400_000);
    await prisma.purchaseOrder.create({
      data: {
        tenantId: tenant.id,
        supplierId: supplier.id,
        reference: `PO-${finToday.getFullYear()}-${String(1000 + i).padStart(4, "0")}`,
        label: p.label,
        amount: p.amount,
        category: p.category,
        initiatorId: accountantUser.id,
        status: "PENDING_DG",
        dafApprovedAt: new Date(created.getTime() + 86_400_000),
        dafApprovedBy: dafUserForPos.id,
        createdAt: created,
      },
    });
  }
  console.log(`✓ 5 BC en attente validation DG créés`);

  // ===== STOCKS & MATÉRIEL (Phase 2 / Bloc 5 — fn 5.1) =====
  // 42 immobilisations cohérentes
  const sitesForAssets = await prisma.site.findMany({
    where: { tenantId: { in: [tenant.id, yaounde.id, douala.id, logistique.id] } },
    select: { id: true },
  });
  const assetSeeds = [
    // Engins (15)
    ...Array.from({ length: 4 }, (_, i) => ({ desc: `Pelle hydraulique CAT 320 #${i + 1}`, cat: "EQUIPMENT" as const, gross: 220_000_000, life: 84, age: 12 + i * 6, cond: "GOOD" })),
    ...Array.from({ length: 3 }, (_, i) => ({ desc: `Bulldozer Komatsu D65 #${i + 1}`, cat: "EQUIPMENT" as const, gross: 280_000_000, life: 96, age: 24 + i * 12, cond: i === 2 ? "FAIR" : "GOOD" })),
    ...Array.from({ length: 3 }, (_, i) => ({ desc: `Compacteur Bomag #${i + 1}`, cat: "EQUIPMENT" as const, gross: 95_000_000, life: 84, age: 36 + i * 6, cond: "FAIR" })),
    ...Array.from({ length: 3 }, (_, i) => ({ desc: `Grue à tour Liebherr #${i + 1}`, cat: "EQUIPMENT" as const, gross: 320_000_000, life: 120, age: 48 + i * 6 })),
    ...Array.from({ length: 2 }, (_, i) => ({ desc: `Centrale à béton mobile #${i + 1}`, cat: "EQUIPMENT" as const, gross: 180_000_000, life: 96, age: 18 })),
    // Véhicules (12)
    ...Array.from({ length: 6 }, (_, i) => ({ desc: `Camion benne Mercedes Actros #${i + 1}`, cat: "VEHICLE" as const, gross: 65_000_000, life: 60, age: 12 + i * 4 })),
    ...Array.from({ length: 4 }, (_, i) => ({ desc: `Pickup Toyota Hilux #${i + 1}`, cat: "VEHICLE" as const, gross: 28_000_000, life: 72, age: 24 + i * 6 })),
    ...Array.from({ length: 2 }, (_, i) => ({ desc: `Berline DG ${i === 0 ? "Toyota Land Cruiser" : "Mercedes E-Class"}`, cat: "VEHICLE" as const, gross: 45_000_000, life: 60, age: 18 })),
    // Bâtiments (4)
    { desc: "Siège social Bonapriso (immeuble R+3)", cat: "BUILDING" as const, gross: 850_000_000, life: 600, age: 96 },
    { desc: "Base logistique Bonabéri (entrepôt 2 000 m²)", cat: "BUILDING" as const, gross: 320_000_000, life: 480, age: 60 },
    { desc: "Agence Yaoundé Bastos", cat: "BUILDING" as const, gross: 180_000_000, life: 480, age: 48 },
    { desc: "Atelier de maintenance Douala", cat: "BUILDING" as const, gross: 120_000_000, life: 360, age: 36 },
    // Outillage (5)
    ...Array.from({ length: 5 }, (_, i) => ({ desc: `Lot outillage ${["coffrage", "ferraillage", "finitions", "topographie", "hydraulique"][i]}`, cat: "TOOLING" as const, gross: 12_500_000 + i * 2_000_000, life: 60, age: 24 })),
    // IT (4)
    ...Array.from({ length: 2 }, (_, i) => ({ desc: `Serveur Dell PowerEdge #${i + 1}`, cat: "IT" as const, gross: 18_000_000, life: 60, age: 12 })),
    ...Array.from({ length: 2 }, (_, i) => ({ desc: `Lot postes de travail (10 unités) #${i + 1}`, cat: "IT" as const, gross: 11_000_000, life: 48, age: 18 })),
    // Mobilier (2)
    ...Array.from({ length: 2 }, (_, i) => ({ desc: `Mobilier de bureau ${i === 0 ? "siège" : "agence"}`, cat: "FURNITURE" as const, gross: 14_000_000, life: 120, age: 36 })),
  ];

  for (const [i, s] of assetSeeds.entries()) {
    const ageMonths = (s as any).age ?? 24;
    const life = (s as any).life ?? 60;
    const grossValue = BigInt(s.gross);
    const accumulatedDepreciation = (grossValue * BigInt(Math.min(ageMonths, life))) / BigInt(life);
    const netValue = grossValue - accumulatedDepreciation;
    const acquisitionDate = new Date(Date.now() - ageMonths * 30 * 86_400_000);
    await prisma.fixedAsset.create({
      data: {
        tenantId: tenant.id,
        code: `IMMO-${String(i + 1).padStart(4, "0")}`,
        description: s.desc,
        category: s.cat,
        acquisitionDate,
        grossValue,
        accumulatedDepreciation,
        netValue,
        usefulLifeMonths: life,
        siteId: sitesForAssets.length ? sitesForAssets[i % sitesForAssets.length].id : null,
        condition: ((s as any).cond ?? "GOOD") as string,
        insurance: i % 3 === 0 ? { company: "AXA Cameroun", policyRef: `POL-${String(i).padStart(4, "0")}`, coveredAmount: grossValue.toString() } as object : undefined,
      },
    });
  }
  console.log(`✓ ${assetSeeds.length} immobilisations créées`);

  // 200 mouvements de stock sur 30 jours dont 5 anormaux
  const stockItems = [
    { code: "CIM-CPJ45", label: "Ciment CPJ 45 (sac 50kg)", unit: 5_800 },
    { code: "FER-HA12", label: "Fer HA 12 mm (barre)", unit: 8_400 },
    { code: "GRA-15-25", label: "Gravier 15-25 (m³)", unit: 18_500 },
    { code: "SAB-FIN", label: "Sable fin (m³)", unit: 9_200 },
    { code: "GAS-DSL", label: "Gasoil (litre)", unit: 730 },
    { code: "EPI-CASQUE", label: "Casque chantier", unit: 4_500 },
    { code: "EPI-GANTS", label: "Gants protection", unit: 1_200 },
  ];
  const movementInitiator = createdUsers.find((u) => u.role === Role.WORKS_MANAGER || u.role === Role.WAREHOUSE) ?? createdUsers[0];

  let anomalousCount = 0;
  for (let i = 0; i < 200; i++) {
    const item = stockItems[i % stockItems.length];
    const types = ["INBOUND", "OUTBOUND", "TRANSFER", "ADJUSTMENT"] as const;
    const type = types[i % types.length];
    const isAnomalous = i % 40 === 17 || i === 73; // ~5 anomalies
    const quantity = isAnomalous ? 200 + Math.floor(Math.random() * 500) : 5 + Math.floor(Math.random() * 50);
    const unitValue = BigInt(item.unit);
    const totalValue = unitValue * BigInt(quantity);
    const date = new Date(Date.now() - (30 - (i % 30)) * 86_400_000 - Math.random() * 86_400_000);
    if (isAnomalous) anomalousCount++;
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        type,
        itemCode: item.code,
        itemLabel: item.label,
        quantity,
        unitValue,
        totalValue,
        fromSiteId: type !== "INBOUND" && sitesForAssets.length ? sitesForAssets[i % sitesForAssets.length].id : null,
        toSiteId: type !== "OUTBOUND" && sitesForAssets.length ? sitesForAssets[(i + 1) % sitesForAssets.length].id : null,
        reason: ["Approvisionnement chantier", "Dotation équipe", "Transfert inter-chantier", "Régularisation inventaire", "Casse"][i % 5],
        initiatorId: movementInitiator.id,
        anomalous: isAnomalous,
        anomalyReason: isAnomalous ? "Quantité hors norme statistique (>3σ)" : null,
        createdAt: date,
      },
    });
  }
  console.log(`✓ 200 mouvements stock créés (${anomalousCount} anormaux)`);

  // 4 inventaires (2 terminés, 1 en cours, 1 planifié)
  const inventories = [
    { period: "2026-Q1", status: "VALIDATED" as const, gapsCount: 8, gapsValue: 1_200_000n, dgValidated: true, daysAgo: 90, duration: 5 },
    { period: "2026-Q2", status: "COMPLETED" as const, gapsCount: 14, gapsValue: 8_500_000n, dgValidated: false, daysAgo: 30, duration: 4 },
    { period: "2026-Q3", status: "IN_PROGRESS" as const, gapsCount: 0, gapsValue: 0n, dgValidated: false, daysAgo: 5, duration: null },
    { period: "2026-Q4", status: "PLANNED" as const, gapsCount: 0, gapsValue: 0n, dgValidated: false, daysAgo: -30, duration: null },
  ];
  for (const inv of inventories) {
    const start = new Date(Date.now() - inv.daysAgo * 86_400_000);
    await prisma.inventory.create({
      data: {
        tenantId: tenant.id,
        period: inv.period,
        siteId: sitesForAssets.length ? sitesForAssets[0].id : null,
        startDate: start,
        endDate: inv.duration ? new Date(start.getTime() + inv.duration * 86_400_000) : null,
        itemsCount: inv.status === "PLANNED" || inv.status === "IN_PROGRESS" ? 0 : 380 + Math.floor(Math.random() * 100),
        gapsCount: inv.gapsCount,
        gapsValue: inv.gapsValue,
        status: inv.status,
        dgValidated: inv.dgValidated,
      },
    });
  }
  console.log(`✓ 4 inventaires créés (1 en attente validation DG > seuil)`);

  // 3 sinistres historiques
  const losses = [
    { type: "THEFT", desc: "Vol de 15 sacs ciment et 200 m de fer HA — chantier Voirie Bonabéri", value: 850_000n, daysAgo: 45, declared: true, indem: 600_000n, actions: "Renforcement gardiennage 24h sur le site, installation 4 caméras IP." },
    { type: "DAMAGE", desc: "Casse vitre cabine pelle CAT 320 (collision avec mur)", value: 280_000n, daysAgo: 12, declared: true, indem: 220_000n, actions: "Sensibilisation conducteurs, mise en place plan de circulation chantier." },
    { type: "LOSS", desc: "Perte d'outillage topographique (théodolite + accessoires)", value: 1_500_000n, daysAgo: 60, declared: false, indem: null, actions: "Inventaire physique trimestriel des outils sensibles, traçabilité QR." },
  ];
  for (const l of losses) {
    await prisma.loss.create({
      data: {
        tenantId: tenant.id,
        type: l.type as any,
        itemDescription: l.desc,
        value: l.value,
        siteId: sitesForAssets.length ? sitesForAssets[0].id : null,
        occurredAt: new Date(Date.now() - l.daysAgo * 86_400_000),
        declaredToInsurance: l.declared,
        declaredAt: l.declared ? new Date(Date.now() - (l.daysAgo - 2) * 86_400_000) : null,
        indemnification: l.indem,
        correctiveActions: l.actions,
      },
    });
  }
  console.log(`✓ 3 sinistres historiques créés`);

  // ===== PROFIL DG (Phase 2 / Bloc 5 — fn 5.2) =====
  const dgUserForProfile = createdUsers.find((u) => u.role === Role.DG)!;

  // Préférences DG
  await prisma.userPreferences.create({
    data: {
      userId: dgUserForProfile.id,
      dashboardWidgets: ["revenue", "margin", "treasury", "validations", "alerts", "objectives"] as object,
      alertThresholds: { treasuryMin: "150000000", marginMin: 12, validationOverdueDays: 5 } as object,
      notificationChannels: { validations: ["EMAIL", "PUSH"], alerts: ["EMAIL", "INAPP"] } as object,
      dailyReportEnabled: true,
      dailyReportTime: "07:00",
      numberFormat: "M_FCFA",
    },
  });
  console.log(`✓ Préférences DG créées pour Albert`);

  // 15 événements agenda DG sur 30 jours
  const eventsToday = new Date();
  const agendaSeed = [
    { title: "Comité de direction hebdo", type: "MEETING" as const, day: 0, hour: 9, dur: 90, loc: "Salle CD - Siège" },
    { title: "RDV banque UBA — renouvellement ligne", type: "MEETING" as const, day: 1, hour: 14, dur: 60, loc: "UBA Bonapriso" },
    { title: "Conseil d'administration trimestriel", type: "BOARD" as const, day: 3, hour: 10, dur: 240, loc: "Siège · 3e étage" },
    { title: "Échéance validation paie Avril", type: "VALIDATION_DEADLINE" as const, day: 4, hour: 17, dur: 30, loc: "" },
    { title: "Audit interne ISO 9001", type: "AUDIT" as const, day: 5, hour: 9, dur: 480, loc: "Base logistique" },
    { title: "Visite chantier Pont Mfoundi", type: "MEETING" as const, day: 7, hour: 8, dur: 180, loc: "Yaoundé · MINTP" },
    { title: "Déjeuner CIMENCAM (relation client)", type: "MEETING" as const, day: 8, hour: 12, dur: 120, loc: "Restaurant Le Fouquet's" },
    { title: "Revue trimestrielle objectifs", type: "MEETING" as const, day: 10, hour: 14, dur: 180, loc: "Salle CD" },
    { title: "Échéance validation marché Bonabéri", type: "VALIDATION_DEADLINE" as const, day: 12, hour: 18, dur: 30, loc: "" },
    { title: "Comité direction hebdo", type: "MEETING" as const, day: 14, hour: 9, dur: 90, loc: "Salle CD" },
    { title: "Audit fiscal DGI (préparation)", type: "AUDIT" as const, day: 16, hour: 10, dur: 180, loc: "Bureau DAF" },
    { title: "Déjeuner stratégique Caterpillar", type: "MEETING" as const, day: 18, hour: 12, dur: 120, loc: "Akwa, Douala" },
    { title: "Préparation AG annuelle", type: "BOARD" as const, day: 20, hour: 14, dur: 240, loc: "Cabinet juridique" },
    { title: "Échéance validation budget Q3", type: "VALIDATION_DEADLINE" as const, day: 22, hour: 17, dur: 30, loc: "" },
    { title: "Personnel · Rendez-vous médecin", type: "PERSONAL" as const, day: 25, hour: 8, dur: 60, loc: "" },
  ];

  for (const e of agendaSeed) {
    const start = new Date(eventsToday.getTime() + e.day * 86_400_000);
    start.setHours(e.hour, 0, 0, 0);
    const end = new Date(start.getTime() + e.dur * 60_000);
    await prisma.agendaEvent.create({
      data: {
        userId: dgUserForProfile.id,
        title: e.title,
        startAt: start,
        endAt: end,
        location: e.loc || null,
        type: e.type,
      },
    });
  }
  console.log(`✓ ${agendaSeed.length} événements agenda DG créés`);

  // Déclaration d'intérêts 2026
  const interestYear = new Date().getFullYear();
  await prisma.interestDeclaration.create({
    data: {
      userId: dgUserForProfile.id,
      year: interestYear,
      mandates: [
        { entity: "Groupement Patronal du Cameroun (GICAM)", role: "Membre du conseil exécutif", since: "2022-03-15" },
        { entity: "Fondation BatimCAM Action Sociale", role: "Président bénévole", since: "2024-06-01" },
      ] as object,
      shareholdings: [
        { entity: "BatimCAM SA", percent: 28.5, value: "850000000" },
        { entity: "DAAYANG Holding (SCI familiale)", percent: 100, value: null },
      ] as object,
      conflictsOfInterest: [
        { description: "Beau-frère salarié chez Total Cameroun (fournisseur stratégique)", mitigation: "Récusation sur les décisions de marché Total Cameroun" },
      ] as object,
      declaredAt: new Date(),
      validUntil: new Date(interestYear, 11, 31),
    },
  });
  console.log(`✓ Déclaration d'intérêts ${interestYear} pour Albert`);

  // ===== PAIE DG ENRICHIE (Phase 2 / Bloc 5 — fn 5.3) =====
  // 5 avantages en nature pour Albert
  const benefitsSeed: Array<{ type: "HOUSING" | "VEHICLE" | "FUEL" | "PHONE" | "INSURANCE"; desc: string; monthly: bigint; fiscal: bigint }> = [
    { type: "HOUSING", desc: "Villa de fonction · Bastos Yaoundé", monthly: 800_000n, fiscal: 200_000n },
    { type: "VEHICLE", desc: "Toyota Land Cruiser V8 + chauffeur", monthly: 450_000n, fiscal: 180_000n },
    { type: "FUEL", desc: "Carburant illimité (parc société)", monthly: 80_000n, fiscal: 80_000n },
    { type: "PHONE", desc: "iPhone Pro + forfait illimité 50 GB", monthly: 25_000n, fiscal: 12_500n },
    { type: "INSURANCE", desc: "Mutuelle santé famille (5 personnes)", monthly: 75_000n, fiscal: 37_500n },
  ];
  for (const b of benefitsSeed) {
    await prisma.benefitInKind.create({
      data: {
        userId: dgUserForProfile.id,
        type: b.type,
        description: b.desc,
        monthlyValue: b.monthly,
        fiscalValue: b.fiscal,
        startDate: new Date("2018-01-15"),
      },
    });
  }
  console.log(`✓ ${benefitsSeed.length} avantages en nature DG créés`);

  // 3 ans de bonus historiques
  const bonusSeed = [
    { year: 2024, type: "ANNUAL_RESULT" as const, formula: "5% du résultat net consolidé", target: 35_000_000n, actual: 28_500_000n, status: "PAID" as const, paid: new Date("2025-04-15") },
    { year: 2024, type: "OBJECTIVES" as const, formula: "Sur atteinte 8 objectifs DG", target: 20_000_000n, actual: 17_200_000n, status: "PAID" as const, paid: new Date("2025-04-15") },
    { year: 2025, type: "ANNUAL_RESULT" as const, formula: "5% du résultat net consolidé", target: 45_000_000n, actual: 42_300_000n, status: "PAID" as const, paid: new Date("2026-04-15") },
    { year: 2025, type: "OBJECTIVES" as const, formula: "Sur atteinte 8 objectifs DG", target: 22_000_000n, actual: 19_800_000n, status: "PAID" as const, paid: new Date("2026-04-15") },
    { year: 2026, type: "ANNUAL_RESULT" as const, formula: "5% du résultat net consolidé", target: 50_000_000n, actual: null, status: "PROVISIONED" as const, paid: null },
    { year: 2026, type: "OBJECTIVES" as const, formula: "Sur atteinte 8 objectifs DG", target: 25_000_000n, actual: null, status: "TARGETED" as const, paid: null },
  ];
  for (const b of bonusSeed) {
    await prisma.performanceBonus.create({
      data: {
        userId: dgUserForProfile.id,
        fiscalYear: b.year,
        bonusType: b.type,
        formula: b.formula,
        targetAmount: b.target,
        actualAmount: b.actual,
        status: b.status,
        paidAt: b.paid,
      },
    });
  }
  console.log(`✓ ${bonusSeed.length} bonus de performance DG créés (3 ans)`);

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

  // ===== MESSAGERIE DG (Phase 2 / Bloc 5 — fn 5.4) =====
  const dgForMsg = createdUsers.find((u) => u.role === Role.DG)!;
  const dafForMsg = createdUsers.find((u) => u.role === Role.DAF)!;
  const hrForMsg = createdUsers.find((u) => u.role === Role.HR);
  const techForMsg = createdUsers.find((u) => u.role === Role.TECH_DIRECTOR);
  const worksForMsg = createdUsers.find((u) => u.role === Role.WORKS_DIRECTOR);
  const sgForMsg = createdUsers.find((u) => u.role === Role.SG);

  const strategicGroups = [
    {
      name: "Comité de direction",
      members: [dgForMsg, dafForMsg, hrForMsg, techForMsg, worksForMsg].filter(Boolean),
      pinned: true,
      messages: [
        { sender: dafForMsg.id, content: "RAPPEL : Comité demain 9h. Ordre du jour envoyé.", priority: "NORMAL" as const },
        { sender: techForMsg?.id ?? dgForMsg.id, content: "Validation marché Bonabéri en attente. Retour DG impératif aujourd'hui.", priority: "URGENT" as const, mentions: [dgForMsg.id] },
        { sender: dgForMsg.id, content: "Vu, je valide cet après-midi après échange avec MINTP.", priority: "NORMAL" as const },
      ],
    },
    {
      name: "Conseil d'administration",
      members: [dgForMsg, dafForMsg, sgForMsg].filter(Boolean),
      pinned: true,
      messages: [
        { sender: sgForMsg?.id ?? dgForMsg.id, content: "Ordre du jour CA du 25 mai diffusé. Documents préparatoires sur GED.", priority: "NORMAL" as const },
        { sender: dgForMsg.id, content: "Merci, je reviens vers vous mercredi sur les arbitrages stratégiques.", priority: "NORMAL" as const },
      ],
    },
    {
      name: "Cellule de crise",
      members: [dgForMsg, dafForMsg, techForMsg].filter(Boolean),
      pinned: false,
      messages: [
        { sender: techForMsg?.id ?? dgForMsg.id, content: "Incident Pont Mfoundi : dérive budget 18%. Réunion à 16h en visio.", priority: "URGENT" as const, mentions: [dgForMsg.id, dafForMsg.id] },
      ],
    },
    {
      name: "Banques relations",
      members: [dgForMsg, dafForMsg].filter(Boolean),
      pinned: false,
      messages: [
        { sender: dafForMsg.id, content: "RDV UBA fixé jeudi 14h pour le renouvellement de la ligne 1.5 Md FCFA.", priority: "HIGH" as const, mentions: [dgForMsg.id] },
        { sender: dgForMsg.id, content: "OK. Préparons le dossier financier consolidé en amont.", priority: "NORMAL" as const },
      ],
    },
  ];

  let strategicMsgCount = 0;
  for (const g of strategicGroups) {
    const conv = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        name: g.name,
        isGroup: true,
        isStrategic: true,
        pinnedAt: g.pinned ? new Date() : null,
        lastMessageAt: new Date(),
        participants: {
          create: g.members.map((u) => ({ userId: u!.id, isPinned: g.pinned })),
        },
      },
    });
    for (const m of g.messages) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: m.sender,
          content: m.content,
          priority: m.priority,
          mentions: (m as { mentions?: string[] }).mentions ?? [],
        },
      });
      strategicMsgCount++;
    }
  }
  console.log(`✓ ${strategicGroups.length} groupes stratégiques créés (${strategicMsgCount} messages dont 5 HIGH/URGENT)`);

  // 2 sondages historiques
  const polls = [
    {
      conv: 0,
      sender: dafForMsg.id,
      question: "Date préférée pour la prochaine revue budgétaire ?",
      options: ["Lundi 15 mai 14h", "Mardi 16 mai 9h", "Mercredi 17 mai 16h"],
    },
    {
      conv: 1,
      sender: sgForMsg?.id ?? dgForMsg.id,
      question: "Format AG annuelle 2026 ?",
      options: ["Présentiel siège", "Hybride (présentiel + visio)", "100% visio"],
    },
  ];
  const allConvs = await prisma.conversation.findMany({
    where: { tenantId: tenant.id, isStrategic: true },
    orderBy: { createdAt: "asc" },
  });
  for (const p of polls) {
    if (allConvs[p.conv]) {
      await prisma.message.create({
        data: {
          conversationId: allConvs[p.conv].id,
          senderId: p.sender,
          content: `📊 Sondage : ${p.question}`,
          pollData: {
            question: p.question,
            options: p.options.map((label) => ({ label, votes: [] as string[] })),
          } as object,
        },
      });
    }
  }
  console.log(`✓ ${polls.length} sondages historiques créés`);

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
