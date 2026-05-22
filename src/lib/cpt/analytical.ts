import { CptDirection, ProjectAccountEntryType } from "@prisma/client";

/**
 * Comptabilité analytique — règles de sens (Modèle A « compte courant »).
 *
 * Le solde d'un compte projet = trésorerie disponible :
 *   CREDIT (+) : approvisionnement banque (FUNDING), production (REVENUE)
 *   DEBIT  (−) : dépenses (EXPENSE), salaires (PROJECT_SALARY / OVERHEAD_SALARY),
 *                remboursement banque (REPAYMENT)
 * La « dette » d'un projet est un indicateur dérivé = Σ FUNDING − Σ REPAYMENT
 * (l'argent avancé par l'entreprise pas encore remboursé).
 */

const CREDIT_TYPES: ProjectAccountEntryType[] = [
  ProjectAccountEntryType.FUNDING,
  ProjectAccountEntryType.REVENUE,
];
const DEBIT_TYPES: ProjectAccountEntryType[] = [
  ProjectAccountEntryType.EXPENSE,
  ProjectAccountEntryType.PROJECT_SALARY,
  ProjectAccountEntryType.OVERHEAD_SALARY,
  ProjectAccountEntryType.REPAYMENT,
];

/** Sens imposé par le type ; ADJUSTMENT laisse le choix (`fallback`). */
export function directionForType(
  type: ProjectAccountEntryType,
  fallback?: CptDirection,
): CptDirection {
  if (CREDIT_TYPES.includes(type)) return CptDirection.CREDIT;
  if (DEBIT_TYPES.includes(type)) return CptDirection.DEBIT;
  return fallback ?? CptDirection.DEBIT; // ADJUSTMENT
}

/** Variation signée du solde pour un mouvement donné. */
export function signedDelta(direction: CptDirection, amount: bigint): bigint {
  return direction === CptDirection.CREDIT ? amount : -amount;
}

export interface OverheadBasisLine {
  accountId: string;
  siteId: string;
  code: string;
  name: string;
  marketAmount: string; // BigInt en string
  weight: number; // part 0..1
  share: string; // quote-part attribuée (BigInt en string)
}

/**
 * Répartit `total` (masse salariale siège) sur les comptes projet au prorata
 * de leur montant de marché. Arrondi par « plus forts restes » pour que la
 * somme des quote-parts égale exactement `total` (FCFA = entiers, pas de
 * décimales).
 */
export function computeOverheadBasis(
  accounts: { id: string; siteId: string; code: string; name: string; marketAmount: bigint }[],
  total: bigint,
): { lines: OverheadBasisLine[]; totalMarket: bigint } {
  const totalMarket = accounts.reduce((s, a) => s + a.marketAmount, 0n);
  if (totalMarket <= 0n || total <= 0n) {
    return {
      totalMarket,
      lines: accounts.map((a) => ({
        accountId: a.id,
        siteId: a.siteId,
        code: a.code,
        name: a.name,
        marketAmount: a.marketAmount.toString(),
        weight: 0,
        share: "0",
      })),
    };
  }

  const floors = accounts.map((a) => {
    const numerator = total * a.marketAmount;
    const floor = numerator / totalMarket;
    const remainder = numerator % totalMarket;
    return { a, floor, remainder };
  });

  let distributed = floors.reduce((s, f) => s + f.floor, 0n);
  let leftover = total - distributed;
  // Attribue les unités restantes aux plus forts restes.
  const byRemainder = [...floors].sort((x, y) => (y.remainder > x.remainder ? 1 : y.remainder < x.remainder ? -1 : 0));
  const bonus = new Map<string, bigint>();
  for (const f of byRemainder) {
    if (leftover <= 0n) break;
    bonus.set(f.a.id, 1n);
    leftover -= 1n;
  }

  const lines: OverheadBasisLine[] = floors.map((f) => {
    const share = f.floor + (bonus.get(f.a.id) ?? 0n);
    return {
      accountId: f.a.id,
      siteId: f.a.siteId,
      code: f.a.code,
      name: f.a.name,
      marketAmount: f.a.marketAmount.toString(),
      weight: Number(f.a.marketAmount) / Number(totalMarket),
      share: share.toString(),
    };
  });

  return { lines, totalMarket };
}

export const PROJECT_ENTRY_LABELS: Record<ProjectAccountEntryType, string> = {
  FUNDING: "Approvisionnement",
  EXPENSE: "Dépense",
  PROJECT_SALARY: "Salaire chantier",
  OVERHEAD_SALARY: "Quote-part siège",
  REVENUE: "Production / encaissement",
  REPAYMENT: "Remboursement banque",
  ADJUSTMENT: "Régularisation",
};
