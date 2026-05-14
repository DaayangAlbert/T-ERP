/**
 * Logique métier des avances sur salaire ouvrier (Bloc 1 Ouvrier fn 1.3).
 *
 * Règles (cf prompt 1.3) :
 *  - Plafond : 30 % × salaire base du dernier bulletin émis
 *  - Workflow validation :
 *      < 50 K FCFA  → auto-validé (status passe direct à APPROVED)
 *      50-100 K    → validation RH (Sandrine ONANA · role HR)
 *      100-200 K   → validation DAF (Marie NGONO · role DAF)
 *      > 200 K     → validation DAF puis DG (Albert DAAYANG · role DG)
 *  - Décision sous 24 h ouvrées
 *  - Si approuvé : virement Afriland sous 48 h ou cash si urgence
 *  - Récupération sur bulletin du mois suivant (ligne dédiée, recoveryMonth)
 *
 * Note : la chaîne complète de validation côté RH/DAF/DG sera livrée dans
 * les blocs respectifs. fn 1.3 OUV s'occupe juste de la création de la
 * demande + auto-approve < 50K + de la lecture côté ouvrier.
 */

export const ADVANCE_MAX_PERCENT_OF_BASE = 0.3;
export const AUTO_APPROVE_THRESHOLD_XAF = 50_000;
export const HR_VALIDATION_THRESHOLD_XAF = 100_000;
export const DAF_VALIDATION_THRESHOLD_XAF = 200_000;

export type AdvanceValidatorRole = "AUTO" | "HR" | "DAF" | "DG";

export function pickValidatorRole(amountXAF: number): AdvanceValidatorRole {
  if (amountXAF < AUTO_APPROVE_THRESHOLD_XAF) return "AUTO";
  if (amountXAF <= HR_VALIDATION_THRESHOLD_XAF) return "HR";
  if (amountXAF <= DAF_VALIDATION_THRESHOLD_XAF) return "DAF";
  return "DG";
}

export function maxAllowedFromBaseSalary(baseSalaryXAF: number): number {
  // Arrondi 1 000 FCFA inférieur (pratique BTP : pas de centimes)
  return Math.floor((baseSalaryXAF * ADVANCE_MAX_PERCENT_OF_BASE) / 1000) * 1000;
}

export function labelForValidator(role: AdvanceValidatorRole): string {
  if (role === "AUTO") return "Validation automatique";
  if (role === "HR") return "Validation Responsable RH";
  if (role === "DAF") return "Validation Directrice administrative et financière";
  return "Validation Directeur Général";
}
