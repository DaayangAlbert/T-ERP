/**
 * Jours fériés camerounais et calcul des jours ouvrés.
 *
 * Une partie est fixe (Nouvel An, Fête nationale, Noël, etc.). Les dates
 * islamiques (Aïd el-Fitr, Aïd el-Adha "Tabaski", Mawlid) suivent le
 * calendrier lunaire — elles sont déclarées par le ministère de
 * l'Intérieur quelques jours avant. On hardcode les meilleures estimations
 * pour 2026, à mettre à jour annuellement.
 *
 * Côté Pâques (Vendredi Saint, Lundi de Pâques), on calcule via la formule
 * de Gauss anonymous → algorithm.
 */

export interface CameroonHoliday {
  date: string; // ISO YYYY-MM-DD
  name: string;
  type: "FIXED" | "MOVABLE_CHRISTIAN" | "MOVABLE_ISLAMIC";
}

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Estimations dates islamiques 2026 (à raffiner annuellement quand
// le ministère publie le calendrier officiel).
const ISLAMIC_2026: Record<string, string> = {
  EID_AL_FITR: "2026-03-20",
  EID_AL_ADHA: "2026-05-27", // Tabaski
  MAWLID: "2026-08-26",
};

export function getCameroonHolidays(year: number): CameroonHoliday[] {
  const easter = easterSunday(year);
  const goodFriday = addDays(easter, -2);
  const easterMonday = addDays(easter, 1);
  const ascension = addDays(easter, 39); // jeudi
  const pentecost = addDays(easter, 49); // dimanche

  const items: CameroonHoliday[] = [
    { date: `${year}-01-01`, name: "Jour de l'An", type: "FIXED" },
    { date: `${year}-02-11`, name: "Fête de la Jeunesse", type: "FIXED" },
    { date: iso(goodFriday), name: "Vendredi Saint", type: "MOVABLE_CHRISTIAN" },
    { date: iso(easterMonday), name: "Lundi de Pâques", type: "MOVABLE_CHRISTIAN" },
    { date: `${year}-05-01`, name: "Fête du Travail", type: "FIXED" },
    { date: `${year}-05-20`, name: "Fête de l'Unité Nationale", type: "FIXED" },
    { date: iso(ascension), name: "Ascension", type: "MOVABLE_CHRISTIAN" },
    { date: iso(pentecost), name: "Pentecôte", type: "MOVABLE_CHRISTIAN" },
    { date: `${year}-08-15`, name: "Assomption", type: "FIXED" },
    { date: `${year}-12-25`, name: "Noël", type: "FIXED" },
  ];

  if (year === 2026) {
    items.push({ date: ISLAMIC_2026.EID_AL_FITR, name: "Aïd el-Fitr", type: "MOVABLE_ISLAMIC" });
    items.push({ date: ISLAMIC_2026.EID_AL_ADHA, name: "Tabaski (Aïd el-Adha)", type: "MOVABLE_ISLAMIC" });
    items.push({ date: ISLAMIC_2026.MAWLID, name: "Mawlid", type: "MOVABLE_ISLAMIC" });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export function isHoliday(date: Date, holidays: CameroonHoliday[]): CameroonHoliday | null {
  const key = iso(date);
  return holidays.find((h) => h.date === key) ?? null;
}

/**
 * Compte les jours ouvrés entre startDate et endDate (inclus).
 * Les dimanches et jours fériés camerounais sont exclus.
 * Le samedi est considéré comme jour ouvré (pratique BTP Cameroun).
 */
export function countWorkingDays(startDate: Date, endDate: Date, holidays: CameroonHoliday[]): number {
  if (startDate > endDate) return 0;
  let count = 0;
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  while (cursor <= end) {
    const day = cursor.getUTCDay(); // 0 dimanche
    if (day !== 0 && !isHoliday(cursor, holidays)) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}
