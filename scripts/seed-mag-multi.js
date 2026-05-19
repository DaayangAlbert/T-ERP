require("./_guard-prod");
/**
 * Crée 3 magasins supplémentaires sur des chantiers de filiales différentes
 * pour démontrer la vue consolidée DG/DAF (groupe BatimCAM SA) :
 *
 *   - Magasin Échangeur Olembé      (CHT-2026-022 · batimcam-yaounde)
 *   - Magasin Hôpital Garoua        (CHT-2026-001 · batimcam-douala)
 *   - Magasin Voirie Bonabéri       (CHT-2026-014 · batimcam-logistique)
 *
 * Chaque magasin a un profil d'articles + stocks + mouvements adapté au type
 * de chantier (voirie, bâtiment hospitalier, voirie urbaine).
 *
 * Lance après seed-mag.js. Idempotent : delete + recreate par siteId.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 3 profils d'articles différenciés. Code BTP partagé entre tenants ; Prisma exige
// unique [tenantId, code] donc chaque tenant a sa propre copie de l'article.
const CATALOG = {
  // Voirie urbaine — granulats / bitume / engins
  VOIRIE: [
    { code: "CIM-HPC", name: "Ciment HPC 42,5 R (sac 50kg)", category: "CEMENT_CONCRETE", unit: "sac", pmp: 6500, minThreshold: 60, qty: 220 },
    { code: "GRAV-525", name: "Gravier 5/25", category: "AGGREGATES", unit: "m³", pmp: 12000, minThreshold: 40, qty: 180 },
    { code: "SAB-04", name: "Sable 0/4", category: "AGGREGATES", unit: "m³", pmp: 8500, minThreshold: 30, qty: 95 },
    { code: "BITUME-50", name: "Émulsion bitume 50/100", category: "OTHER", unit: "T", pmp: 450000, minThreshold: 5, qty: 12 },
    { code: "GASOIL", name: "Gasoil moteurs / engins", category: "FUEL", unit: "L", pmp: 730, minThreshold: 800, qty: 2400 },
    { code: "HUILE-MOT", name: "Huile moteur 15W40", category: "FUEL", unit: "L", pmp: 4200, minThreshold: 30, qty: 65 },
    { code: "CASQUE-W", name: "Casque chantier blanc", category: "PPE", unit: "u", pmp: 4500, minThreshold: 20, qty: 32 },
    { code: "GANT-COTON", name: "Gants coton (paire)", category: "PPE", unit: "paire", pmp: 600, minThreshold: 80, qty: 150 },
    { code: "BANCHE-3M", name: "Banche métallique 3×1,2m", category: "FORMWORK", unit: "u", pmp: 85000, minThreshold: 10, qty: 6 },
  ],
  // Bâtiment hospitalier — gros volumes acier/ciment + finition
  HOSPITAL: [
    { code: "CIM-HPC", name: "Ciment HPC 42,5 R (sac 50kg)", category: "CEMENT_CONCRETE", unit: "sac", pmp: 6500, minThreshold: 100, qty: 320 },
    { code: "CIM-CEM2", name: "Ciment CEM II 32,5 (sac 50kg)", category: "CEMENT_CONCRETE", unit: "sac", pmp: 5800, minThreshold: 60, qty: 140 },
    { code: "BETON-C25", name: "Béton prêt à l'emploi C25/30", category: "CEMENT_CONCRETE", unit: "m³", pmp: 90000, minThreshold: 8, qty: 4 },
    { code: "AC-HA10", name: "Acier HA10 (barre 6m)", category: "STEEL_REBAR", unit: "barre", pmp: 6500, minThreshold: 80, qty: 220 },
    { code: "AC-HA12", name: "Acier HA12 (barre 6m)", category: "STEEL_REBAR", unit: "barre", pmp: 9200, minThreshold: 60, qty: 145 },
    { code: "AC-HA14", name: "Acier HA14 (barre 6m)", category: "STEEL_REBAR", unit: "barre", pmp: 12500, minThreshold: 40, qty: 85 },
    { code: "FIL-LIG", name: "Fil de ligature recuit", category: "STEEL_REBAR", unit: "kg", pmp: 1800, minThreshold: 30, qty: 110 },
    { code: "BOIS-CP", name: "Contreplaqué bakélisé 18mm (2,5×1,25)", category: "FORMWORK", unit: "panneau", pmp: 22000, minThreshold: 25, qty: 78 },
    { code: "ETAI-3M", name: "Étai métallique 3m", category: "FORMWORK", unit: "u", pmp: 12000, minThreshold: 40, qty: 95 },
    { code: "CASQUE-W", name: "Casque chantier blanc", category: "PPE", unit: "u", pmp: 4500, minThreshold: 30, qty: 18 },
    { code: "BOTTES", name: "Bottes sécurité S3", category: "PPE", unit: "paire", pmp: 18000, minThreshold: 25, qty: 12 },
    { code: "GASOIL", name: "Gasoil moteurs / engins", category: "FUEL", unit: "L", pmp: 730, minThreshold: 600, qty: 980 },
  ],
  // Voirie urbaine légère (logistique) — magasin tampon
  URBAN: [
    { code: "GRAV-525", name: "Gravier 5/25", category: "AGGREGATES", unit: "m³", pmp: 12000, minThreshold: 20, qty: 55 },
    { code: "SAB-04", name: "Sable 0/4", category: "AGGREGATES", unit: "m³", pmp: 8500, minThreshold: 15, qty: 38 },
    { code: "CIM-HPC", name: "Ciment HPC 42,5 R (sac 50kg)", category: "CEMENT_CONCRETE", unit: "sac", pmp: 6500, minThreshold: 40, qty: 25 },
    { code: "FORET-12", name: "Foret béton 12mm", category: "CONSUMABLES", unit: "u", pmp: 3500, minThreshold: 10, qty: 18 },
    { code: "DISQ-COUP", name: "Disque coupe métal 230", category: "CONSUMABLES", unit: "u", pmp: 1800, minThreshold: 15, qty: 42 },
    { code: "GANT-COTON", name: "Gants coton (paire)", category: "PPE", unit: "paire", pmp: 600, minThreshold: 50, qty: 80 },
    { code: "BOTTES", name: "Bottes sécurité S3", category: "PPE", unit: "paire", pmp: 18000, minThreshold: 10, qty: 8 },
    { code: "GASOIL", name: "Gasoil moteurs / engins", category: "FUEL", unit: "L", pmp: 730, minThreshold: 300, qty: 420 },
    { code: "PELLE", name: "Pelle ronde manche bois", category: "TOOLS", unit: "u", pmp: 5500, minThreshold: 5, qty: 11 },
    { code: "TRUELLE", name: "Truelle maçon 28cm", category: "TOOLS", unit: "u", pmp: 4200, minThreshold: 8, qty: 14 },
  ],
};

// 3 chantiers cibles, chacun sur une filiale différente.
const TARGETS = [
  {
    siteCode: "CHT-2026-022",
    warehouseCode: "MAG-OLEMBE",
    warehouseName: "Magasin Échangeur Olembé",
    profile: "VOIRIE",
    movements: [
      { code: "GASOIL", dir: "IN", qty: 1500, unit: 720, ref: "BL-TOTAL-0921", reason: "PURCHASE_DELIVERY", daysAgo: 2 },
      { code: "GRAV-525", dir: "IN", qty: 80, unit: 11800, ref: "BL-CIMSAH-0212", reason: "PURCHASE_DELIVERY", daysAgo: 1 },
      { code: "BITUME-50", dir: "IN", qty: 5, unit: 445000, ref: "BL-SHELL-0044", reason: "PURCHASE_DELIVERY", daysAgo: 1 },
      { code: "GASOIL", dir: "OUT", qty: 320, unit: 730, ref: "BS-2026-0201", reason: "CONSUMPTION_ENGINE", daysAgo: 0 },
      { code: "GRAV-525", dir: "OUT", qty: 22, unit: 12000, ref: "BS-2026-0202", reason: "CONSUMPTION_TEAM", daysAgo: 0 },
      { code: "CIM-HPC", dir: "OUT", qty: 60, unit: 6500, ref: "BS-2026-0203", reason: "CONSUMPTION_TEAM", daysAgo: 0 },
    ],
    inventory: { type: "MONTHLY", scope: "Inventaire mensuel global", daysAhead: 5 },
  },
  {
    siteCode: "CHT-2026-001",
    warehouseCode: "MAG-GAROUA",
    warehouseName: "Magasin Hôpital Garoua",
    profile: "HOSPITAL",
    movements: [
      { code: "AC-HA12", dir: "IN", qty: 80, unit: 9000, ref: "BL-METAL-0345", reason: "PURCHASE_DELIVERY", daysAgo: 3 },
      { code: "CIM-HPC", dir: "IN", qty: 200, unit: 6450, ref: "BL-CIMSAH-0098", reason: "PURCHASE_DELIVERY", daysAgo: 2 },
      { code: "BOIS-CP", dir: "IN", qty: 30, unit: 22500, ref: "BL-FORESTRY-0021", reason: "PURCHASE_DELIVERY", daysAgo: 4 },
      { code: "CIM-HPC", dir: "OUT", qty: 95, unit: 6500, ref: "BS-2026-0501", reason: "CONSUMPTION_TEAM", daysAgo: 1 },
      { code: "AC-HA10", dir: "OUT", qty: 45, unit: 6500, ref: "BS-2026-0502", reason: "CONSUMPTION_TEAM", daysAgo: 0 },
    ],
    inventory: { type: "ROLLING_BIWEEKLY", scope: "category:STEEL_REBAR", daysAhead: 2 },
  },
  {
    siteCode: "CHT-2026-014",
    warehouseCode: "MAG-BONABERI",
    warehouseName: "Magasin Voirie Bonabéri",
    profile: "URBAN",
    movements: [
      { code: "GASOIL", dir: "IN", qty: 600, unit: 725, ref: "BL-TOTAL-0934", reason: "PURCHASE_DELIVERY", daysAgo: 1 },
      { code: "SAB-04", dir: "IN", qty: 18, unit: 8400, ref: "BL-CARRIERE-0118", reason: "PURCHASE_DELIVERY", daysAgo: 3 },
      { code: "GASOIL", dir: "OUT", qty: 145, unit: 730, ref: "BS-2026-0301", reason: "CONSUMPTION_ENGINE", daysAgo: 0 },
      { code: "GANT-COTON", dir: "OUT", qty: 25, unit: 600, ref: "BS-2026-0302", reason: "CONSUMPTION_TEAM", daysAgo: 0 },
    ],
  },
];

(async () => {
  console.log("🌱 Seed magasins multi-chantiers (vue consolidée groupe)…\n");

  let totalArticles = 0;
  let totalStocks = 0;
  let totalMovements = 0;
  let totalInventories = 0;

  for (const target of TARGETS) {
    const site = await prisma.site.findFirst({
      where: { code: target.siteCode },
      select: { id: true, tenantId: true, name: true },
    });
    if (!site) {
      console.warn(`  ⚠ Site ${target.siteCode} introuvable, skip`);
      continue;
    }

    // Cleanup idempotent
    await prisma.warehouse.deleteMany({ where: { siteId: site.id } });

    const warehouse = await prisma.warehouse.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        code: target.warehouseCode,
        name: target.warehouseName,
      },
    });
    console.log(`  ✓ ${warehouse.code} · ${warehouse.name} (site ${target.siteCode})`);

    const profile = CATALOG[target.profile];
    let stockValue = 0;
    const articlesByCode = new Map();

    for (const a of profile) {
      // Upsert article par (tenantId, code) — chaque filiale a sa copie.
      const existing = await prisma.article.findFirst({
        where: { tenantId: site.tenantId, code: a.code },
      });
      const article = existing
        ? await prisma.article.update({
            where: { id: existing.id },
            data: { name: a.name, category: a.category, unit: a.unit, active: true },
          })
        : await prisma.article.create({
            data: {
              tenantId: site.tenantId,
              code: a.code,
              name: a.name,
              category: a.category,
              unit: a.unit,
            },
          });
      articlesByCode.set(a.code, article);
      if (!existing) totalArticles++;

      const totalVal = Math.round(a.qty * a.pmp);
      await prisma.warehouseStock.create({
        data: {
          warehouseId: warehouse.id,
          articleId: article.id,
          quantity: a.qty,
          pmpUnitPrice: BigInt(a.pmp),
          totalValue: BigInt(totalVal),
          minThreshold: a.minThreshold,
          lastInAt: new Date(),
        },
      });
      stockValue += totalVal;
      totalStocks++;
    }
    console.log(`    · ${profile.length} articles · ${(stockValue / 1_000_000).toFixed(1)} M FCFA en stock`);

    // Mouvements (utilise Lucas comme recorder, ou le premier WAREHOUSE/TENANT_ADMIN dispo)
    const recorder = await prisma.user.findFirst({
      where: { OR: [{ email: "lucas@batimcam.cm" }, { role: "TENANT_ADMIN" }] },
      select: { id: true },
    });
    if (recorder) {
      for (const m of target.movements) {
        const article = articlesByCode.get(m.code);
        if (!article) continue;
        await prisma.warehouseMovement.create({
          data: {
            warehouseId: warehouse.id,
            articleId: article.id,
            direction: m.dir,
            quantity: m.qty,
            unitPrice: BigInt(m.unit),
            totalValue: BigInt(m.qty * m.unit),
            reference: m.ref,
            reason: m.reason,
            recordedById: recorder.id,
            occurredAt: new Date(Date.now() - m.daysAgo * 86_400_000),
          },
        });
        totalMovements++;
      }
      console.log(`    · ${target.movements.length} mouvements`);
    }

    // Inventaire optionnel
    if (target.inventory) {
      const inv = await prisma.warehouseInventory.create({
        data: {
          warehouseId: warehouse.id,
          type: target.inventory.type,
          scope: target.inventory.scope,
          plannedDate: new Date(Date.now() + target.inventory.daysAhead * 86_400_000),
          status: "PLANNED",
        },
      });
      console.log(`    · 1 inventaire ${inv.type} planifié J+${target.inventory.daysAhead}`);
      totalInventories++;
    }
  }

  console.log("\n=== Récap consolidé groupe BatimCAM SA ===");
  const allWarehouses = await prisma.warehouse.findMany({
    include: { site: { select: { code: true, name: true } } },
  });
  const allStocks = await prisma.warehouseStock.aggregate({ _sum: { totalValue: true } });
  const allMovs = await prisma.warehouseMovement.count();
  const allInv = await prisma.warehouseInventory.count({ where: { status: { in: ["PLANNED", "IN_PROGRESS"] } } });
  console.log(`  • ${allWarehouses.length} magasins :`);
  for (const w of allWarehouses) {
    const stk = await prisma.warehouseStock.aggregate({
      where: { warehouseId: w.id },
      _sum: { totalValue: true },
      _count: true,
    });
    console.log(`    - ${w.code} · ${w.name} · ${stk._count} articles · ${(Number(stk._sum.totalValue) / 1_000_000).toFixed(1)} M FCFA`);
  }
  console.log(`  • Valeur totale stock groupe : ${(Number(allStocks._sum.totalValue) / 1_000_000).toFixed(1)} M FCFA`);
  console.log(`  • Mouvements totaux : ${allMovs}`);
  console.log(`  • Inventaires en cours/planifiés : ${allInv}`);

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
