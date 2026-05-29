import { prisma } from "@/lib/prisma";

/** Période comptable "YYYY-MM" d'une date (composantes locales, cohérent avec
 *  les filtres de la balance / du grand-livre). */
export function periodOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Une écriture ne peut pas être créée/modifiée/validée sur une période close.
 * Absence de ligne AccountingPeriod = période implicitement OUVERTE.
 */
export async function isPeriodLocked(tenantId: string, period: string): Promise<boolean> {
  const row = await prisma.accountingPeriod.findFirst({
    where: { tenantId, period },
    select: { status: true },
  });
  return row?.status === "CLOSED" || row?.status === "LOCKED";
}
