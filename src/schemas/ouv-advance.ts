import { z } from "zod";

// Demande d'avance sur salaire. Montant en FCFA entier (pas de centime).
// Plafond 30 % du salaire base — vérifié côté API à la création.
export const advanceRequestSchema = z.object({
  amountXAF: z
    .number()
    .int("Montant entier en FCFA")
    .min(5_000, "Montant minimum 5 000 FCFA")
    .max(1_000_000, "Montant maximum 1 000 000 FCFA"),
  reason: z.string().min(5, "Précise le motif (≥ 5 caractères)").max(500),
  // Méthode de paiement souhaitée (optionnel ; sinon BANK_TRANSFER par défaut)
  payoutMethod: z.enum(["BANK_TRANSFER", "MOBILE_MONEY", "CASH"]).optional(),
});
export type AdvanceRequestInput = z.infer<typeof advanceRequestSchema>;

// Décision validateur (côté RH/DAF/DG). Pas utilisé par l'ouvrier.
export const advanceDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().max(500).optional(),
});
export type AdvanceDecisionInput = z.infer<typeof advanceDecisionSchema>;
