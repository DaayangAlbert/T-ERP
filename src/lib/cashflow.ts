/**
 * Logique métier de la trésorerie prévisionnelle (Phase 2 / fn 1.4).
 *
 * - Découpe l'horizon en N semaines glissantes à partir d'une date de référence.
 * - Agrège les flux pondérés (amount × probability/100) par semaine.
 * - Calcule le solde projeté semaine par semaine à partir d'un solde initial.
 * - Détecte les semaines sous le seuil critique.
 */

import { CashFlowType, type CashFlowProjection } from "@prisma/client";

export const CRITICAL_THRESHOLD = 50_000_000; // 50 M FCFA
export const COMFORT_THRESHOLD = 200_000_000; // 200 M FCFA

export interface WeeklyBreakdown {
  weekIndex: number;
  isoWeek: number;
  isoYear: number;
  weekLabel: string; // "S20"
  startDate: string; // ISO du lundi
  endDate: string; // ISO du dimanche
  openingBalance: number;
  clientPayments: number;
  otherIncome: number;
  totalIncome: number;
  suppliers: number;
  salaries: number;
  taxes: number;
  totalExpense: number;
  closingBalance: number;
  level: "ok" | "warning" | "critical";
}

export interface CashFlowProjectionDto {
  id: string;
  type: CashFlowType;
  category: string;
  label: string;
  amount: string;
  expectedDate: string;
  probability: number;
  sourceType: string | null;
  realized: boolean;
}

export interface ProjectionResult {
  weeks: WeeklyBreakdown[];
  initialBalance: number;
  finalBalance: number;
  totalIncome: number;
  totalExpense: number;
  criticalWeeks: WeeklyBreakdown[];
  thresholds: { critical: number; comfort: number };
}

/**
 * Retourne le lundi de la semaine ISO contenant `d`.
 */
export function startOfIsoWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  return date;
}

export function endOfIsoWeek(d: Date): Date {
  const start = startOfIsoWeek(d);
  start.setDate(start.getDate() + 6);
  start.setHours(23, 59, 59, 999);
  return start;
}

/**
 * Numéro de semaine ISO 8601 + année ISO (peuvent différer de l'année calendaire).
 */
export function isoWeekOf(d: Date): { week: number; year: number } {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  // Algorithme ISO 8601 (jeudi de la semaine)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const diff = (date.getTime() - week1.getTime()) / 86_400_000;
  const week = 1 + Math.round((diff - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return { week, year: date.getFullYear() };
}

function categorize(p: { type: CashFlowType; category: string; amount: number; probability: number }) {
  const value = p.type === CashFlowType.INCOME ? p.amount * (p.probability / 100) : p.amount;
  if (p.type === CashFlowType.INCOME) {
    return p.category === "CLIENT_PAYMENT"
      ? { kind: "clientPayments" as const, value }
      : { kind: "otherIncome" as const, value };
  }
  if (p.category === "SALARY") return { kind: "salaries" as const, value };
  if (p.category.startsWith("TAX_")) return { kind: "taxes" as const, value };
  return { kind: "suppliers" as const, value };
}

export function calculateProjection(
  projections: Pick<CashFlowProjection, "id" | "type" | "category" | "amount" | "expectedDate" | "probability">[],
  options: { initialBalance: number; weeks?: number; startDate?: Date }
): ProjectionResult {
  const totalWeeks = options.weeks ?? 12;
  const referenceMonday = startOfIsoWeek(options.startDate ?? new Date());

  // Préparer les buckets
  const weeks: WeeklyBreakdown[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    const start = new Date(referenceMonday);
    start.setDate(referenceMonday.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const iso = isoWeekOf(start);
    weeks.push({
      weekIndex: i,
      isoWeek: iso.week,
      isoYear: iso.year,
      weekLabel: `S${iso.week}`,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      openingBalance: 0,
      clientPayments: 0,
      otherIncome: 0,
      totalIncome: 0,
      suppliers: 0,
      salaries: 0,
      taxes: 0,
      totalExpense: 0,
      closingBalance: 0,
      level: "ok",
    });
  }

  // Agréger les flux dans la bonne semaine
  for (const p of projections) {
    const date = new Date(p.expectedDate);
    if (date < referenceMonday) continue;
    const weekIndex = Math.floor((date.getTime() - referenceMonday.getTime()) / (7 * 86_400_000));
    if (weekIndex < 0 || weekIndex >= totalWeeks) continue;
    const c = categorize({
      type: p.type,
      category: p.category,
      amount: Number(p.amount),
      probability: p.probability,
    });
    const w = weeks[weekIndex];
    w[c.kind] += c.value;
  }

  // Calcul des soldes
  let running = options.initialBalance;
  let totalIncome = 0;
  let totalExpense = 0;
  for (const w of weeks) {
    w.totalIncome = w.clientPayments + w.otherIncome;
    w.totalExpense = w.suppliers + w.salaries + w.taxes;
    w.openingBalance = running;
    running = running + w.totalIncome - w.totalExpense;
    w.closingBalance = running;
    totalIncome += w.totalIncome;
    totalExpense += w.totalExpense;
    w.level =
      w.closingBalance < CRITICAL_THRESHOLD
        ? "critical"
        : w.closingBalance < COMFORT_THRESHOLD
          ? "warning"
          : "ok";
  }

  return {
    weeks,
    initialBalance: options.initialBalance,
    finalBalance: running,
    totalIncome,
    totalExpense,
    criticalWeeks: weeks.filter((w) => w.level === "critical"),
    thresholds: { critical: CRITICAL_THRESHOLD, comfort: COMFORT_THRESHOLD },
  };
}

export function detectCriticalWeeks(result: ProjectionResult): WeeklyBreakdown[] {
  return result.criticalWeeks;
}
