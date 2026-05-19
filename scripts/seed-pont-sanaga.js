require("./_guard-prod");
// Génère un jeu de données COMPLET pour le chantier vitrine
// "CHT-2026-031 · Réhabilitation Pont Sanaga" géré par Jean-Marie BIWOLE.
//
// Données générées :
//   1. Affecte 12 ouvriers au chantier (équipe complète BTP)
//   2. 14 jours de pointage matinal + soirée (mix PRESENT/ABSENT/LATE)
//   3. 5 rapports journaliers (production + consommations + photos)
//   4. 4 livraisons (2 attendues + 2 réceptionnées)
//   5. 3 incidents HSE (1 OPEN, 1 INVESTIGATING, 1 RESOLVED)
//   6. 4 demandes de matériel (2 PENDING + 1 FULFILLED + 1 PARTIAL)
//   7. 3 demandes de congés ouvriers (PENDING)
//   8. Stocks magasin chantier (mis à jour si pas déjà)
//
// Idempotent : safe à rejouer.
//
// Usage : node scripts/seed-pont-sanaga.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  console.log("════ Seed chantier vitrine CHT-2026-031 ════\n");

  // 1) Récupère le chantier + Jean-Marie BIWOLE
  const site = await prisma.site.findFirst({
    where: { code: "CHT-2026-031" },
    select: { id: true, code: true, name: true, tenantId: true, plannedEndDate: true },
  });
  if (!site) {
    console.error("Chantier CHT-2026-031 introuvable");
    process.exit(1);
  }
  const jm = await prisma.user.findFirst({
    where: { firstName: "Jean-Marie", lastName: "BIWOLE" },
    select: { id: true, tenantId: true },
  });
  if (!jm) {
    console.error("Jean-Marie BIWOLE introuvable");
    process.exit(1);
  }
  console.log(`✓ Chantier : ${site.code} - ${site.name}`);
  console.log(`✓ CC : Jean-Marie BIWOLE (${jm.id.slice(-6)})\n`);

  // S'assure que JM est bien assigné à ce site
  await prisma.user.update({
    where: { id: jm.id },
    data: {
      assignedSiteIds: { set: Array.from(new Set([site.id])) }, // remplace par un seul site pour focus
    },
  });

  // 2) Affecte 12 ouvriers du tenant à ce chantier
  const workers = await prisma.user.findMany({
    where: { role: "WORKER", status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, workerQualification: true, assignedSiteIds: true },
    take: 12,
    orderBy: { lastName: "asc" },
  });
  console.log(`Affectation de ${workers.length} ouvriers...`);

  for (const w of workers) {
    // Met le site comme principal pour ces ouvriers (sans casser les autres)
    const next = Array.from(new Set([site.id, ...(w.assignedSiteIds || [])])).slice(0, 2);
    await prisma.user.update({
      where: { id: w.id },
      data: { assignedSiteIds: { set: next } },
    });

    // SiteWorkforceMember (idempotent)
    const exists = await prisma.siteWorkforceMember.findUnique({
      where: { siteId_userId: { siteId: site.id, userId: w.id } },
      select: { id: true },
    });
    if (!exists) {
      await prisma.siteWorkforceMember.create({
        data: {
          siteId: site.id,
          userId: w.id,
          role: "WORKER",
          isLeader: w.workerQualification?.toLowerCase().includes("chef") ?? false,
          startedAt: new Date(Date.now() - rand(15, 180) * 86_400_000),
        },
      });
    }
  }
  console.log(`✓ ${workers.length} ouvriers affectés au chantier\n`);

  // 3) Génère 14 jours de pointage
  console.log("Génération du pointage (14 jours × 2 sessions)...");
  let attendanceCount = 0;
  for (let d = 0; d < 14; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0);
    // skip dimanches
    if (date.getDay() === 0) continue;

    for (const session of ["MORNING", "EVENING"]) {
      let presentCount = 0;
      let absentCount = 0;
      for (const w of workers) {
        // 85% présent, 10% absent justifié, 3% absent, 2% en retard
        const r = Math.random();
        let status = "PRESENT";
        if (r > 0.97) status = "LATE";
        else if (r > 0.94) status = "ABSENT";
        else if (r > 0.85) status = "JUSTIFIED_ABSENT";

        const exists = await prisma.attendance.findUnique({
          where: {
            siteId_userId_date_session: {
              siteId: site.id,
              userId: w.id,
              date,
              session,
            },
          },
          select: { id: true },
        });
        if (exists) continue;

        await prisma.attendance.create({
          data: {
            siteId: site.id,
            userId: w.id,
            date,
            session,
            status,
            checkedInAt:
              status === "PRESENT" || status === "LATE"
                ? new Date(date.getTime() + (session === "MORNING" ? 7 : 13) * 3_600_000 + rand(0, 30) * 60_000)
                : null,
            reason: status === "JUSTIFIED_ABSENT" ? "Visite médicale" : status === "ABSENT" ? "Non communiqué" : null,
            recordedById: jm.id,
            recordedAt: new Date(date.getTime() + (session === "MORNING" ? 7.5 : 13.5) * 3_600_000),
          },
        });
        attendanceCount++;
        if (status === "PRESENT" || status === "LATE") presentCount++;
        else absentCount++;
      }

      // Session completion
      const completionExists = await prisma.attendanceSessionCompletion.findUnique({
        where: { siteId_date_session: { siteId: site.id, date, session } },
        select: { id: true },
      });
      if (!completionExists) {
        await prisma.attendanceSessionCompletion.create({
          data: {
            siteId: site.id,
            date,
            session,
            completedById: jm.id,
            completedAt: new Date(date.getTime() + (session === "MORNING" ? 7.5 : 13.5) * 3_600_000),
            presentCount,
            absentCount,
            totalCount: workers.length,
          },
        });
      }
    }
  }
  console.log(`✓ ${attendanceCount} pointages créés\n`);

  // 4) Génère 5 rapports journaliers (5 derniers jours ouvrés)
  console.log("Génération des rapports journaliers...");
  const reports = [];
  for (let d = 1; d <= 7 && reports.length < 5; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(8, 0, 0, 0);
    if (date.getDay() === 0) continue;

    const existing = await prisma.siteDailyReport.findFirst({
      where: { siteId: site.id, reportDate: date },
      select: { id: true },
    });
    if (existing) continue;

    const present = rand(8, 12);
    const overtimeH = rand(0, 8);
    const productionValue = BigInt(rand(800_000, 2_500_000));

    const tasksCompleted = [
      { task: "Coffrage dalle phase 2", quantity: rand(15, 25), unit: "m²", value: rand(150000, 300000) },
      { task: "Ferraillage poutres", quantity: rand(100, 200), unit: "kg", value: rand(180000, 350000) },
      { task: "Coulage béton C25/30", quantity: rand(4, 8), unit: "m³", value: rand(300000, 600000) },
    ];
    const consumedMaterials = [
      { code: "CIM-HPC", label: "Ciment HPC 42,5 R", quantity: rand(30, 60), unit: "sac" },
      { code: "AC-HA12", label: "Acier HA12", quantity: rand(50, 120), unit: "barre" },
      { code: "GRAV-5-15", label: "Gravier 5/15", quantity: rand(2, 5), unit: "m³" },
    ];

    const report = await prisma.siteDailyReport.create({
      data: {
        siteId: site.id,
        reportDate: date,
        submittedById: jm.id,
        workforcePresent: present,
        workforcePlanned: workers.length,
        normalHours: present * 8,
        overtimeHours: overtimeH,
        justifiedAbsences: rand(0, 2),
        productionValue,
        consumedMaterials,
        tasksCompleted,
        incidents: d === 3 ? "Coupure électrique 14h-15h, reprise normale après." : null,
        status: "SUBMITTED",
      },
      select: { id: true, reportDate: true },
    });
    reports.push(report);
  }
  console.log(`✓ ${reports.length} rapports journaliers créés\n`);

  // 5) Génère 4 livraisons (2 attendues + 2 réceptionnées)
  console.log("Génération des livraisons...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const supplier = await prisma.supplier?.findFirst?.({ where: { tenantId: site.tenantId } })?.catch?.(() => null);

  const deliveriesToCreate = [
    {
      scheduledAt: new Date(today.getTime() + 1 * 86_400_000 + 9 * 3_600_000),
      status: "CONFIRMED",
      items: [
        { articleCode: "CIM-HPC", label: "Ciment HPC 42,5 R", expectedQty: 200, unit: "sac" },
        { articleCode: "AC-HA12", label: "Acier HA12", expectedQty: 50, unit: "barre" },
      ],
      deliveryNoteRef: null,
    },
    {
      scheduledAt: new Date(today.getTime() + 8 * 3_600_000),
      status: "IN_TRANSIT",
      items: [
        { articleCode: "GRAV-5-15", label: "Gravier 5/15", expectedQty: 10, unit: "m³" },
      ],
      deliveryNoteRef: null,
    },
    {
      scheduledAt: new Date(today.getTime() - 2 * 86_400_000 + 9 * 3_600_000),
      receivedAt: new Date(today.getTime() - 2 * 86_400_000 + 10 * 3_600_000),
      status: "RECEIVED",
      items: [
        { articleCode: "CIM-CEM2", label: "Ciment CEM II 32,5", expectedQty: 150, unit: "sac", receivedQty: 150 },
        { articleCode: "ADJUV-PLAS", label: "Adjuvant plastifiant", expectedQty: 20, unit: "L", receivedQty: 20 },
      ],
      deliveryNoteRef: "BL-2026-04-1854",
      receivedById: jm.id,
    },
    {
      scheduledAt: new Date(today.getTime() - 5 * 86_400_000 + 9 * 3_600_000),
      receivedAt: new Date(today.getTime() - 5 * 86_400_000 + 11 * 3_600_000),
      status: "PARTIALLY_RECEIVED",
      items: [
        { articleCode: "AC-HA8", label: "Acier HA8", expectedQty: 100, unit: "barre", receivedQty: 80, gap: -20 },
      ],
      deliveryNoteRef: "BL-2026-04-1843",
      receivedById: jm.id,
    },
  ];

  let deliveriesCreated = 0;
  for (const d of deliveriesToCreate) {
    const dup = await prisma.delivery.findFirst({
      where: { siteId: site.id, scheduledAt: d.scheduledAt },
      select: { id: true },
    });
    if (dup) continue;
    await prisma.delivery.create({
      data: { siteId: site.id, ...d },
    });
    deliveriesCreated++;
  }
  console.log(`✓ ${deliveriesCreated} livraisons créées\n`);

  // 6) Génère 3 incidents HSE (1 OPEN, 1 INVESTIGATING, 1 RESOLVED)
  console.log("Génération des incidents HSE...");
  const hseToCreate = [
    {
      occurredAt: new Date(today.getTime() - 1 * 86_400_000 + 10 * 3_600_000),
      type: "NEAR_MISS",
      severity: "MEDIUM",
      victimsCount: 0,
      workdaysLost: 0,
      description: "Chute d'un sac de ciment depuis échafaudage, près d'un ouvrier (pas de victime). Filet anti-chute manquant à cet endroit.",
      immediateActions: "Zone sécurisée, ouvriers évacués, filet en cours de pose.",
      status: "OPEN",
      declaredByFieldUserId: jm.id,
      declaredViaApp: true,
    },
    {
      occurredAt: new Date(today.getTime() - 4 * 86_400_000 + 14 * 3_600_000),
      type: "MINOR_INJURY",
      severity: "MEDIUM",
      victimsCount: 1,
      workdaysLost: 1,
      description: "Coupure main droite sur barre d'acier non meulée (ouvrier Joseph BIYA). Soins infirmerie chantier. Arrêt 1 jour.",
      immediateActions: "Premiers soins administrés, ouvrier emmené au dispensaire CNPS pour suivi.",
      rootCause: "Barres d'acier non meulées en bout après découpe.",
      correctiveActions: [
        { action: "Meulage systématique des bouts d'acier après découpe", owner: "Chef ferrailleur", dueDate: new Date(today.getTime() + 7 * 86_400_000).toISOString(), done: false },
        { action: "Causerie HSE manipulation des aciers", owner: "Jean-Marie BIWOLE", dueDate: new Date(today.getTime() + 3 * 86_400_000).toISOString(), done: true },
      ],
      status: "UNDER_INVESTIGATION",
      declaredByFieldUserId: jm.id,
      declaredViaApp: true,
      bodyPartAffected: "Main droite",
    },
    {
      occurredAt: new Date(today.getTime() - 12 * 86_400_000 + 11 * 3_600_000),
      type: "NEAR_MISS",
      severity: "LOW",
      victimsCount: 0,
      workdaysLost: 0,
      description: "Outils laissés en hauteur sur échafaudage avant pause déjeuner. Aucun incident, alerté par contremaître.",
      immediateActions: "Outils descendus, briefing équipe sur rangement strict avant pauses.",
      rootCause: "Fin de tâche précipitée avant pause.",
      status: "CLOSED",
      declaredByFieldUserId: jm.id,
      declaredViaApp: true,
    },
  ];

  let hseCount = 0;
  for (const h of hseToCreate) {
    const dup = await prisma.hseIncident.findFirst({
      where: { siteId: site.id, occurredAt: h.occurredAt, type: h.type },
      select: { id: true },
    });
    if (dup) continue;
    await prisma.hseIncident.create({
      data: {
        siteId: site.id,
        reportedById: jm.id,
        ...h,
        correctiveActions: h.correctiveActions ?? [],
      },
    });
    hseCount++;
  }
  console.log(`✓ ${hseCount} incidents HSE créés\n`);

  // 7) Génère 4 demandes de matériel (2 PENDING, 1 FULFILLED, 1 PARTIAL)
  console.log("Génération des demandes de matériel...");
  const warehouse = await prisma.warehouse.findFirst({
    where: { siteId: site.id, scope: "CHANTIER" },
    select: { id: true, code: true, keeperId: true },
  });
  const articles = await prisma.article.findMany({
    where: { tenantId: site.tenantId, active: true },
    take: 8,
    select: { id: true, code: true, name: true, unit: true },
  });
  let materialCount = 0;
  if (warehouse && articles.length >= 3) {
    const requestsToCreate = [
      {
        status: "PENDING",
        priority: "URGENT",
        reason: "Coulage dalle prévu demain matin",
        lines: [
          { articleId: articles[0].id, quantity: 80 },
          { articleId: articles[1].id, quantity: 200 },
        ],
        daysAgo: 0,
      },
      {
        status: "PENDING",
        priority: "NORMAL",
        reason: "Phase coffrage 2e étage",
        lines: [
          { articleId: articles[2].id, quantity: 15 },
          { articleId: articles[3].id, quantity: 50 },
        ],
        daysAgo: 1,
      },
      {
        status: "FULFILLED",
        priority: "HIGH",
        reason: "Renforcement ferraillage poutres",
        lines: [
          { articleId: articles[4 % articles.length].id, quantity: 100 },
        ],
        daysAgo: 3,
        fulfilled: true,
      },
      {
        status: "PARTIAL",
        priority: "NORMAL",
        reason: "Petit outillage maçonnerie",
        lines: [
          { articleId: articles[5 % articles.length].id, quantity: 50 },
          { articleId: articles[6 % articles.length].id, quantity: 25 },
        ],
        daysAgo: 5,
        fulfilled: true,
        partial: true,
      },
    ];

    const yyyymm = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    for (const [idx, r] of requestsToCreate.entries()) {
      const ref = `MR-${site.code}-${yyyymm}-${String(900 + idx).padStart(3, "0")}`;
      const dup = await prisma.materialRequest.findFirst({
        where: { reference: ref },
        select: { id: true },
      });
      if (dup) continue;

      const createdAt = new Date(today.getTime() - r.daysAgo * 86_400_000 + 9 * 3_600_000);
      const fulfilledAt = r.fulfilled
        ? new Date(createdAt.getTime() + rand(2, 8) * 3_600_000)
        : null;

      await prisma.materialRequest.create({
        data: {
          tenantId: site.tenantId,
          requesterId: jm.id,
          siteId: site.id,
          warehouseId: warehouse.id,
          reference: ref,
          status: r.status,
          priority: r.priority,
          reason: r.reason,
          fulfilledById: r.fulfilled ? warehouse.keeperId ?? jm.id : null,
          fulfilledAt,
          createdAt,
          updatedAt: createdAt,
          lines: {
            create: r.lines.map((l) => ({
              articleId: l.articleId,
              quantityRequested: l.quantity,
              quantityFulfilled: r.partial
                ? Math.floor(l.quantity * 0.7)
                : r.fulfilled
                  ? l.quantity
                  : null,
            })),
          },
        },
      });
      materialCount++;
    }
  }
  console.log(`✓ ${materialCount} demandes de matériel créées\n`);

  // 8) Génère 3 demandes de congés ouvriers (PENDING, validateur = JM)
  console.log("Génération des demandes de congés ouvriers...");
  let leavesCount = 0;
  const leaveReasons = [
    "Mariage du frère au village",
    "Visite famille à Bafoussam",
    "Soins médicaux Yaoundé",
  ];
  for (let i = 0; i < 3 && i < workers.length; i++) {
    const w = workers[i];
    const startDate = new Date(today.getTime() + (i + 5) * 86_400_000);
    const endDate = new Date(startDate.getTime() + (3 + i * 2) * 86_400_000);
    const dup = await prisma.leaveRequest.findFirst({
      where: { userId: w.id, startDate, endDate },
      select: { id: true },
    });
    if (dup) continue;
    await prisma.leaveRequest.create({
      data: {
        tenantId: site.tenantId,
        userId: w.id,
        employeeKey: w.id,
        employeeName: `${w.firstName} ${w.lastName}`,
        type: "PAID_LEAVE",
        startDate,
        endDate,
        daysCount: 3 + i * 2,
        reason: leaveReasons[i],
        status: "PENDING",
        validatorUserId: jm.id,
      },
    });
    leavesCount++;

    // Notifie JM (1 fois)
    await prisma.notification.create({
      data: {
        userId: jm.id,
        type: "leave_request_pending",
        title: `Demande de congé — ${w.firstName} ${w.lastName}`,
        body: `${3 + i * 2} j · Congés payés`,
        link: "/chef-chantier/validations",
      },
    });
  }
  console.log(`✓ ${leavesCount} demandes de congés créées\n`);

  // ───── Récap ─────
  console.log("════ Récapitulatif final ════");
  const finalStats = await Promise.all([
    prisma.siteWorkforceMember.count({ where: { siteId: site.id, role: "WORKER" } }),
    prisma.attendance.count({ where: { siteId: site.id } }),
    prisma.siteDailyReport.count({ where: { siteId: site.id } }),
    prisma.delivery.count({ where: { siteId: site.id } }),
    prisma.hseIncident.count({ where: { siteId: site.id } }),
    prisma.materialRequest.count({ where: { siteId: site.id } }),
    prisma.leaveRequest.count({ where: { validatorUserId: jm.id, status: "PENDING" } }),
  ]);
  const [members, atts, drjs, dels, hses, mats, leaves] = finalStats;
  console.log(`Ouvriers affectés (workforce)   : ${members}`);
  console.log(`Pointages enregistrés           : ${atts}`);
  console.log(`Rapports journaliers            : ${drjs}`);
  console.log(`Livraisons                      : ${dels}`);
  console.log(`Incidents HSE                   : ${hses}`);
  console.log(`Demandes matériel               : ${mats}`);
  console.log(`Congés à valider (côté JM)      : ${leaves}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Erreur :", err);
  await prisma.$disconnect();
  process.exit(1);
});
