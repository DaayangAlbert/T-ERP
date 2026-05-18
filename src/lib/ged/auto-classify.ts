/**
 * Service d'auto-classification documentaire.
 *
 * Étant donné un nom de fichier (et optionnellement un siteId), tente de
 * détecter une `DocumentClassification` par préfixe (ex: `PEX-2026-0142.pdf`
 * → préfixe `PEX`) et de résoudre l'espace cible (`DocumentSpace`).
 *
 * Si rien n'est trouvé, renvoie `{ classificationId: null, spaceId: null }` ;
 * le document apparaîtra alors dans la liste « à classer manuellement ».
 */
import { prisma } from "@/lib/prisma";
import {
  ClassificationCategory,
  type DuaTrigger,
  type DocumentClassification,
} from "@prisma/client";

// Pattern strict : majuscules / underscores, 2 à 6 caractères, suivi de "-" ou "_"
// Exemples détectés : PEX-2026-0142 · BC-2026-018 · BS_2026_04_albert · CTR-2026-001
const PREFIX_RE = /^([A-Z][A-Z0-9_]{1,5})[-_]/;

export interface AutoClassifyHint {
  /** Si fourni, le préfixe explicite l'emporte sur la détection par nom. */
  explicitPrefix?: string;
  /** Si l'utilisateur a explicitement choisi un espace, on respecte. */
  explicitSpaceId?: string;
  /** Indice contexte chantier. */
  siteId?: string;
}

export interface AutoClassifyResult {
  classificationId: string | null;
  spaceId: string | null;
  classification: DocumentClassification | null;
  detectedPrefix: string | null;
  reason: "explicit-space" | "by-prefix" | "by-category-fallback" | "unclassified";
}

export function extractPrefix(filename: string): string | null {
  const base = filename.replace(/^.*[\\/]/, ""); // remove path
  const match = base.match(PREFIX_RE);
  return match ? match[1] : null;
}

/**
 * Résout l'espace cible à partir d'une classification + contexte.
 *
 * Règles :
 *   - Si explicitSpaceId fourni → on l'utilise (et on vérifie qu'il existe
 *     dans le tenant).
 *   - Si classification.category == TECHNICAL et siteId fourni → cherche
 *     l'espace `CONSTRUCTION_SITE` de ce site.
 *   - Sinon → cherche le premier espace `spaceType` correspondant à la
 *     catégorie de la classification (mapping ci-dessous).
 *   - Sinon → null (doc apparaîtra non rangé dans son espace).
 */
const CATEGORY_TO_SPACE_TYPE: Record<ClassificationCategory, string | null> = {
  MARKETS: "MARKETS_CONTRACTS",
  TECHNICAL: null, // résolu via siteId
  HR: "HR",
  ACCOUNTING: "ACCOUNTING",
  LEGAL: "LEGAL",
  QSE: "QSE",
  OTHER: "OTHER",
};

async function resolveSpaceId(
  tenantId: string,
  classification: DocumentClassification | null,
  hint: AutoClassifyHint,
): Promise<string | null> {
  if (hint.explicitSpaceId) {
    const exists = await prisma.documentSpace.findFirst({
      where: { id: hint.explicitSpaceId, tenantId, active: true },
      select: { id: true },
    });
    return exists?.id ?? null;
  }
  if (!classification) return null;

  // Catégorie TECHNIQUE + siteId → espace chantier
  if (classification.category === ClassificationCategory.TECHNICAL && hint.siteId) {
    const siteSpace = await prisma.documentSpace.findFirst({
      where: {
        tenantId,
        siteId: hint.siteId,
        active: true,
        spaceType: "CONSTRUCTION_SITE",
      },
      select: { id: true },
    });
    if (siteSpace) return siteSpace.id;
  }

  // Mapping catégorie → spaceType transverse
  const targetType = CATEGORY_TO_SPACE_TYPE[classification.category];
  if (!targetType) return null;
  const space = await prisma.documentSpace.findFirst({
    where: {
      tenantId,
      active: true,
      spaceType: targetType as any,
    },
    select: { id: true },
  });
  return space?.id ?? null;
}

export async function autoClassify(
  tenantId: string,
  filename: string,
  hint: AutoClassifyHint = {},
): Promise<AutoClassifyResult> {
  const detectedPrefix = hint.explicitPrefix ?? extractPrefix(filename);

  let classification: DocumentClassification | null = null;
  if (detectedPrefix) {
    classification = await prisma.documentClassification.findFirst({
      where: { tenantId, prefix: detectedPrefix, active: true },
    });
  }

  const spaceId = await resolveSpaceId(tenantId, classification, hint);

  let reason: AutoClassifyResult["reason"];
  if (hint.explicitSpaceId && spaceId) reason = "explicit-space";
  else if (classification && spaceId) reason = "by-prefix";
  else if (!classification && spaceId) reason = "by-category-fallback";
  else reason = "unclassified";

  return {
    classificationId: classification?.id ?? null,
    spaceId,
    classification,
    detectedPrefix,
    reason,
  };
}

/**
 * Calcule la date de fin de DUA (Durée d'Utilité Administrative).
 *
 * - CREATION_DATE       → createdAt + duaYears
 * - END_OF_FISCAL_YEAR  → fin de l'année calendaire de createdAt + duaYears
 * - PROJECT_CLOSURE     → plannedEndDate du site + duaYears (fallback +5y)
 * - EMPLOYEE_DEPARTURE  → createdAt + 99y (placeholder ; à raffiner avec
 *                         endOfContract réel)
 * - OTHER               → createdAt + duaYears
 */
export async function computeDuaEndDate(
  createdAt: Date,
  duaYears: number | null,
  duaTrigger: DuaTrigger,
  siteId: string | null,
): Promise<Date> {
  const years = duaYears ?? 5;
  if (duaTrigger === "END_OF_FISCAL_YEAR") {
    const eoy = new Date(createdAt.getFullYear(), 11, 31, 23, 59, 59);
    return new Date(eoy.getFullYear() + years, 11, 31);
  }
  if (duaTrigger === "PROJECT_CLOSURE" && siteId) {
    const site = await prisma.site.findFirst({
      where: { id: siteId },
      select: { plannedEndDate: true },
    });
    if (site) {
      const base = site.plannedEndDate;
      return new Date(base.getFullYear() + years, base.getMonth(), base.getDate());
    }
  }
  if (duaTrigger === "EMPLOYEE_DEPARTURE") {
    return new Date(createdAt.getFullYear() + 99, createdAt.getMonth(), createdAt.getDate());
  }
  // CREATION_DATE + OTHER (default)
  return new Date(createdAt.getFullYear() + years, createdAt.getMonth(), createdAt.getDate());
}

/**
 * Génère la prochaine référence interne pour un préfixe donné :
 * <PREFIX>-<YYYY>-<NNNN> (NNNN sur 4 chiffres, incrémenté).
 */
export async function nextInternalReference(
  tenantId: string,
  prefix: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;
  const last = await prisma.document.findFirst({
    where: {
      tenantId,
      internalReference: { startsWith: pattern },
    },
    orderBy: { internalReference: "desc" },
    select: { internalReference: true },
  });
  const lastNum = last?.internalReference
    ? Number(last.internalReference.replace(pattern, "")) || 0
    : 0;
  return `${pattern}${String(lastNum + 1).padStart(4, "0")}`;
}
