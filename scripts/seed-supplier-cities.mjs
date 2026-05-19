import "./_guard-prod.js";
// Backfille le champ `city` des fournisseurs existants pour activer le
// regroupement géographique de la vue DG. Stratégie :
//   1) Si l'`address` contient un nom de ville connu, on extrait
//   2) Sinon, on assigne aléatoirement selon la distribution BTP Cameroun
//      (Douala 35 %, Yaoundé 40 %, Bafoussam 10 %, Garoua/Bamenda/autres 15 %)

import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const KNOWN_CITIES = [
  "Yaoundé", "Yaounde",
  "Douala",
  "Bafoussam",
  "Garoua",
  "Bamenda",
  "Maroua",
  "Limbé", "Limbe",
  "Kribi",
  "Edéa", "Edea",
  "Ngaoundéré", "Ngaoundere",
  "Bertoua",
  "Dschang",
  "Buea",
  "Kumba",
  "Foumban",
];

const NORMALIZE = {
  "Yaounde": "Yaoundé",
  "Limbe": "Limbé",
  "Edea": "Edéa",
  "Ngaoundere": "Ngaoundéré",
};

function extractCity(address) {
  if (!address) return null;
  for (const c of KNOWN_CITIES) {
    if (new RegExp(`\\b${c}\\b`, "i").test(address)) {
      return NORMALIZE[c] ?? c;
    }
  }
  return null;
}

// Distribution pondérée (somme = 100)
const WEIGHTED = [
  { city: "Yaoundé", weight: 40 },
  { city: "Douala", weight: 35 },
  { city: "Bafoussam", weight: 10 },
  { city: "Garoua", weight: 5 },
  { city: "Bamenda", weight: 4 },
  { city: "Kribi", weight: 3 },
  { city: "Maroua", weight: 2 },
  { city: "Buea", weight: 1 },
];

function pickWeighted() {
  const total = WEIGHTED.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const w of WEIGHTED) {
    r -= w.weight;
    if (r <= 0) return w.city;
  }
  return WEIGHTED[0].city;
}

async function main() {
  const suppliers = await p.supplier.findMany({
    where: { city: null },
    select: { id: true, name: true, address: true, category: true, isSubcontractor: true },
  });
  console.log(`Backfill ville sur ${suppliers.length} fournisseurs (city=null)...`);

  let fromAddress = 0;
  let fromRandom = 0;
  let updates = 0;

  for (const s of suppliers) {
    const extracted = extractCity(s.address);
    const city = extracted ?? pickWeighted();
    if (extracted) fromAddress++; else fromRandom++;

    await p.supplier.update({ where: { id: s.id }, data: { city } });
    updates++;
  }

  console.log(`✓ ${updates} fournisseurs mis à jour`);
  console.log(`   ${fromAddress} via extraction de l'adresse, ${fromRandom} via distribution pondérée`);

  // Récap par ville
  const byCity = await p.supplier.groupBy({
    by: ["city"],
    _count: { _all: true },
    orderBy: { _count: { city: "desc" } },
  });
  console.log("\nRépartition par ville :");
  for (const c of byCity) {
    console.log(`  ${c.city ?? "(null)"} : ${c._count._all}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
