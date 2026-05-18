// Seed minimal pour rendre tous les modules DTrav fonctionnels avec les bons
// champs Prisma (siteplanning sans tenantId/dates, sitephase orderIndex/plannedStart,
// siteMilestone code/description/contractDueDate, etc.).
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const dtrav = await prisma.user.findFirst({ where: { role: "WORKS_DIRECTOR" } });
  if (!dtrav) throw new Error("WORKS_DIRECTOR introuvable");
  const sids = dtrav.assignedSiteIds;
  if (sids.length === 0) throw new Error("DTrav n'a pas de chantiers assignés");

  const sites = await prisma.site.findMany({
    where: { id: { in: sids } },
    select: { id: true, code: true, name: true, tenantId: true, plannedEndDate: true },
    take: 5,
  });
  console.log("Cible : " + sites.length + " chantiers de Paul ETOUNDI\n");

  // ─── Module 4 : Planning ───
  console.log("Module 4 — Planning :");
  for (const site of sites.slice(0, 3)) {
    let planning = await prisma.sitePlanning.findFirst({ where: { siteId: site.id } });
    if (!planning) {
      const endD = site.plannedEndDate ?? new Date(2027, 5, 30);
      const duration = Math.ceil((endD.getTime() - new Date(2026, 0, 15).getTime()) / 86_400_000);
      planning = await prisma.sitePlanning.create({
        data: { siteId: site.id, totalDurationDays: duration },
      });
    }
    const phasesData = [
      { name: "Préparation & terrassements", plannedStart: new Date(2026, 0, 15), plannedEnd: new Date(2026, 2, 28), progressPercent: 100, status: "COMPLETED" },
      { name: "Gros œuvre", plannedStart: new Date(2026, 3, 1), plannedEnd: new Date(2026, 8, 30), progressPercent: 45, status: "IN_PROGRESS" },
      { name: "Second œuvre", plannedStart: new Date(2026, 9, 1), plannedEnd: new Date(2027, 2, 31), progressPercent: 0, status: "PLANNED" },
      { name: "Finitions & livraison", plannedStart: new Date(2027, 3, 1), plannedEnd: new Date(2027, 5, 30), progressPercent: 0, status: "PLANNED" },
    ];
    for (const [i, p] of phasesData.entries()) {
      const existing = await prisma.sitePhase.findFirst({ where: { planningId: planning.id, name: p.name } });
      if (!existing) {
        await prisma.sitePhase.create({
          data: {
            planningId: planning.id,
            orderIndex: i + 1,
            name: p.name,
            plannedStart: p.plannedStart,
            plannedEnd: p.plannedEnd,
            progressPercent: p.progressPercent,
            status: p.status,
            actualStart: p.progressPercent > 0 ? p.plannedStart : null,
            actualEnd: p.progressPercent === 100 ? p.plannedEnd : null,
          },
        });
      }
    }
    const milestonesData = [
      { code: "J1", description: "Fin terrassement", contractDueDate: new Date(2026, 2, 28), actualDate: new Date(2026, 2, 26), status: "REACHED" },
      { code: "J2", description: "Pose 1er étage", contractDueDate: new Date(2026, 6, 15), status: "UPCOMING" },
      { code: "J3", description: "Hors-eau hors-air", contractDueDate: new Date(2026, 11, 20), status: "UPCOMING" },
    ];
    for (const m of milestonesData) {
      const existing = await prisma.siteMilestone.findFirst({ where: { planningId: planning.id, code: m.code } });
      if (!existing) {
        await prisma.siteMilestone.create({
          data: {
            planningId: planning.id,
            code: m.code,
            description: m.description,
            contractDueDate: m.contractDueDate,
            actualDate: m.actualDate ?? null,
            status: m.status,
            moaValidation: m.status === "REACHED",
          },
        });
      }
    }
    console.log("  ✓ " + site.code + " : 4 phases + 3 jalons");
  }

  // ─── Module 5 : Avenants ───
  console.log("\nModule 5 — Avenants :");
  const contracts = await prisma.clientContract.findMany({
    where: { siteId: { in: sids } },
    take: 3,
  });
  let amendCount = 0;
  for (const c of contracts) {
    const existing = await prisma.contractAmendment.findFirst({ where: { siteId: c.siteId, reason: "Prolongation pour intempéries saison des pluies" } });
    if (!existing) {
      await prisma.contractAmendment.create({
        data: {
          siteId: c.siteId,
          reference: `AVE-${c.siteId.slice(-6).toUpperCase()}`,
          amount: BigInt(15_000_000),
          extraDays: 30,
          reason: "Prolongation pour intempéries saison des pluies",
          justification: "Pluviométrie exceptionnelle d'octobre 2025 (+45 mm vs moyenne 30 ans). Photos chantier + bulletin météo Météo Cameroun joints.",
          status: "DRAFT",
          initiatedById: dtrav.id,
        },
      });
      amendCount++;
    }
  }
  console.log("  ✓ " + amendCount + " avenants DRAFT créés (" + contracts.length + " contrats ciblés)");

  // ─── Module 7 : Documents chantier ───
  console.log("\nModule 7 — Documents :");
  const docTypes = [
    { category: "RECEPTION_PV", title: "PV réception travaux terrassement", fileSize: 245_000 },
    { category: "MOA_CORRESPONDENCE", title: "Rapport hebdomadaire S20", fileSize: 180_000 },
    { category: "FIELD_PHOTOS", title: "Photos avancement étage 1", fileSize: 1_240_000 },
    { category: "EXECUTION_PLANS", title: "Plans corrigés architecte", fileSize: 3_500_000 },
  ];
  let docCount = 0;
  for (const site of sites.slice(0, 2)) {
    for (const d of docTypes) {
      const existing = await prisma.siteDocument.findFirst({ where: { siteId: site.id, title: d.title } });
      if (!existing) {
        await prisma.siteDocument.create({
          data: {
            siteId: site.id,
            title: d.title,
            category: d.category,
            fileName: d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".pdf",
            fileUrl: "/seed/" + d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".pdf",
            fileSize: d.fileSize,
            mimeType: "application/pdf",
            uploadedById: dtrav.id,
          },
        });
        docCount++;
      }
    }
  }
  console.log("  ✓ " + docCount + " documents créés");

  // ─── Module 8 : Validations PENDING ───
  console.log("\nModule 8 — Validations N1 :");
  const tids = Array.from(new Set(sites.map(s => s.tenantId)));
  const valData = [
    { type: "PURCHASE", title: "BC ciment 250 sacs · CIMENCAM", amount: 4_500_000n },
    { type: "PURCHASE", title: "Location grue 30 jours · LOCATECH", amount: 8_700_000n },
    { type: "EXPENSE", title: "Réparation pelle hydraulique CAT", amount: 2_100_000n },
  ];
  let valCount = 0;
  for (const v of valData) {
    const ref = `VAL-DTRAV-${v.type}-${v.amount.toString().slice(0, 4)}`;
    const existing = await prisma.validation.findFirst({ where: { reference: ref } });
    if (!existing) {
      await prisma.validation.create({
        data: {
          tenantId: tids[0],
          type: v.type,
          reference: ref,
          title: v.title,
          amount: v.amount,
          initiatorId: dtrav.id,
          status: "PENDING",
          currentStep: "DTRAV",
          workflow: [{ role: "DTRAV", level: 1 }, { role: "DAF", level: 2 }],
          comments: [],
          dtValidationRequired: false,
          dueDate: new Date(Date.now() + 7 * 86400000),
        },
      });
      valCount++;
    }
  }
  console.log("  ✓ " + valCount + " validations PENDING créées");

  // ─── Module 9 : Rapports MOA ───
  console.log("\nModule 9 — Rapports MOA :");
  let moaCount = 0;
  for (const site of sites.slice(0, 2)) {
    for (const period of ["2026-W19", "2026-W20"]) {
      const existing = await prisma.moaReport.findFirst({ where: { siteId: site.id, period } });
      if (!existing) {
        await prisma.moaReport.create({
          data: {
            siteId: site.id,
            reportType: "WEEKLY_PROGRESS",
            period,
            content: {
              summary: period === "2026-W19"
                ? "Phase gros œuvre · niveau 2 coulé · 142 m³ béton"
                : "Pose ferraillage niveau 3 · livraison fer attendue J+3",
              achievements: ["Coulage dalle niveau 2 finalisé", "Réception béton conforme cahier des charges"],
              issues: ["Retard livraison fer · -3 jours sur planning initial"],
              nextWeek: ["Ferraillage niveau 3", "Coulage poteaux"],
              progressPercent: period === "2026-W19" ? 42 : 45,
              workforceAverage: 32,
            },
            sentTo: ["moa@mincom.cm"],
            authorId: dtrav.id,
          },
        });
        moaCount++;
      }
    }
  }
  console.log("  ✓ " + moaCount + " rapports MOA hebdo créés");

  console.log("\n🎉 Seed DTrav terminé. Reconnecte-toi en Paul ETOUNDI pour voir les données.");
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
