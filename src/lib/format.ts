import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

const FCFA_FORMAT = new Intl.NumberFormat("fr-FR", { useGrouping: true });

export function formatFCFA(amount: number | bigint | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const value = typeof amount === "bigint" ? amount : BigInt(Math.round(amount));
  return `${FCFA_FORMAT.format(value)} FCFA`;
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
