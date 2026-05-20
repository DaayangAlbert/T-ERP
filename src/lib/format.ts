import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

const FCFA_FORMAT = new Intl.NumberFormat("fr-FR", { useGrouping: true });

export interface FormatFCFAOptions {
  /**
   * Conservé pour compatibilité d'API. L'abréviation M/Md a été retirée :
   * les montants s'affichent TOUJOURS en chiffres complets (choix produit).
   */
  scale?: "auto" | "raw";
  /** Hide the trailing " FCFA" suffix. Useful for unit-decoupled display. */
  noSuffix?: boolean;
  /** Show the unit separately so the caller can render it differently (e.g., smaller font). */
  splitUnit?: boolean;
}

export interface FormatFCFASplit {
  value: string;
  unit: string;
}

export function formatFCFA(amount: number | bigint | null | undefined): string;
export function formatFCFA(
  amount: number | bigint | null | undefined,
  options: FormatFCFAOptions & { splitUnit: true }
): FormatFCFASplit;
export function formatFCFA(
  amount: number | bigint | null | undefined,
  options: FormatFCFAOptions & { splitUnit?: false | undefined }
): string;
export function formatFCFA(
  amount: number | bigint | null | undefined,
  options: FormatFCFAOptions = {}
): string | FormatFCFASplit {
  const { scale = "auto", noSuffix = false, splitUnit = false } = options;
  if (amount === null || amount === undefined) {
    return splitUnit ? { value: "—", unit: "" } : "—";
  }

  const n = typeof amount === "bigint" ? Number(amount) : amount;
  const abs = Math.abs(n);

  // Plus d'abréviation M/Md : on affiche toujours le nombre complet groupé.
  const value = FCFA_FORMAT.format(typeof amount === "bigint" ? amount : Math.round(n));

  // Suffixe « FCFA » : en mode auto on le garde pour les montants ≥ 1 M (qui
  // l'affichaient déjà via "M/Md FCFA") ; en mode raw on le met toujours.
  let unit: string;
  if (noSuffix) unit = "";
  else if (scale === "auto") unit = abs >= 1_000_000 ? "FCFA" : "";
  else unit = "FCFA";

  if (splitUnit) return { value, unit };
  return unit ? `${value} ${unit}` : value;
}

export function formatPercent(
  value: number | null | undefined,
  options: { decimals?: number; sign?: boolean } = {}
): string {
  const { decimals = 1, sign = false } = options;
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const prefix = sign && value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(decimals).replace(".", ",")} %`;
}

export interface DeltaInfo {
  label: string;
  tone: "up" | "down" | "flat";
  arrow: "▲" | "▼" | "▬";
}

export function formatDelta(
  delta: number | null | undefined,
  options: { unit?: "%" | "pts" | ""; decimals?: number } = {}
): DeltaInfo {
  const { unit = "%", decimals = 1 } = options;
  if (delta === null || delta === undefined || Number.isNaN(delta)) {
    return { label: "—", tone: "flat", arrow: "▬" };
  }
  const tone: DeltaInfo["tone"] = delta > 0.05 ? "up" : delta < -0.05 ? "down" : "flat";
  const arrow = tone === "up" ? "▲" : tone === "down" ? "▼" : "▬";
  const abs = Math.abs(delta).toFixed(decimals).replace(".", ",");
  const space = unit && unit !== "%" ? " " : " ";
  return { label: `${arrow} ${abs}${space}${unit}`.trim(), tone, arrow };
}

export function formatDate(date: Date | string | null | undefined, pattern = "dd/MM/yyyy"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { locale: fr });
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: fr });
}

export function formatNumber(value: number | bigint | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return FCFA_FORMAT.format(value);
}
