/**
 * Synthèse déterministe d'un effectif RH démo (487 personnes).
 * Permet à l'écran Personnel de présenter une UX réaliste sans avoir à seeder
 * 487 lignes Prisma. Les ids commencent par "syn_" pour être identifiables.
 */

const FIRST_NAMES_M = [
  "Albert", "Hervé", "Thierry", "Jean-Pierre", "Pascal", "Émile", "Cyrille",
  "Daniel", "Paul", "Samuel", "Lucas", "Joseph", "Étienne", "Marius",
  "Boris", "Christian", "Olivier", "François", "Marc", "Aurélien", "Adrien",
  "Frédéric", "Patrice", "Jérôme", "Roland", "Henri", "Théodore", "Achille",
  "Léon", "Maxime", "Gilbert", "Fabrice", "Pierre", "Robert", "Édouard",
];
const FIRST_NAMES_F = [
  "Sandrine", "Marie", "Brigitte", "Sylvie", "Aïssatou", "Ngosse", "Ines",
  "Solange", "Bernadette", "Thérèse", "Marguerite", "Estelle", "Clarisse",
  "Florence", "Christine", "Yolande", "Pauline", "Aurore", "Monique",
  "Claudette", "Émeline", "Chantal", "Madeleine", "Hortense",
];
const LAST_NAMES = [
  "DAAYANG", "NGONO", "FOTSO", "ATANGANA", "MBALLA", "BIYIK", "ESSOMBA",
  "MOUKAM", "NJOYA", "ABEGA", "ETOUNDI", "TCHINDA", "KAMGA", "BIYELE",
  "TCHAMBA", "TCHOUA", "ATEBA", "ONANA", "MBELI", "KAMENI", "FONKOUA",
  "DJIOZE", "NDONGO", "BOUBA", "TIETCHEU", "TONYÉ", "BETI", "OWONA",
  "MOUDIO", "YOMBI", "DOOH", "EWANE", "ESSO", "ZAMBO", "BIDIAS",
  "ZOA", "MEDOU", "FOLEFACK", "TONYE", "WANDJI", "BAKARY",
];
const POSITIONS = [
  { title: "Directeur Général", category: "Cadre Sup HC", contract: "CDI" },
  { title: "Directeur technique", category: "Cadre Sup HC", contract: "CDI" },
  { title: "Directeur de travaux", category: "Cadre HC", contract: "CDI" },
  { title: "Conducteur de travaux", category: "Cadre M2", contract: "CDI" },
  { title: "Chef de chantier", category: "Maîtrise M3", contract: "CDI" },
  { title: "Ingénieur travaux", category: "Cadre M2", contract: "CDI" },
  { title: "Comptable principale", category: "ETAM", contract: "CDI" },
  { title: "Magasinier", category: "ETAM", contract: "CDI" },
  { title: "Logisticien", category: "ETAM", contract: "CDI" },
  { title: "Conducteur engins", category: "OQ N5", contract: "CDI" },
  { title: "Chef d'équipe coffrage", category: "OQ N5", contract: "CDI" },
  { title: "Maçon", category: "OS N3", contract: "CDD" },
  { title: "Ferrailleur", category: "OS N3", contract: "CDD" },
  { title: "Manœuvre", category: "OS N1", contract: "JOUR" },
  { title: "Gardien", category: "OS N2", contract: "CDI" },
  { title: "Chauffeur", category: "OQ N4", contract: "CDI" },
  { title: "Électricien bâtiment", category: "OQ N4", contract: "CDI" },
  { title: "Plombier", category: "OQ N4", contract: "CDD" },
  { title: "Carreleur", category: "OQ N4", contract: "CDD" },
  { title: "Peintre en bâtiment", category: "OS N3", contract: "JOUR" },
];
const SITES = [
  "Pont Mfoundi", "Lotissement Odza phase 2", "Bastos R+8", "Voirie Maroua",
  "Forage AEP Bafoussam", "Centre commercial Akwa", "Lycée Bamenda",
  "Siège Yaoundé", "Base logistique Douala", "Camp de base Bertoua",
];
const REGIONS = ["Centre", "Littoral", "Ouest", "Nord", "Sud", "Est", "Adamaoua"];

function pseudoRandom(seed: number): () => number {
  // LCG simple — déterministe par seed
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export interface SyntheticPersonnel {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  category: string;
  contractType: string;
  site: string;
  region: string;
  hireDate: string; // ISO date
  cnpsNumber: string;
  isSynthetic: true;
}

export function buildSyntheticPersonnel(target = 487): SyntheticPersonnel[] {
  const rand = pseudoRandom(424242);
  const list: SyntheticPersonnel[] = [];
  const startYear = 2009;
  for (let i = 0; i < target; i++) {
    const isFemale = rand() < 0.18; // ~18% femmes (réalité BTP Cameroun)
    const firstNames = isFemale ? FIRST_NAMES_F : FIRST_NAMES_M;
    const firstName = firstNames[Math.floor(rand() * firstNames.length)];
    const lastName = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const pos = POSITIONS[Math.floor(rand() * POSITIONS.length)];
    const site = SITES[Math.floor(rand() * SITES.length)];
    const region = REGIONS[Math.floor(rand() * REGIONS.length)];
    const year = startYear + Math.floor(rand() * 16); // 2009-2025
    const month = 1 + Math.floor(rand() * 12);
    const day = 1 + Math.floor(rand() * 28);
    const cnps = `10-${String(1000000 + i + 47).padStart(7, "0")}-${String.fromCharCode(65 + Math.floor(rand() * 26))}`;
    const matricule = `EMP-${year}-${String(i + 1).padStart(5, "0")}`;
    list.push({
      id: `syn_${i.toString(36)}`,
      matricule,
      firstName,
      lastName,
      email: `${firstName.toLowerCase().replace(/[^a-z]/g, "")}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@batimcam.cm`,
      phone: `+237 6 ${78 + Math.floor(rand() * 22)} ${10 + Math.floor(rand() * 89)} ${10 + Math.floor(rand() * 89)} ${10 + Math.floor(rand() * 89)}`,
      position: pos.title,
      category: pos.category,
      contractType: pos.contract,
      site,
      region,
      hireDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      cnpsNumber: cnps,
      isSynthetic: true,
    });
  }
  return list;
}

let CACHE: SyntheticPersonnel[] | null = null;
export function getSyntheticPersonnel(target = 487): SyntheticPersonnel[] {
  if (!CACHE) CACHE = buildSyntheticPersonnel(target);
  return CACHE;
}

export function categoriesList(): string[] {
  return Array.from(new Set(POSITIONS.map((p) => p.category))).sort();
}

export function sitesList(): string[] {
  return [...SITES].sort();
}
