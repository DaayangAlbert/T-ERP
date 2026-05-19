// Synchronise les magasins (Warehouse) avec les chantiers (Site) existants :
// pour chaque chantier qui n'a pas encore de magasin associé, crée un
// Warehouse de scope=CHANTIER avec un code/nom dérivés du chantier.
//
// Idempotent : ré-exécution sûre. Ne touche pas aux magasins existants.
//
// Usage : node scripts/sync-warehouses-from-sites.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Synchronisation des magasins avec les chantiers existants...\n");

  // Récupère tous les chantiers actifs (non archivés), tous tenants confondus.
  const sites = await prisma.site.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: {
      id: true,
      tenantId: true,
      code: true,
      name: true,
      managerId: true,
      warehouse: { select: { id: true } },
      tenant: { select: { slug: true, name: true } },
    },
    orderBy: [{ tenantId: "asc" }, { code: "asc" }],
  });

  const missing = sites.filter((s) => s.warehouse === null);

  console.log(`Chantiers actifs total          : ${sites.length}`);
  console.log(`Chantiers avec magasin          : ${sites.length - missing.length}`);
  console.log(`Chantiers SANS magasin (à créer): ${missing.length}\n`);

  if (missing.length === 0) {
    console.log("✓ Aucun magasin manquant. Rien à faire.");
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const site of missing) {
    const code = `MAG-${site.code}`;
    const name = `Magasin ${site.name}`;

    // Garde-fou : si un code identique existe déjà dans le tenant
    // (cas d'un magasin manuel précédemment renommé), on saute pour ne
    // pas violer l'unique (tenantId, code).
    const dupe = await prisma.warehouse.findFirst({
      where: { tenantId: site.tenantId, code },
      select: { id: true },
    });
    if (dupe) {
      console.log(`  ⚠  [${site.tenant?.slug}] ${site.code} — code "${code}" déjà pris, skip`);
      skipped++;
      continue;
    }

    await prisma.warehouse.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        code,
        name,
        scope: "CHANTIER",
        // Le keeper du magasin est le SITE_MANAGER du chantier par défaut.
        // Le DRH/Logistique pourra l'ajuster plus tard si nécessaire.
        keeperId: site.managerId,
      },
    });
    console.log(`  ✓ [${site.tenant?.slug}] ${site.code} → ${code} (${name})`);
    created++;
  }

  console.log(`\n✓ ${created} magasin${created > 1 ? "s" : ""} créé${created > 1 ? "s" : ""}`);
  if (skipped > 0) console.log(`  ${skipped} chantier${skipped > 1 ? "s" : ""} ignoré${skipped > 1 ? "s" : ""} (code déjà utilisé)`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Erreur :", err);
  await prisma.$disconnect();
  process.exit(1);
});
