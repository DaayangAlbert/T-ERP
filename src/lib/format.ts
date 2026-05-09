import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

const FCFA_FORMAT = new Intl.NumberFormat("fr-FR", { useGrouping: true });
const ONE_DECIMAL_FORMAT = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const TWO_DECIMAL_FORMAT = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface FormatFCFAOptions {
  /** "auto" picks unit based on magnitude (Md, M, K). "raw" prints the full number. Defaults to "auto". */
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

  let value: string;
  let unit: string;

  if (scale === "auto" && abs >= 1_000_000_000) {
    value = TWO_DECIMAL_FORMAT.format(n / 1_000_000_000);
    unit = noSuffix ? "Md" : "Md FCFA";
  } else if (scale === "auto" && abs >= 1_000_000) {
    value = ONE_DECIMAL_FORMAT.format(n / 1_000_000);
    unit = noSuffix ? "M" : "M FCFA";
  } else {
    value = FCFA_FORMAT.format(typeof amount === "bigint" ? amount : Math.round(n));
    unit = noSuffix || scale === "auto" ? "" : "FCFA";
  }

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
