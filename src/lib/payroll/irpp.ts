export interface IrppBracket {
  ceiling: number | null;
  rate: number;
}

export const IRPP_ANNUAL_BRACKETS: IrppBracket[] = [
  { ceiling: 2_000_000, rate: 0.1 },
  { ceiling: 3_000_000, rate: 0.15 },
  { ceiling: 5_000_000, rate: 0.25 },
  { ceiling: null, rate: 0.35 },
];

export function calculateAnnualIrpp(annualTaxableBase: number): number {
  const base = Math.max(0, annualTaxableBase);
  let remaining = base;
  let previousCeiling = 0;
  let total = 0;

  for (const bracket of IRPP_ANNUAL_BRACKETS) {
    if (remaining <= 0) break;
    const ceiling = bracket.ceiling ?? Number.POSITIVE_INFINITY;
    const bracketBase = Math.min(remaining, ceiling - previousCeiling);
    total += bracketBase * bracket.rate;
    remaining -= bracketBase;
    previousCeiling = ceiling;
  }

  return Math.round(total);
}

export function calculateMonthlyIrpp(monthlyTaxableBase: number): {
  annualBase: number;
  annualIrpp: number;
  monthlyIrpp: number;
} {
  const annualBase = Math.max(0, monthlyTaxableBase) * 12;
  const annualIrpp = calculateAnnualIrpp(annualBase);
  return {
    annualBase: Math.round(annualBase),
    annualIrpp,
    monthlyIrpp: Math.round(annualIrpp / 12),
  };
}
