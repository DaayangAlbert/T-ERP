/**
 * Helpers de rendu du bulletin officiel (template T-ERP BTP).
 *
 * Quatre familles :
 *   1. amountToWords   — montant FCFA en lettres françaises
 *   2. categorizeLine  — code ligne → PayslipLineCategory (fallback si null)
 *   3. yearlyCumulative — cumul depuis le 1er janvier de l'année courante
 *   4. leaveAndAbsence  — congés acquis/pris/solde + absences/retards
 */
import { PayslipLineCategory, PayslipLineCategory as Cat, type Prisma, type PrismaClient } from "@prisma/client";

// ════════════════════════════════════════════════════════════════════════
// 1) MONTANT EN LETTRES (FR-CM, francs CFA)
// ════════════════════════════════════════════════════════════════════════

const UNITS = [
  "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept",
  "dix-huit", "dix-neuf",
];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function spellBelow1000(n: number): string {
  if (n === 0) return "";
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      const base = TENS[t];
      const rest = 10 + u;
      return u === 1 && t !== 7 ? `${base} et ${UNITS[rest]}` : `${base}-${UNITS[rest]}`;
    }
    if (u === 0) return TENS[t] + (t === 8 ? "s" : "");
    if (u === 1 && t !== 8) return `${TENS[t]} et un`;
    return `${TENS[t]}-${UNITS[u]}`;
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hundredsWord = h === 1 ? "cent" : `${UNITS[h]} cent${rest === 0 ? "s" : ""}`;
  return rest === 0 ? hundredsWord : `${hundredsWord} ${spellBelow1000(rest)}`;
}

/**
 * Convertit un montant FCFA en lettres françaises.
 * Ex: 890850 → "huit cent quatre-vingt-dix mille huit cent cinquante francs CFA"
 */
export function amountToWordsFr(amount: bigint | number): string {
  let n = typeof amount === "bigint" ? Number(amount) : Math.round(amount);
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "zéro franc CFA";

  const negative = n < 0;
  n = Math.abs(n);

  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;

  const parts: string[] = [];
  if (billions > 0) {
    parts.push(billions === 1 ? "un milliard" : `${spellBelow1000(billions)} milliards`);
  }
  if (millions > 0) {
    parts.push(millions === 1 ? "un million" : `${spellBelow1000(millions)} millions`);
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? "mille" : `${spellBelow1000(thousands)} mille`);
  }
  if (rest > 0) parts.push(spellBelow1000(rest));

  const result = parts.join(" ").trim();
  const currency = n > 1 ? "francs CFA" : "franc CFA";
  return `${negative ? "moins " : ""}${result} ${currency}`;
}

// ════════════════════════════════════════════════════════════════════════
// 2) CATÉGORISATION DES LIGNES (fallback si line.category est null)
// ════════════════════════════════════════════════════════════════════════

/**
 * Déduit la catégorie d'une ligne depuis son code, pour les bulletins
 * legacy où PayslipLine.category n'est pas renseigné.
 *
 * Convention codes existants (build-payslip-lines.ts) :
 *   A* → GAIN
 *   B001/B002/B004 (CNPS/CFC sal., CAC) → DEDUCTION_SOCIAL
 *   B003 (IRPP)  → DEDUCTION_FISCAL
 *   B005..B099 (avances, prêts, absences, autres) → DEDUCTION_OTHER
 *   C001..C004 (CNPS empl., alloc. fam., AT, CFC empl.) → EMPLOYER_SOCIAL
 *   C005+ (formation pro, médecine, FNE, autres) → EMPLOYER_OTHER
 */
export function categorizeLineByCode(code: string): PayslipLineCategory {
  const c = code.toUpperCase();
  if (c.startsWith("A")) return PayslipLineCategory.GAIN;
  if (c.startsWith("B")) {
    if (c === "B001" || c === "B002" || c === "B004") return PayslipLineCategory.DEDUCTION_SOCIAL;
    if (c === "B003") return PayslipLineCategory.DEDUCTION_FISCAL;
    return PayslipLineCategory.DEDUCTION_OTHER;
  }
  if (c.startsWith("C")) {
    const num = Number(c.slice(1));
    if (Number.isFinite(num) && num <= 4) return PayslipLineCategory.EMPLOYER_SOCIAL;
    return PayslipLineCategory.EMPLOYER_OTHER;
  }
  return PayslipLineCategory.DEDUCTION_OTHER;
}

// ════════════════════════════════════════════════════════════════════════
// 3) CUMULS ANNUELS
// ════════════════════════════════════════════════════════════════════════

export interface YearlyCumulatives {
  /** Cumul des salaires (Axxx "salaire" + "heures sup") depuis le 1er janvier */
  cumulSalary: bigint;
  /** Cumul des primes & indemnités (transport, logement, primes diverses) */
  cumulBonuses: bigint;
  /** Cumul des heures supplémentaires en montant */
  cumulOvertime: bigint;
  /** Cumul brut taxable */
  cumulTaxable: bigint;
  /** Cumul des retenues totales */
  cumulDeductions: bigint;
  /** Cumul net à payer */
  cumulNet: bigint;
}

const ZERO_CUMUL: YearlyCumulatives = {
  cumulSalary: 0n,
  cumulBonuses: 0n,
  cumulOvertime: 0n,
  cumulTaxable: 0n,
  cumulDeductions: 0n,
  cumulNet: 0n,
};

type PrismaLike = PrismaClient | Prisma.TransactionClient;

/**
 * Somme les bulletins de l'utilisateur depuis le 1er janvier de la période
 * jusqu'à la période incluse. Utilisé pour le bloc "Cumuls annuels" du bulletin.
 */
export async function getYearlyCumulatives(
  prisma: PrismaLike,
  userId: string,
  period: Date
): Promise<YearlyCumulatives> {
  // Voir note timezone dans ensureBulletinNumber : on utilise les accesseurs
  // locaux pour rester aligné sur le mois calendaire affiché.
  const year = period.getFullYear();
  const month = period.getMonth();
  const start = new Date(year, 0, 1);
  const end = new Date(year, month + 1, 1);

  const slips = await prisma.payslip.findMany({
    where: {
      userId,
      period: { gte: start, lt: end },
      status: { not: "CANCELLED" },
    },
    select: {
      baseSalary: true,
      overtimeAmount: true,
      transportAllowance: true,
      seniorityBonus: true,
      otherBonuses: true,
      grossAmount: true,
      taxableGross: true,
      netAmount: true,
      cnpsAmount: true,
      irppAmount: true,
      otherDeductions: true,
      socialCharges: true,
      fiscalCharges: true,
    },
  });

  if (slips.length === 0) return { ...ZERO_CUMUL };

  return slips.reduce<YearlyCumulatives>((acc, s) => {
    const otherBonusesAmount = sumOtherBonuses(s.otherBonuses);
    acc.cumulSalary += s.baseSalary ?? 0n;
    acc.cumulOvertime += s.overtimeAmount;
    acc.cumulBonuses += s.transportAllowance + s.seniorityBonus + otherBonusesAmount;
    acc.cumulTaxable += s.taxableGross;
    acc.cumulDeductions += s.socialCharges + s.fiscalCharges + s.otherDeductions;
    acc.cumulNet += s.netAmount;
    return acc;
  }, { ...ZERO_CUMUL });
}

function sumOtherBonuses(raw: unknown): bigint {
  if (!Array.isArray(raw)) return 0n;
  return raw.reduce<bigint>((sum, item) => {
    if (item && typeof item === "object" && "amount" in item) {
      const v = (item as { amount: unknown }).amount;
      if (typeof v === "number") return sum + BigInt(Math.round(v));
      if (typeof v === "string") {
        try { return sum + BigInt(v); } catch { return sum; }
      }
      if (typeof v === "bigint") return sum + v;
    }
    return sum;
  }, 0n);
}

// ════════════════════════════════════════════════════════════════════════
// 4) CONGÉS & ABSENCES
// ════════════════════════════════════════════════════════════════════════

export interface LeaveAndAbsenceStats {
  paidLeaveAcquired: number;
  paidLeaveTaken: number;
  paidLeaveRemaining: number;
  unjustifiedAbsenceDays: number;
  delayHours: number;
}

/**
 * Récupère le solde de congés et les absences/retards de l'utilisateur
 * sur la période donnée (pour la section bas du bulletin).
 */
export async function getLeaveAndAbsenceStats(
  prisma: PrismaLike,
  userId: string,
  period: Date
): Promise<LeaveAndAbsenceStats> {
  const year = period.getFullYear();
  const month = period.getMonth();
  const periodStart = new Date(year, month, 1);
  const periodEnd = new Date(year, month + 1, 1);

  const [balance, absences] = await Promise.all([
    prisma.leaveBalance.findFirst({
      where: { userId, year },
      select: { paidLeaveAcquired: true, paidLeaveTaken: true, paidLeaveRemaining: true },
    }),
    prisma.absence.findMany({
      where: {
        employeeKey: userId,
        date: { gte: periodStart, lt: periodEnd },
        reason: { in: ["UNJUSTIFIED", "LATE"] },
      },
      select: { reason: true },
    }),
  ]);

  const unjustifiedAbsenceDays = absences.filter((a) => a.reason === "UNJUSTIFIED").length;
  // 1 retard ≈ 2h forfaitaires (ajustable si modèle plus précis ajouté plus tard)
  const delayHours = absences.filter((a) => a.reason === "LATE").length * 2;

  return {
    paidLeaveAcquired: balance?.paidLeaveAcquired ?? 0,
    paidLeaveTaken: balance?.paidLeaveTaken ?? 0,
    paidLeaveRemaining: balance?.paidLeaveRemaining ?? 0,
    unjustifiedAbsenceDays,
    delayHours,
  };
}

// ════════════════════════════════════════════════════════════════════════
// 5) Numéro officiel du bulletin
// ════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
// 6) Affichage des codes de ligne au format 4 chiffres (selon maquette officielle)
// ════════════════════════════════════════════════════════════════════════
//
// La BDD stocke des codes legacy (A001, B003, C001…) mais le bulletin officiel
// utilise un schéma à 4 chiffres : 01xx pour les gains, 31xx pour les retenues
// sociales, 32xx pour les fiscales, 33xx pour les autres, 41xx pour les
// charges patronales sociales, 42xx pour les autres charges patronales.
// Le numéro de séquence est attribué selon l'ordre d'apparition dans la catégorie.

const CATEGORY_PREFIX: Record<keyof typeof Cat, string> = {
  GAIN: "01",
  DEDUCTION_SOCIAL: "31",
  DEDUCTION_FISCAL: "32",
  DEDUCTION_OTHER: "33",
  EMPLOYER_SOCIAL: "41",
  EMPLOYER_OTHER: "42",
};

/**
 * Retourne le code affiché sur le bulletin (format 4 chiffres).
 * `indexInCategory` est l'index 1-based de la ligne dans sa catégorie.
 */
export function displayLineCode(category: Cat, indexInCategory: number): string {
  const prefix = CATEGORY_PREFIX[category];
  return `${prefix}${String(indexInCategory).padStart(2, "0")}`;
}

// ════════════════════════════════════════════════════════════════════════
// 7) Code de vérification format XXXX-XXXX-XXXX-XXXX
// ════════════════════════════════════════════════════════════════════════
//
// Le verificationUuid est un cuid (~24 chars). On le formate en 4 groupes
// de 4 caractères majuscules pour un affichage compact et lisible sur le
// bulletin (sous le QR code).

export function formatVerificationCode(uuid: string): string {
  const clean = uuid.replace(/-/g, "").toUpperCase();
  const padded = clean.padEnd(16, "0").slice(0, 16);
  return `${padded.slice(0, 4)}-${padded.slice(4, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}`;
}

/**
 * Format : BP-{YYYY}-{MM}-{NNNNNN} où NNNNNN est un compteur tenant/période.
 * Génération opportuniste : si la colonne `bulletinNumber` est déjà non-nulle
 * elle est retournée telle-quelle, sinon on calcule sur place et on persiste.
 */
export async function ensureBulletinNumber(
  prisma: PrismaLike,
  payslip: { id: string; tenantId: string; period: Date; bulletinNumber: string | null }
): Promise<string> {
  if (payslip.bulletinNumber) return payslip.bulletinNumber;

  // Les périodes en BDD sont stockées en UTC mais représentent un mois calendaire
  // local. En heure de Yaoundé (UTC+1), un Date(2026, 3, 1) local est sérialisé
  // en 2026-03-31T23:00Z. getUTCMonth() retourne alors 2 (mars) et fausse le
  // numéro. On utilise getMonth() pour rester aligné sur le mois local affiché.
  const yyyy = payslip.period.getFullYear();
  const month = payslip.period.getMonth();
  const mm = String(month + 1).padStart(2, "0");
  const monthStart = new Date(yyyy, month, 1);
  const monthEnd = new Date(yyyy, month + 1, 1);

  const existingCount = await prisma.payslip.count({
    where: {
      tenantId: payslip.tenantId,
      period: { gte: monthStart, lt: monthEnd },
      bulletinNumber: { not: null },
    },
  });
  const seq = String(existingCount + 1).padStart(6, "0");
  const generated = `BP-${yyyy}-${mm}-${seq}`;

  await prisma.payslip.update({
    where: { id: payslip.id },
    data: { bulletinNumber: generated },
  });

  return generated;
}
