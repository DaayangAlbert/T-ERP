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

export const updateBankAccountSchema = z.object({
  balance: z.string().optional(),
  creditLineGranted: z.string().optional(),
  creditLineUsed: z.string().optional(),
  renewalDate: z.string().optional().nullable(),
  contact: z
    .object({
      name: z.string().max(80).optional(),
      phone: z.string().max(40).optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

export type CreateCommitmentInput = z.infer<typeof createCommitmentSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

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
