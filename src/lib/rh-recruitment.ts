/**
 * Synthèse de candidatures démo pour le pipeline kanban RH (487 personnes
 * synthétiques sont déjà cohérentes côté Personnel ; ici on génère ~58
 * candidatures réparties sur 5 colonnes du kanban).
 */
import type { AppStage } from "@prisma/client";

export interface SyntheticApplication {
  id: string;
  candidateName: string;
  position: string;
  region: string;
  stage: AppStage;
  appliedAt: string;
  email: string;
  phone: string;
  scoring: { technical: number; soft: number; motivation: number; overall: number };
  isSynthetic: true;
}

const NAMES = [
  "Hervé MOUKAM", "Sylvie ATANGANA", "Thierry NJOYA", "Achille BIYIK",
  "Aïssatou BOUBA", "Pascal NGOMBA", "Marie KAMENI", "Jean-Pierre DJIOZE",
  "Émeline TONYÉ", "Fabrice BIDIAS", "Claudette ZAMBO", "Adrien MEDOU",
  "Yolande FOLEFACK", "Boris OWONA", "Christine DOOH", "Frédéric ESSO",
  "Hortense BETI", "Maxime YOMBI", "Aurore BAKARY", "Cyrille ETOUNDI",
  "Pauline NDONGO", "Jérôme MOUDIO", "Madeleine WANDJI", "Rolex EWANE",
  "Théodore TIETCHEU", "Florence ZOA", "Marc TONYE", "Solange FONKOUA",
];
const POSITIONS = [
  "Ingénieur travaux BTP", "Conducteur de travaux", "Chef de chantier",
  "Comptable senior", "Assistant·e RH", "Conducteur engins TP",
  "Magasinier expérimenté", "Logisticien chantier", "Géomètre topographe",
  "Métreur", "Responsable HSE", "Chargé d'affaires", "Acheteur projets",
];
const REGIONS = ["Centre", "Littoral", "Ouest", "Nord", "Sud", "Est"];

const STAGE_DISTRIBUTION: Record<AppStage, number> = {
  RECEIVED: 28,
  SHORTLISTED: 15,
  INTERVIEW: 8,
  TECHNICAL_TEST: 4,
  OFFER: 0,
  HIRED: 3,
  REJECTED: 0,
  WITHDRAWN: 0,
  EXPIRED: 0,
};

function pseudoRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

let CACHE: SyntheticApplication[] | null = null;
export function getSyntheticApplications(): SyntheticApplication[] {
  if (CACHE) return CACHE;
  const rand = pseudoRandom(73209);
  const list: SyntheticApplication[] = [];
  let id = 0;
  const today = Date.now();
  (Object.keys(STAGE_DISTRIBUTION) as AppStage[]).forEach((stage) => {
    const count = STAGE_DISTRIBUTION[stage];
    for (let i = 0; i < count; i++) {
      const name = NAMES[Math.floor(rand() * NAMES.length)];
      const position = POSITIONS[Math.floor(rand() * POSITIONS.length)];
      const region = REGIONS[Math.floor(rand() * REGIONS.length)];
      const daysAgo = 1 + Math.floor(rand() * 60);
      const appliedAt = new Date(today - daysAgo * 86_400_000).toISOString();
      const technical = 50 + Math.floor(rand() * 50);
      const soft = 50 + Math.floor(rand() * 50);
      const motivation = 60 + Math.floor(rand() * 40);
      const overall = Math.round((technical + soft + motivation) / 3);
      const slug = name.toLowerCase().replace(/[^a-z]/g, "");
      list.push({
        id: `app_${id.toString(36).padStart(4, "0")}`,
        candidateName: name,
        position,
        region,
        stage,
        appliedAt,
        email: `${slug}@gmail.cm`,
        phone: `+237 6 ${77 + Math.floor(rand() * 23)} ${10 + Math.floor(rand() * 89)} ${10 + Math.floor(rand() * 89)} ${10 + Math.floor(rand() * 89)}`,
        scoring: { technical, soft, motivation, overall },
        isSynthetic: true,
      });
      id++;
    }
  });
  CACHE = list;
  return list;
}

// État mutable pour les changements de stage en cours de session
const STAGE_OVERRIDES = new Map<string, AppStage>();
export function setOverrideStage(id: string, stage: AppStage) {
  STAGE_OVERRIDES.set(id, stage);
}
export function getEffectiveStage(app: SyntheticApplication): AppStage {
  return STAGE_OVERRIDES.get(app.id) ?? app.stage;
}

export function getActiveOffers() {
  return [
    {
      reference: "REC-2026-008",
      title: "Ingénieur travaux BTP",
      department: "Direction Technique",
      contractType: "CDI",
      category: "Cadre M2",
      positions: 3,
      region: "Centre",
      status: "PUBLISHED",
      publishedAt: "2026-04-15",
      applicationsCount: 32,
    },
    {
      reference: "REC-2026-009",
      title: "Conducteur de travaux",
      department: "Direction des travaux",
      contractType: "CDI",
      category: "Cadre M2",
      positions: 2,
      region: "Centre",
      status: "PUBLISHED",
      publishedAt: "2026-04-22",
      applicationsCount: 28,
    },
    {
      reference: "REC-2026-010",
      title: "Comptable senior",
      department: "DAF",
      contractType: "CDI",
      category: "ETAM",
      positions: 1,
      region: "Centre",
      status: "PUBLISHED",
      publishedAt: "2026-04-30",
      applicationsCount: 18,
    },
    {
      reference: "REC-2026-011",
      title: "Magasinier expérimenté",
      department: "Logistique",
      contractType: "CDI",
      category: "ETAM",
      positions: 2,
      region: "Littoral",
      status: "PUBLISHED",
      publishedAt: "2026-05-02",
      applicationsCount: 41,
    },
    {
      reference: "REC-2026-012",
      title: "Chef de chantier (2 postes)",
      department: "Direction des travaux",
      contractType: "CDD",
      category: "Maîtrise M3",
      positions: 2,
      region: "Centre",
      status: "PUBLISHED",
      publishedAt: "2026-05-05",
      applicationsCount: 23,
    },
  ];
}
