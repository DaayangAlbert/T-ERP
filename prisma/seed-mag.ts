import "./_guard-prod";
/**
 * Seed complémentaire — données Magasinier (Lucas TIENTCHEU · Bloc 0 + Bloc 1).
 *
 * À lancer APRÈS le seed principal :
 *   pnpm exec tsx prisma/seed-mag.ts
 *
 * Ajoute :
 *  - Affecte Lucas TIENTCHEU au chantier Pont Mfoundi via assignedSiteIds
 *  - 1 Warehouse "Magasin Pont Mfoundi" (Lucas = keeper)
 *  - ~30 articles SYSCOHADA répartis sur 6 catégories (sample du catalogue 238)
 *  - WarehouseStock avec PMP par défaut + minThreshold
 *  - 1 WarehouseInventory IN_PROGRESS (tournant ciment) avec ses lignes
 *  - ~6 WarehouseMovement démo (3 IN + 3 OUT)
 */
import {
  PrismaClient,
  ArticleCategory,
  WarehouseMovementDirection,
  WarehouseMovementReason,
  WarehouseInventoryType,
  WarehouseInventoryStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const ARTICLES: Array<{ code: string; name: string; category: ArticleCategory; unit: string; pmp: number; minThreshold: number; initialStock: number }> = [
  // Ciment / béton
  { code: "CIM-HPC", name: "Ciment HPC 42,5 R (sac 50kg)", category: ArticleCategory.CEMENT_CONCRETE, unit: "sac", pmp: 6_500, minThreshold: 60, initialStock: 120 },
  { code: "CIM-CEM2", name: "Ciment CEM II 32,5 (sac 50kg)", category: ArticleCategory.CEMENT_CONCRETE, unit: "sac", pmp: 5_800, minThreshold: 40, initialStock: 80 },
  { code: "BETON-C25", name: "Béton prêt à l'emploi C25/30", category: ArticleCategory.CEMENT_CONCRETE, unit: "m³", pmp: 90_000, minThreshold: 5, initialStock: 12 },
  { code: "ADJUV-PLAS", name: "Adjuvant plastifiant", category: ArticleCategory.CEMENT_CONCRETE, unit: "L", pmp: 2_500, minThreshold: 20, initialStock: 45 },
  // Acier
  { code: "AC-HA8", name: "Acier HA8 (barre 6m)", category: ArticleCategory.STEEL_REBAR, unit: "barre", pmp: 4_200, minThreshold: 50, initialStock: 90 },
  { code: "AC-HA10", name: "Acier HA10 (barre 6m)", category: ArticleCategory.STEEL_REBAR, unit: "barre", pmp: 6_500, minThreshold: 40, initialStock: 75 },
  { code: "AC-HA12", name: "Acier HA12 (barre 6m)", category: ArticleCategory.STEEL_REBAR, unit: "barre", pmp: 9_200, minThreshold: 30, initialStock: 18 }, // rupture
  { code: "AC-HA14", name: "Acier HA14 (barre 6m)", category: ArticleCategory.STEEL_REBAR, unit: "barre", pmp: 12_500, minThreshold: 20, initialStock: 42 },
  { code: "FIL-LIG", name: "Fil de ligature recuit", category: ArticleCategory.STEEL_REBAR, unit: "kg", pmp: 1_800, minThreshold: 25, initialStock: 60 },
  // Granulats
  { code: "GRAV-525", name: "Gravier 5/25", category: ArticleCategory.AGGREGATES, unit: "m³", pmp: 12_000, minThreshold: 20, initialStock: 35 },
  { code: "SAB-04", name: "Sable 0/4", category: ArticleCategory.AGGREGATES, unit: "m³", pmp: 8_500, minThreshold: 15, initialStock: 28 },
  { code: "MOELLON", name: "Moellons", category: ArticleCategory.AGGREGATES, unit: "m³", pmp: 6_000, minThreshold: 10, initialStock: 22 },
  // Coffrage
  { code: "BOIS-CP", name: "Contreplaqué bakélisé 18mm (2,5×1,25)", category: ArticleCategory.FORMWORK, unit: "panneau", pmp: 22_000, minThreshold: 15, initialStock: 38 },
  { code: "MAD-25", name: "Madrier 2,5m × 8×22", category: ArticleCategory.FORMWORK, unit: "u", pmp: 4_500, minThreshold: 30, initialStock: 65 },
  { code: "ETAI-3M", name: "Étai métallique 3m", category: ArticleCategory.FORMWORK, unit: "u", pmp: 12_000, minThreshold: 20, initialStock: 48 },
  { code: "BANCHE-3M", name: "Banche métallique 3×1,2m", category: ArticleCategory.FORMWORK, unit: "u", pmp: 85_000, minThreshold: 8, initialStock: 14 },
  // Carburants
  { code: "GASOIL", name: "Gasoil moteurs / engins", category: ArticleCategory.FUEL, unit: "L", pmp: 730, minThreshold: 500, initialStock: 1_200 },
  { code: "ESSENCE", name: "Essence sans plomb", category: ArticleCategory.FUEL, unit: "L", pmp: 850, minThreshold: 100, initialStock: 80 }, // rupture
  { code: "HUILE-MOT", name: "Huile moteur 15W40", category: ArticleCategory.FUEL, unit: "L", pmp: 4_200, minThreshold: 20, initialStock: 35 },
  // Consommables
  { code: "FORET-12", name: "Foret béton 12mm", category: ArticleCategory.CONSUMABLES, unit: "u", pmp: 3_500, minThreshold: 10, initialStock: 22 },
  { code: "DISQ-COUP", name: "Disque coupe métal 230", category: ArticleCategory.CONSUMABLES, unit: "u", pmp: 1_800, minThreshold: 15, initialStock: 28 },
  { code: "VIS-SCEL", name: "Vis de scellement", category: ArticleCategory.CONSUMABLES, unit: "boîte", pmp: 8_500, minThreshold: 8, initialStock: 14 },
  { code: "GANT-COTON", name: "Gants coton (paire)", category: ArticleCategory.PPE, unit: "paire", pmp: 600, minThreshold: 50, initialStock: 120 },
  { code: "CASQUE-W", name: "Casque chantier blanc", category: ArticleCategory.PPE, unit: "u", pmp: 4_500, minThreshold: 20, initialStock: 38 },
  { code: "BOTTES", name: "Bottes sécurité S3", category: ArticleCategory.PPE, unit: "paire", pmp: 18_000, minThreshold: 15, initialStock: 32 },
  // Outillage
  { code: "MARTEAU", name: "Marteau charpentier 600g", category: ArticleCategory.TOOLS, unit: "u", pmp: 7_500, minThreshold: 5, initialStock: 12 },
  { code: "MERCURE", name: "Niveau à bulle 60cm", category: ArticleCategory.TOOLS, unit: "u", pmp: 8_900, minThreshold: 5, initialStock: 10 },
  { code: "PELLE", name: "Pelle ronde manche bois", category: ArticleCategory.TOOLS, unit: "u", pmp: 5_500, minThreshold: 8, initialStock: 18 },
  { code: "TRUELLE", name: "Truelle maçon 28cm", category: ArticleCategory.TOOLS, unit: "u", pmp: 4_200, minThreshold: 10, initialStock: 22 },
];

async function main() {
  console.log("🌱 Seed Magasinier (Lucas TIENTCHEU)...");

  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  if (tenants.length === 0) {
    console.error("Aucun tenant — lancez d'abord pnpm db:seed");
    return;
  }
  const tenant = tenants[0]; // BatimCAM SA mère

  const lucas = await prisma.user.findFirst({
    where: { email: "lucas@batimcam.cm" },
    select: { id: true },
  });
  if (!lucas) {
    console.error("Lucas TIENTCHEU introuvable (email lucas@batimcam.cm)");
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

  // 1) Affectation
  await prisma.user.update({
    where: { id: lucas.id },
    data: { assignedSiteIds: [pontMfoundi.id] },
  });
  console.log(`  ✓ Lucas TIENTCHEU assigné à Pont Mfoundi`);

  // 2) Articles
  await prisma.article.deleteMany({ where: { tenantId: tenant.id } });
  for (const a of ARTICLES) {
    await prisma.article.create({
      data: {
        tenantId: tenant.id,
        code: a.code,
        name: a.name,
        category: a.category,
        unit: a.unit,
      },
    });
  }
  console.log(`  ✓ ${ARTICLES.length} articles créés`);

  const articleByCode = new Map(
    (await prisma.article.findMany({ where: { tenantId: tenant.id } })).map((a) => [a.code, a])
  );

  // 3) Warehouse
  await prisma.warehouse.deleteMany({ where: { siteId: pontMfoundi.id } });
  const warehouse = await prisma.warehouse.create({
    data: {
      tenantId: pontMfoundi.tenantId,
      siteId: pontMfoundi.id,
      code: "MAG-PMF",
      name: "Magasin Pont Mfoundi",
      keeperId: lucas.id,
    },
  });
  console.log(`  ✓ Magasin Pont Mfoundi créé (keeper: Lucas)`);

  // 4) Stocks initiaux
  for (const a of ARTICLES) {
    const art = articleByCode.get(a.code);
    if (!art) continue;
    const totalValue = Math.round(a.initialStock * a.pmp);
    await prisma.warehouseStock.create({
      data: {
        warehouseId: warehouse.id,
        articleId: art.id,
        quantity: a.initialStock,
        pmpUnitPrice: BigInt(a.pmp),
        totalValue: BigInt(totalValue),
        minThreshold: a.minThreshold,
        lastInAt: new Date(),
      },
    });
  }
  const totalStockValue = ARTICLES.reduce((s, a) => s + a.initialStock * a.pmp, 0);
  console.log(`  ✓ ${ARTICLES.length} stocks valorisés · ${(totalStockValue / 1_000_000).toFixed(1)} M FCFA`);

  // 5) Mouvements démo (3 IN + 3 OUT sur les 7 derniers jours)
  const movements: Array<{ articleCode: string; direction: WarehouseMovementDirection; quantity: number; unitPrice: number; reference: string; reason: WarehouseMovementReason; daysAgo: number }> = [
    { articleCode: "CIM-HPC", direction: WarehouseMovementDirection.IN, quantity: 320, unitPrice: 6_400, reference: "BL-2026-0432", reason: WarehouseMovementReason.PURCHASE_DELIVERY, daysAgo: 4 },
    { articleCode: "AC-HA12", direction: WarehouseMovementDirection.IN, quantity: 50, unitPrice: 9_100, reference: "BL-2026-0441", reason: WarehouseMovementReason.PURCHASE_DELIVERY, daysAgo: 2 },
    { articleCode: "GASOIL", direction: WarehouseMovementDirection.IN, quantity: 500, unitPrice: 720, reference: "BL-TOTAL-0083", reason: WarehouseMovementReason.PURCHASE_DELIVERY, daysAgo: 1 },
    { articleCode: "CIM-HPC", direction: WarehouseMovementDirection.OUT, quantity: 42, unitPrice: 6_500, reference: "BS-2026-0142", reason: WarehouseMovementReason.CONSUMPTION_TEAM, daysAgo: 1 },
    { articleCode: "AC-HA10", direction: WarehouseMovementDirection.OUT, quantity: 18, unitPrice: 6_500, reference: "BS-2026-0143", reason: WarehouseMovementReason.CONSUMPTION_TEAM, daysAgo: 0 },
    { articleCode: "GASOIL", direction: WarehouseMovementDirection.OUT, quantity: 78, unitPrice: 730, reference: "BS-2026-0144", reason: WarehouseMovementReason.CONSUMPTION_ENGINE, daysAgo: 0 },
  ];
  for (const m of movements) {
    const art = articleByCode.get(m.articleCode);
    if (!art) continue;
    await prisma.warehouseMovement.create({
      data: {
        warehouseId: warehouse.id,
        articleId: art.id,
        direction: m.direction,
        quantity: m.quantity,
        unitPrice: BigInt(m.unitPrice),
        totalValue: BigInt(m.quantity * m.unitPrice),
        reference: m.reference,
        reason: m.reason,
        recordedById: lucas.id,
        occurredAt: new Date(Date.now() - m.daysAgo * 86_400_000),
      },
    });
  }
  console.log(`  ✓ ${movements.length} mouvements démo`);

  // 6) Inventaire tournant ciment IN_PROGRESS
  await prisma.warehouseInventory.deleteMany({ where: { warehouseId: warehouse.id } });
  const cimentArticles = ARTICLES.filter((a) => a.category === ArticleCategory.CEMENT_CONCRETE);
  const inv = await prisma.warehouseInventory.create({
    data: {
      warehouseId: warehouse.id,
      type: WarehouseInventoryType.ROLLING_MONTHLY,
      scope: "category:CEMENT_CONCRETE",
      plannedDate: new Date(Date.now() + 3 * 86_400_000),
      startedAt: new Date(),
      status: WarehouseInventoryStatus.IN_PROGRESS,
      lines: {
        create: cimentArticles.map((a) => {
          const art = articleByCode.get(a.code)!;
          return {
            articleId: art.id,
            theoreticalQty: a.initialStock,
            countedQty: 0,
            gap: -a.initialStock,
            gapValue: BigInt(0),
          };
        }),
      },
    },
  });
  console.log(`  ✓ Inventaire tournant ciment IN_PROGRESS (${cimentArticles.length} lignes)`);

  console.log("✅ Seed Magasinier terminé");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
