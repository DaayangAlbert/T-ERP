/**
 * Formatters partagés du profil Employé / Ouvrier.
 *
 * Tous les composants UI EMP (paie, congés, pointage, profil) DOIVENT
 * importer depuis ce module plutôt que de redéfinir `formatFcfa`,
 * `MONTHS_FR`, etc. Évite la dérive de format (séparateur, locale, etc.)
 * et facilite l'éventuel passage en multilingue fr-CM / en-CM.
 */

export const MONTHS_FR_LONG = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

export const MONTHS_FR_SHORT = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const;

/**
 * Format monnaie FCFA — séparateur d'espaces FR, sans décimales.
 * `170000` → "170 000 FCFA"
 */
export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

/**
 * Compact en milliers — pour les KPIs où la place est limitée.
 * `142480` → "142,5 K", `999` → "999".
 */
export function formatKShort(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} K`;
  }
  return amount.toLocaleString("fr-FR");
}

/**
 * "2026-04" → "Avril 2026". Accepte aussi une `Date` en fallback.
 * `null` → "Période inconnue".
 */
export function formatPeriodLabel(label: string | null, periodIso?: string | Date): string {
  if (label) {
    const [y, m] = label.split("-");
    const idx = Number(m) - 1;
    return `${MONTHS_FR_LONG[idx] ?? m} ${y}`;
  }
  if (periodIso) {
    const d = periodIso instanceof Date ? periodIso : new Date(periodIso);
    return `${MONTHS_FR_LONG[d.getMonth()]} ${d.getFullYear()}`;
  }
  return "Période inconnue";
}

/**
 * Décompose une période en libellés mois court/long + année.
 * Utile pour les listes d'historique avec icône cercle mois.
 */
export function decomposePeriod(
  label: string | null,
  periodIso?: string | Date
): { short: string; long: string; year: string } {
  if (label) {
    const [y, m] = label.split("-");
    const idx = Number(m) - 1;
    return {
      short: MONTHS_FR_SHORT[idx] ?? m,
      long: MONTHS_FR_LONG[idx] ?? m,
      year: y,
    };
  }
  if (periodIso) {
    const d = periodIso instanceof Date ? periodIso : new Date(periodIso);
    return {
      short: MONTHS_FR_SHORT[d.getMonth()],
      long: MONTHS_FR_LONG[d.getMonth()],
      year: String(d.getFullYear()),
    };
  }
  return { short: "?", long: "?", year: "?" };
}

/**
 * "2026-04-15" → "15/04"
 */
export function formatDateShort(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

/**
 * "2026-04-15" → "15 avr. 2026"
 */
export function formatDateMedium(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * "2026-04-15" → "mardi 15 avril"
 */
export function formatDateLong(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
}

/**
 * Date d'un ISO → "06:52" (heure locale).
 */
export function formatTimeHm(iso: string | Date | null): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
