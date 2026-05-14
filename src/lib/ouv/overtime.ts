/**
 * Calcul des heures supplémentaires selon la convention collective BTP
 * Cameroun (Code du Travail + accords sectoriels BTP).
 *
 * Tranches appliquées à la journée de travail :
 *   - 1-8h    : heures normales (taux standard 100%)
 *   - 8-10h   : majoration 110%  → overtime110
 *   - 10-12h  : majoration 125%  → overtime125 (déjà existant côté Payslip)
 *   - Nuit 22h-6h     : majoration 150%  → overtime150
 *   - Dimanche/férié  : majoration 200%  → overtime200
 *
 * Le calcul se fait sur la durée totale arrivée → sortie, moins la pause
 * (60 min par défaut). Les majorations supérieures cumulent les inférieures
 * dans `overtimeHours` (total brut), mais les répartitions par taux sont
 * stockées séparément pour le bulletin de paie.
 *
 * Note simplification fn 1.2 : on ne distingue ici que diurne / nuit /
 * dimanche-férié. Le découpage 110/125 dans la journée de semaine et la
 * détection des jours fériés CM exhaustifs viendront en V2 quand RH livrera
 * son calendrier officiel.
 */

const STANDARD_HOURS = 8;
const BREAK_MINUTES_DEFAULT = 60;

export interface OvertimeBreakdown {
  totalHours: number;
  standardHours: number;
  overtimeHours: number;
  overtimeHours125: number; // diurne au-delà de 8h
  overtimeHours150: number; // nuit 22h-6h
  overtimeHours200: number; // dimanche/férié
  overtimeType: string | null; // "evening_125" | "night_150" | "sunday_200" | null
}

export function computeOvertime(
  arrival: Date,
  departure: Date,
  options: { breakMinutes?: number; isHoliday?: boolean } = {}
): OvertimeBreakdown {
  const breakMinutes = options.breakMinutes ?? BREAK_MINUTES_DEFAULT;
  const elapsedMs = departure.getTime() - arrival.getTime();
  if (elapsedMs <= 0) {
    return {
      totalHours: 0,
      standardHours: 0,
      overtimeHours: 0,
      overtimeHours125: 0,
      overtimeHours150: 0,
      overtimeHours200: 0,
      overtimeType: null,
    };
  }

  const grossHours = elapsedMs / 3_600_000;
  const totalHours = Math.max(0, grossHours - breakMinutes / 60);

  // Détection nuit / dimanche / férié sur l'arrivée (cas typique chantier)
  const isSunday = arrival.getDay() === 0;
  const isNight =
    arrival.getHours() >= 22 || arrival.getHours() < 6;
  const isHolidayOrSunday = isSunday || options.isHoliday === true;

  let overtimeHours125 = 0;
  let overtimeHours150 = 0;
  let overtimeHours200 = 0;
  let overtimeType: string | null = null;

  if (totalHours > STANDARD_HOURS) {
    const over = totalHours - STANDARD_HOURS;
    if (isHolidayOrSunday) {
      overtimeHours200 = over;
      overtimeType = "sunday_200";
    } else if (isNight) {
      overtimeHours150 = over;
      overtimeType = "night_150";
    } else {
      overtimeHours125 = over;
      overtimeType = "evening_125";
    }
  }

  const overtimeHours = overtimeHours125 + overtimeHours150 + overtimeHours200;
  const standardHours = Math.min(totalHours, STANDARD_HOURS);

  return {
    totalHours: round1(totalHours),
    standardHours: round1(standardHours),
    overtimeHours: round1(overtimeHours),
    overtimeHours125: round1(overtimeHours125),
    overtimeHours150: round1(overtimeHours150),
    overtimeHours200: round1(overtimeHours200),
    overtimeType,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
