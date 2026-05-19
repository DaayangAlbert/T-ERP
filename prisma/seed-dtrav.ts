import "./_guard-prod";
/**
 * Seed complémentaire — données DTrav (Paul ETOUNDI · Bloc 0 + 1 + 2).
 *
 * À lancer APRÈS le seed principal (`pnpm db:seed`) :
 *   pnpm exec tsx prisma/seed-dtrav.ts
 *
 * Ajoute :
 *  - Affecte Paul ETOUNDI à Pont Mfoundi + AEP Mbalmayo via assignedSiteIds
 *  - SitePlanning + 4 phases + 5 jalons MOA sur Pont Mfoundi
 *  - SiteWorkforceMember (Paul → Samuel/conducteur → Jean/chef → Lucas/magasinier)
 *  - 2 SiteTeam sur Pont Mfoundi (Terrassement, Coffrage)
 *  - 3 SiteDailyReport (1 SUBMITTED à valider + 2 VALIDATED historique)
 *  - 1 ContractAmendment DRAFT + 2 SiteStockAlert (ciment + acier)
 *  - 1 Delivery J+3 + 1 SiteAlert priorité HIGH
 */
import {
  PrismaClient,
  Role,
  PhaseStatus,
  SiteMilestoneStatus,
  AmendmentStatus,
  CrewSpecialty,
  WorkforceRole,
  DailyReportStatus,
  DeliveryStatus,
  AlertSeverity,
  AlertPriority,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed DTrav (Paul ETOUNDI)...");

  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  if (!tenant) {
    console.error("Aucun tenant — lancez d'abord pnpm db:seed");
    return;
  }

  const paul = await prisma.user.findFirst({
    where: { email: "paul@batimcam.cm" },
    select: { id: true },
  });
  if (!paul) {
    console.error("Paul ETOUNDI introuvable (email paul@batimcam.cm)");
    return;
  }

  // Les chantiers sont sur les tenants filiales (structure groupe)
  const pontMfoundi = await prisma.site.findFirst({
    where: { code: "CHT-2025-031" },
    select: { id: true, code: true, plannedEndDate: true, tenantId: true },
  });
  const aepMbalmayo = await prisma.site.findFirst({
    where: { code: "CHT-2026-018" },
    select: { id: true, code: true, plannedEndDate: true, tenantId: true },
  });
  if (!pontMfoundi || !aepMbalmayo) {
    console.error("Chantiers Pont Mfoundi (CHT-2025-031) ou AEP Mbalmayo (CHT-2026-018) introuvables");
    return;
  }

  // 1) assignedSiteIds Paul → 2 chantiers
  await prisma.user.update({
    where: { id: paul.id },
    data: { assignedSiteIds: [pontMfoundi.id, aepMbalmayo.id] },
  });
  console.log(`  ✓ Paul ETOUNDI assigné à 2 chantiers`);

  // 2) Conducteur + Chef chantier + Magasinier (cherche existants ou utilise Paul)
  const samuel = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: Role.WORKS_MANAGER },
    select: { id: true, firstName: true, lastName: true },
  });
  const jean = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: Role.SITE_MANAGER },
    select: { id: true, firstName: true, lastName: true },
  });
  const lucas = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: Role.WAREHOUSE },
    select: { id: true, firstName: true, lastName: true },
  });

  // 3) Workforce hierarchy Pont Mfoundi
  await prisma.siteWorkforceMember.deleteMany({ where: { siteId: pontMfoundi.id } });
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 15);

  await prisma.siteWorkforceMember.create({
    data: {
      siteId: pontMfoundi.id,
      userId: paul.id,
      role: WorkforceRole.DIRECTOR_WORKS,
      isLeader: true,
      startedAt: start,
    },
  });
  if (samuel) {
    await prisma.siteWorkforceMember.create({
      data: {
        siteId: pontMfoundi.id,
        userId: samuel.id,
        reportsToId: paul.id,
        role: WorkforceRole.SITE_MANAGER,
        startedAt: start,
      },
    });
  }
  if (jean) {
    await prisma.siteWorkforceMember.create({
      data: {
        siteId: pontMfoundi.id,
        userId: jean.id,
        reportsToId: samuel?.id ?? paul.id,
        role: WorkforceRole.FOREMAN,
        isLeader: true,
        startedAt: start,
      },
    });
  }
  if (lucas) {
    await prisma.siteWorkforceMember.create({
      data: {
        siteId: pontMfoundi.id,
        userId: lucas.id,
        reportsToId: samuel?.id ?? paul.id,
        role: WorkforceRole.WAREHOUSE,
        startedAt: start,
      },
    });
  }
  console.log(`  ✓ Hiérarchie chantier Pont Mfoundi (${[paul, samuel, jean, lucas].filter(Boolean).length} membres)`);

  // 4) Teams Pont Mfoundi — skip si déjà créées par seed principal CDT
  const existingTeams = await prisma.siteTeam.count({ where: { siteId: pontMfoundi.id } });
  if (jean && existingTeams === 0) {
    await prisma.siteTeam.createMany({
      data: [
        {
          siteId: pontMfoundi.id,
          name: "Terrassement Nord",
          specialty: CrewSpecialty.ROADWORK,
          leaderUserId: jean.id,
          headcountTarget: 8,
        },
        {
          siteId: pontMfoundi.id,
          name: "Coffrage piles",
          specialty: CrewSpecialty.CONCRETE,
          leaderUserId: jean.id,
          headcountTarget: 12,
        },
      ],
    });
  }
  console.log(`  ✓ 2 équipes ouvrières Pont Mfoundi`);

  // 5) SitePlanning + phases + jalons Pont Mfoundi
  await prisma.sitePlanning.deleteMany({ where: { siteId: pontMfoundi.id } });
  const startDate = new Date(2025, 8, 1); // 1er septembre 2025
  const endDate = pontMfoundi.plannedEndDate;
  const planning = await prisma.sitePlanning.create({
    data: {
      siteId: pontMfoundi.id,
      totalDurationDays: Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000),
      phases: {
        create: [
          {
            orderIndex: 1,
            name: "Études d'exécution",
            plannedStart: startDate,
            plannedEnd: new Date(2025, 10, 15),
            progressPercent: 100,
            status: PhaseStatus.COMPLETED,
            actualStart: startDate,
            actualEnd: new Date(2025, 10, 12),
          },
          {
            orderIndex: 2,
            name: "Terrassements + fondations",
            plannedStart: new Date(2025, 10, 16),
            plannedEnd: new Date(2026, 1, 28),
            progressPercent: 100,
            status: PhaseStatus.COMPLETED,
            actualStart: new Date(2025, 10, 16),
            actualEnd: new Date(2026, 2, 4),
          },
          {
            orderIndex: 3,
            name: "Gros œuvre piles et tablier",
            plannedStart: new Date(2026, 2, 1),
            plannedEnd: new Date(2026, 6, 30),
            progressPercent: 78,
            status: PhaseStatus.IN_PROGRESS,
            actualStart: new Date(2026, 2, 5),
          },
          {
            orderIndex: 4,
            name: "Équipements + finitions",
            plannedStart: new Date(2026, 7, 1),
            plannedEnd: new Date(2026, 9, 30),
            progressPercent: 0,
            status: PhaseStatus.PLANNED,
          },
        ],
      },
      milestones: {
        create: [
          {
            code: "J1",
            description: "Notification de démarrage",
            contractDueDate: startDate,
            actualDate: startDate,
            status: SiteMilestoneStatus.MOA_VALIDATED,
            moaValidation: true,
          },
          {
            code: "J2",
            description: "Réception fondations",
            contractDueDate: new Date(2026, 1, 28),
            actualDate: new Date(2026, 2, 4),
            status: SiteMilestoneStatus.LATE,
            moaValidation: true,
          },
          {
            code: "J3",
            description: "Levée réserves piles",
            contractDueDate: new Date(2026, 4, 22),
            status: SiteMilestoneStatus.UPCOMING,
          },
          {
            code: "J4",
            description: "Tablier coulé",
            contractDueDate: new Date(2026, 6, 30),
            status: SiteMilestoneStatus.UPCOMING,
          },
          {
            code: "J5",
            description: "Réception définitive",
            contractDueDate: new Date(2026, 9, 30),
            status: SiteMilestoneStatus.UPCOMING,
          },
        ],
      },
    },
  });
  console.log(`  ✓ Planning Pont Mfoundi (4 phases + 5 jalons)`);

  // 6) Daily reports
  await prisma.siteDailyReport.deleteMany({ where: { siteId: pontMfoundi.id } });
  if (jean) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    await prisma.siteDailyReport.create({
      data: {
        siteId: pontMfoundi.id,
        reportDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        submittedById: jean.id,
        workforcePresent: 68,
        workforcePlanned: 74,
        normalHours: 8 * 68,
        overtimeHours: 12,
        justifiedAbsences: 4,
        productionValue: BigInt(3_800_000),
        consumedMaterials: [
          { code: "CIM-HPC", label: "Ciment HPC", quantity: 42, unit: "sacs" },
          { code: "AC-HA12", label: "Acier HA12", quantity: 1.8, unit: "t" },
          { code: "GAS", label: "Gasoil", quantity: 320, unit: "l" },
        ],
        tasksCompleted: [
          { task: "Bétonnage pile 4", quantity: 28, unit: "m³", value: 2_520_000 },
          { task: "Ferraillage pile 5", quantity: 1.4, unit: "t", value: 980_000 },
          { task: "Décoffrage pile 3", quantity: 1, unit: "u", value: 300_000 },
        ],
        incidents: null,
        photos: [],
        status: DailyReportStatus.SUBMITTED,
      },
    });

    await prisma.siteDailyReport.create({
      data: {
        siteId: pontMfoundi.id,
        reportDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
        submittedById: jean.id,
        workforcePresent: 71,
        workforcePlanned: 74,
        normalHours: 8 * 71,
        overtimeHours: 6,
        justifiedAbsences: 3,
        productionValue: BigInt(4_100_000),
        consumedMaterials: [{ code: "CIM-HPC", label: "Ciment HPC", quantity: 48, unit: "sacs" }],
        tasksCompleted: [{ task: "Bétonnage pile 3", quantity: 32, unit: "m³", value: 2_880_000 }],
        photos: [],
        status: DailyReportStatus.VALIDATED,
        validatedById: paul.id,
        validatedAt: new Date(yesterday.getTime() + 3 * 3600 * 1000),
      },
    });

    await prisma.siteDailyReport.create({
      data: {
        siteId: pontMfoundi.id,
        reportDate: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate()),
        submittedById: jean.id,
        workforcePresent: 69,
        workforcePlanned: 74,
        normalHours: 8 * 69,
        overtimeHours: 8,
        justifiedAbsences: 5,
        productionValue: BigInt(3_950_000),
        consumedMaterials: [],
        tasksCompleted: [{ task: "Ferraillage", quantity: 1.2, unit: "t", value: 850_000 }],
        photos: [],
        status: DailyReportStatus.VALIDATED,
        validatedById: paul.id,
        validatedAt: new Date(twoDaysAgo.getTime() + 4 * 3600 * 1000),
      },
    });
    console.log(`  ✓ 3 rapports journaliers (1 SUBMITTED à valider)`);
  }

  // 7) ContractAmendment DRAFT
  await prisma.contractAmendment.deleteMany({ where: { siteId: pontMfoundi.id } });
  await prisma.contractAmendment.create({
    data: {
      siteId: pontMfoundi.id,
      reference: "AVE-001",
      amount: BigInt(45_800_000),
      extraDays: 30,
      reason: "Aléas géotechniques piles 3 et 4",
      justification:
        "Découverte d'une couche d'argile plus profonde que prévu nécessitant un renforcement des fondations. Étude BCT du 28/04 jointe.",
      attachments: [],
      status: AmendmentStatus.N2_PENDING,
      initiatedById: paul.id,
    },
  });
  console.log(`  ✓ Avenant AVE-001 N2_PENDING (DT)`);

  // 8) Stock alerts Pont Mfoundi
  await prisma.siteStockAlert.deleteMany({ where: { siteId: pontMfoundi.id } });
  await prisma.siteStockAlert.createMany({
    data: [
      {
        siteId: pontMfoundi.id,
        articleCode: "CIM-HPC",
        articleLabel: "Ciment HPC 42,5R",
        currentStock: 85,
        weeklyNeed: 240,
        daysOfCover: 2.5,
        severity: AlertSeverity.HIGH,
      },
      {
        siteId: pontMfoundi.id,
        articleCode: "AC-HA12",
        articleLabel: "Acier HA12 6m",
        currentStock: 1.2,
        weeklyNeed: 8,
        daysOfCover: 1.0,
        severity: AlertSeverity.CRITICAL,
      },
    ],
  });
  console.log(`  ✓ 2 alertes ruptures stock`);

  // 9) Delivery J+3
  const supplier = await prisma.supplier.findFirst();
  await prisma.delivery.deleteMany({ where: { siteId: pontMfoundi.id } });
  await prisma.delivery.create({
    data: {
      siteId: pontMfoundi.id,
      supplierId: supplier?.id ?? null,
      scheduledAt: new Date(today.getTime() + 3 * 86_400_000),
      status: DeliveryStatus.CONFIRMED,
      deliveryNoteRef: "BL-2026-0451",
      items: [
        { articleCode: "CIM-HPC", label: "Ciment HPC 42,5R", expectedQty: 320, receivedQty: 0 },
      ],
    },
  });
  console.log(`  ✓ Livraison J+3 confirmée`);

  // 10) SiteAlert priorité HIGH
  await prisma.siteAlert.deleteMany({ where: { siteId: pontMfoundi.id, type: "DTRAV_DEMO" } });
  await prisma.siteAlert.create({
    data: {
      siteId: pontMfoundi.id,
      severity: AlertSeverity.HIGH,
      priority: AlertPriority.HIGH,
      type: "STOCK_RUPTURE",
      message: "Rupture ciment HPC dans 2,5 jours — commande urgente requise",
      actionUrl: "/dtrav/appros",
      actionLabel: "Commander",
    },
  });
  console.log(`  ✓ 1 alerte chantier active`);

  console.log("✅ Seed DTrav terminé");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
