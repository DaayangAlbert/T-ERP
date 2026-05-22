import { z } from "zod";
import { CommitmentType, CommitmentStatus } from "@prisma/client";

export const createCommitmentSchema = z.object({
  type: z.nativeEnum(CommitmentType),
  reference: z.string().min(2).max(40).optional(),
  bank: z.string().max(60).optional(),
  beneficiary: z.string().max(120).optional(),
  amount: z.string().min(1), // BigInt en string
  siteId: z.string().optional().nullable(),
  issueDate: z.string(),
  maturityDate: z.string(),
  notes: z.string().max(500).optional(),
});

// Montant en FCFA (XAF) stocké en BigInt → transporté en string de chiffres.
const amountString = z.string().regex(/^\d+$/, "Montant invalide (entier positif attendu)");

export const ACCOUNT_TYPES = [
  "CURRENT",
  "ESCROW",
  "SAVING",
  "GUARANTEE",
  "FOREIGN_CURRENCY",
] as const;

const bankContact = z
  .object({
    name: z.string().max(80).optional(),
    phone: z.string().max(40).optional(),
    email: z.string().email().optional().or(z.literal("")),
  })
  .optional();

export const createBankAccountSchema = z.object({
  bank: z.string().min(2).max(60),
  accountNumber: z.string().min(2).max(40),
  accountType: z.enum(ACCOUNT_TYPES).default("CURRENT"),
  currency: z.string().min(3).max(3).default("XAF"),
  balance: amountString.default("0"),
  creditLineGranted: amountString.default("0"),
  renewalDate: z.string().optional().nullable(),
  contact: bankContact,
});

export const updateBankAccountSchema = z.object({
  bank: z.string().min(2).max(60).optional(),
  accountNumber: z.string().min(2).max(40).optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
  currency: z.string().min(3).max(3).optional(),
  balance: z.string().optional(),
  creditLineGranted: z.string().optional(),
  creditLineUsed: z.string().optional(),
  renewalDate: z.string().optional().nullable(),
  contact: bankContact,
  // Clôture / réouverture
  isActive: z.boolean().optional(),
});

export const createCashboxSchema = z.object({
  siteId: z.string().min(1),
  custodianId: z.string().optional(), // défaut : manager du chantier
  initialBalance: amountString.default("0"),
});

export const updateCashboxSchema = z.object({
  custodianId: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Approvisionnement d'une caisse chantier depuis un compte bancaire :
// débite la banque (sortie) et crédite la caisse (entrée) de façon atomique.
export const fundCashboxSchema = z.object({
  bankAccountId: z.string().min(1),
  amount: amountString.refine((v) => BigInt(v) > 0n, "Le montant doit être positif"),
  reason: z.string().min(2).max(200).default("Approvisionnement caisse chantier"),
  reference: z.string().max(60).optional(),
  occurredAt: z.string().optional(),
});

// ─── Comptabilité analytique : comptes projet / salaire / charges siège ────

const positiveAmount = amountString.refine((v) => BigInt(v) > 0n, "Le montant doit être positif");

export const createProjectAccountSchema = z.object({
  siteId: z.string().min(1),
  bankAccountId: z.string().optional().nullable(),
});

export const updateProjectAccountSchema = z.object({
  bankAccountId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Approvisionnement d'un compte projet depuis un compte bancaire (banque → projet).
export const fundProjectAccountSchema = z.object({
  bankAccountId: z.string().min(1),
  amount: positiveAmount,
  reason: z.string().min(2).max(200).default("Approvisionnement compte projet"),
  reference: z.string().max(60).optional(),
  occurredAt: z.string().optional(),
});

// Mouvement manuel sur un compte projet. Selon le type, sens imposé :
//   crédit (+): REVENUE          ; débit (−): EXPENSE, PROJECT_SALARY, REPAYMENT
//   ADJUSTMENT : sens libre via `direction`.
export const PROJECT_MOVEMENT_TYPES = [
  "EXPENSE",
  "PROJECT_SALARY",
  "REVENUE",
  "REPAYMENT",
  "ADJUSTMENT",
] as const;

export const projectMovementSchema = z.object({
  type: z.enum(PROJECT_MOVEMENT_TYPES),
  amount: positiveAmount,
  reason: z.string().min(2).max(200),
  reference: z.string().max(60).optional(),
  occurredAt: z.string().optional(),
  // Requis seulement pour ADJUSTMENT.
  direction: z.enum(["CREDIT", "DEBIT"]).optional(),
  // Requis pour REPAYMENT (compte bancaire crédité en retour).
  bankAccountId: z.string().optional(),
});

// Compte salaire — mouvement manuel (paiement masse salariale siège, etc.).
export const salaryMovementSchema = z.object({
  direction: z.enum(["CREDIT", "DEBIT"]),
  amount: positiveAmount,
  reason: z.string().min(2).max(200),
  reference: z.string().max(60).optional(),
  occurredAt: z.string().optional(),
  bankAccountId: z.string().optional().nullable(),
});

export const linkSalaryBankSchema = z.object({
  bankAccountId: z.string().optional().nullable(),
});

// Répartition de la masse salariale siège (prorata du montant des marchés).
export const overheadPreviewSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Période attendue au format AAAA-MM"),
  totalAmount: positiveAmount,
});

export type CreateProjectAccountInput = z.infer<typeof createProjectAccountSchema>;
export type UpdateProjectAccountInput = z.infer<typeof updateProjectAccountSchema>;
export type FundProjectAccountInput = z.infer<typeof fundProjectAccountSchema>;
export type ProjectMovementInput = z.infer<typeof projectMovementSchema>;
export type SalaryMovementInput = z.infer<typeof salaryMovementSchema>;
export type OverheadPreviewInput = z.infer<typeof overheadPreviewSchema>;

export type CreateCommitmentInput = z.infer<typeof createCommitmentSchema>;
export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type CreateCashboxInput = z.infer<typeof createCashboxSchema>;
export type UpdateCashboxInput = z.infer<typeof updateCashboxSchema>;
export type FundCashboxInput = z.infer<typeof fundCashboxSchema>;

// Helper pour générer un snapshot P&L+Bilan+BFR à partir des sites/payslips.
// Reste une synthèse (faute d'écritures comptables réelles dans le MVP).
export interface PnLData {
  products: { revenue: number; otherProducts: number };
  expenses: {
    purchases: number;
    personnel: number;
    subcontracting: number;
    depreciation: number;
    other: number;
  };
  operatingResult: number;
  financialResult: number;
  exceptionalResult: number;
  netResult: number;
}

export interface BalanceData {
  actif: {
    immobilisations: number;
    stocks: number;
    receivables: number;
    treasury: number;
  };
  passif: {
    equity: number;
    financialDebts: number;
    suppliers: number;
    other: number;
  };
  ratios: {
    autonomy: number; // capitaux propres / total bilan
    liquidity: number; // actif circulant / dettes CT
    leverage: number; // dettes / capitaux propres
  };
}

export interface BfrData {
  dso: number;
  dpo: number;
  stockRotation: number;
  bfr: number;
  treasury: number;
  // Norme secteur BTP Cameroun (synthèse) :
  benchmark: { dso: 65; dpo: 50; stockRotation: 18 };
}
