/**
 * Normalisation des numéros de téléphone camerounais pour l'auth ouvrier.
 *
 * Les ouvriers tapent leur numéro de plusieurs façons :
 *   "+237 6 78 24 18 92"
 *   "237 678 24 18 92"
 *   "678241892"
 *   "06 78 24 18 92"   (vieille saisie avec 0 initial)
 *
 * On normalise toujours en E.164 sans espaces : "+237678241892".
 * Côté seed, on stocke aussi cette forme canonique sur User.phone.
 */
export function normalizeCmPhone(raw: string): string | null {
  if (!raw) return null;
  // Garde uniquement chiffres et le + de tête
  let cleaned = raw.replace(/[^\d+]/g, "");
  // Retire un éventuel 0 de tête (vieille saisie)
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = cleaned.slice(1);
  }
  // Ajoute préfixe pays si absent
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("237")) {
      cleaned = "+" + cleaned;
    } else if (cleaned.length === 9) {
      cleaned = "+237" + cleaned;
    } else {
      return null;
    }
  }
  // Valide E.164 +237 + 9 chiffres mobile CM
  if (!/^\+237[26]\d{8}$/.test(cleaned)) return null;
  return cleaned;
}
