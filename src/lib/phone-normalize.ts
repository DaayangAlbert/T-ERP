/**
 * Normalise un numéro de téléphone pour les comparaisons de login.
 *
 * Retire tout sauf les chiffres. Si le résultat ne commence pas par
 * l'indicatif Cameroun "237" et qu'il fait 9 chiffres (numéro local
 * "690..."), on préfixe "237" pour avoir une forme canonique unique.
 *
 * Exemples :
 *   "+237 6 90 12 34 56"  → "237690123456"
 *   "237 690 12 34 56"    → "237690123456"
 *   "690 12 34 56"        → "237690123456"
 *   "6.90.12.34.56"       → "237690123456"
 *   "06 90 12 34 56"      → "237690123456"  (on retire le 0 initial)
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return "";
  let digits = input.replace(/[^0-9]/g, "");
  if (!digits) return "";

  // Si le numéro commence par "0" suivi de l'indicatif national local
  // (ex: "0690..." → "690..."), retire le 0 préfixe.
  if (digits.length === 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Si le numéro fait 9 chiffres (format local CM "6XX..."), préfixe 237.
  if (digits.length === 9) {
    digits = `237${digits}`;
  }

  return digits;
}

/**
 * Pré-filtre SQL : renvoie les 8 derniers chiffres significatifs pour
 * faire un `LIKE %X%` rapide en DB, avant filtrage exact par normalize.
 */
export function phoneSearchSuffix(input: string): string {
  const digits = normalizePhone(input);
  return digits.slice(-8);
}

export function isEmailLike(input: string): boolean {
  return input.includes("@");
}
