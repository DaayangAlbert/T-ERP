require("./_guard-prod");
// Seed démo : peuple les magasins (Warehouse) avec des stocks crédibles.
//
// Étapes :
//   1. Réplique le catalogue Article du tenant parent (BatimCAM SA) vers
//      chaque filiale qui n'a pas encore d'articles (chaque filiale est
//      autonome côté catalogue, conformément au schéma multi-tenant).
//   2. Pour chaque Warehouse de scope=CHANTIER, crée 6 à 10
//      WarehouseStock avec quantités, PMP et seuils réalistes BTP.
//   3. Idempotent : safe à rejouer (les WarehouseStock existants sont
//      mis à jour, pas recréés).
//
// Usage : node scripts/seed-warehouse-stocks.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Échantillons de quantité/prix par catégorie (cohérent BTP Cameroun)
const STOCK_PROFILES = {
  CEMENT_CONCRETE: { qtyMin: 80, qtyMax: 400, priceMin: 4500, priceMax: 9000, threshold: 50 },
  STEEL_REBAR:     { qtyMin: 200, qtyMax: 1500, priceMin: 3500, priceMax: 12000, threshold: 100 },
  AGGREGATES:      { qtyMin: 50, qtyMax: 300, priceMin: 6000, priceMax: 18000, threshold: 30 },
  FORMWORK:        { qtyMin: 20, qtyMax: 120, priceMin: 12000, priceMax: 45000, threshold: 15 },
  FUEL:            { qtyMin: 500, qtyMax: 4000, priceMin: 800, priceMax: 950, threshold: 200 },
  CONSUMABLES:     { qtyMin: 50, qtyMax: 500, priceMin: 800, priceMax: 8000, threshold: 30 },
  TOOLS:           { qtyMin: 5, qtyMax: 50, priceMin: 15000, priceMax: 250000, threshold: 3 },
  PPE:             { qtyMin: 30, qtyMax: 300, priceMin: 2500, priceMax: 25000, threshold: 20 },
  OTHER:           { qtyMin: 10, qtyMax: 200, priceMin: 1000, priceMax: 50000, threshold: 10 },
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

async function main() {
  console.log("Seed des stocks magasin...\n");

  // ──────────────────────────────────────────────────────────────
  // 1) Réplique le catalogue Article dans chaque filiale qui n'en a pas
  // ──────────────────────────────────────────────────────────────
  const allTenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, slug: true, name: true, parentId: true, isGroup: true },
  });
  const parentTenants = allTenants.filter((t) => t.isGroup || t.parentId === null);
  const sourceTenant = parentTenants[0]; // par défaut le premier tenant principal trouvé
  if (!sourceTenant) {
    console.error("Aucun tenant source trouvé.");
    process.exit(1);
  }

  const sourceArticles = await prisma.article.findMany({
    where: { tenantId: sourceTenant.id, active: true },
  });
  console.log(`Catalogue source : ${sourceArticles.length} articles (tenant ${sourceTenant.slug})\n`);

  for (const tenant of allTenants) {
    if (tenant.id === sourceTenant.id) continue;
    const count = await prisma.article.count({ where: { tenantId: tenant.id } });
    if (count > 0) {
      console.log(`  [${tenant.slug}] ${count} articles déjà présents, skip`);
      continue;
    }
    if (sourceArticles.length === 0) continue;
    await prisma.article.createMany({
      data: sourceArticles.map((a) => ({
        tenantId: tenant.id,
        code: a.code,
        name: a.name,
        category: a.category,
        unit: a.unit,
        conversionUnit: a.conversionUnit,
        defaultSupplierId: null, // on ne réplique pas les fournisseurs
        active: true,
      })),
      skipDuplicates: true,
    });
    console.log(`  [${tenant.slug}] ${sourceArticles.length} articles répliqués`);
  }
  console.log();

  // ──────────────────────────────────────────────────────────────
  // 2) Crée des stocks dans chaque Warehouse de scope=CHANTIER
  // ──────────────────────────────────────────────────────────────
  // Note : Warehouse n'a pas de relation `tenant` côté Prisma (juste FK
  // scalaire tenantId). On indexe les slugs séparément pour l'affichage.
  const tenantSlugById = new Map(allTenants.map((t) => [t.id, t.slug]));
  const warehouses = await prisma.warehouse.findMany({
    where: { scope: "CHANTIER" },
  });
  console.log(`Magasins de chantier à peupler : ${warehouses.length}\n`);

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const w of warehouses) {
    // Récupère les articles du tenant du magasin
    const articles = await prisma.article.findMany({
      where: { tenantId: w.tenantId, active: true },
    });
    if (articles.length === 0) {
      console.log(`  ⚠ [${tenantSlugById.get(w.tenantId)}] ${w.code} : aucun article dans ce tenant, skip`);
      continue;
    }

    // Sélectionne 6 à 10 articles aléatoires (et le ciment + l'acier
    // systématiquement présents si dispo, ce sont les basiques BTP)
    const mandatory = articles.filter((a) =>
      ["CEMENT_CONCRETE", "STEEL_REBAR"].includes(a.category)
    );
    const optional = articles.filter(
      (a) => !["CEMENT_CONCRETE", "STEEL_REBAR"].includes(a.category)
    );
    const picked = [
      ...pickRandom(mandatory, Math.min(3, mandatory.length)),
      ...pickRandom(optional, rand(3, 7)),
    ];

    let createdHere = 0;
    let updatedHere = 0;

    for (const a of picked) {
      const profile = STOCK_PROFILES[a.category] ?? STOCK_PROFILES.OTHER;
      const quantity = rand(profile.qtyMin, profile.qtyMax);
      const pmpUnitPrice = BigInt(rand(profile.priceMin, profile.priceMax));
      const totalValue = pmpUnitPrice * BigInt(quantity);
      const minThreshold = profile.threshold;

      const existing = await prisma.warehouseStock.findUnique({
        where: { warehouseId_articleId: { warehouseId: w.id, articleId: a.id } },
        select: { id: true },
      });

      if (existing) {
        await prisma.warehouseStock.update({
          where: { id: existing.id },
          data: { quantity, pmpUnitPrice, totalValue, minThreshold },
        });
        updatedHere++;
      } else {
        await prisma.warehouseStock.create({
          data: {
            warehouseId: w.id,
            articleId: a.id,
            quantity,
            pmpUnitPrice,
            totalValue,
            minThreshold,
            lastInAt: new Date(Date.now() - rand(1, 30) * 86_400_000),
          },
        });
        createdHere++;
      }
    }

    totalCreated += createdHere;
    totalUpdated += updatedHere;
    console.log(
      `  ✓ [${tenantSlugById.get(w.tenantId)}] ${w.code} : ${createdHere} créé${createdHere > 1 ? "s" : ""}, ${updatedHere} mis à jour`
    );
  }

  console.log(`\n✓ Total : ${totalCreated} stocks créés, ${totalUpdated} mis à jour sur ${warehouses.length} magasins.`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Erreur :", err);
  await prisma.$disconnect();
  process.exit(1);
});
