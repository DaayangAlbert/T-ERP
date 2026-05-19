/**
 * Agrège les heures supplémentaires d'un mois depuis les pointages TimeReport
 * pour les remonter automatiquement vers PayrollInput au moment du calcul du
 * cycle de paie.
 *
 * Pointages éligibles (= validés) :
 *   - pointedBy != userId : pointage validé par un tiers (CC, DT, AUTO_BADGE)
 *   - contestedAt nul OU resolvedAt non nul
 *
 * Les pointages auto-déclarés par l'ouvrier (pointedBy === userId, dits
 * "SELF_OUV") doivent passer par /api/cc/overtime/[id]/validate avant d'être
 * comptabilisés en paie. Les contestations en cours sont exclues — elles
 * seront ré-intégrées une fois résolues.
 *
 * Taux selon CCT BTP Cameroun :
 *   - evening_125 : 18h-22h, taux +25 %
 *   - night_150   : 22h-6h,  taux +50 %
 *   - sunday_200  : dimanche/férié, taux +100 %
 */
import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export interface OvertimeBreakdown {
  userId: string;
  h125: number; // soir 18-22h
  h150: number; // nuit 22-6h
  h200: number; // dimanche/férié
  total: number;
}

/**
 * Agrège les heures sup du mois (period au format YYYY-MM) pour tous les
 * users d'un tenant. Retourne un Map userId → breakdown.
 */
export async function aggregateOvertimeForCycle(
  prisma: PrismaLike,
  tenantId: string,
  period: string, // "2026-05"
): Promise<Map<string, OvertimeBreakdown>> {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const reports = await prisma.timeReport.findMany({
    where: {
      tenantId,
      date: { gte: start, lt: end },
      overtimeHours: { gt: 0 },
      // Exclut les contestations non résolues
      OR: [{ contestedAt: null }, { resolvedAt: { not: null } }],
    },
    select: {
      userId: true,
      overtimeHours: true,
      overtimeType: true,
      pointedBy: true,
    },
  });

  const byUser = new Map<string, OvertimeBreakdown>();
  for (const r of reports) {
    // Exclut les pointages auto-déclarés non encore validés par le CC
    if (r.pointedBy === r.userId) continue;
    let entry = byUser.get(r.userId);
    if (!entry) {
      entry = { userId: r.userId, h125: 0, h150: 0, h200: 0, total: 0 };
      byUser.set(r.userId, entry);
    }
    switch (r.overtimeType) {
      case "evening_125":
        entry.h125 += r.overtimeHours;
        break;
      case "night_150":
        entry.h150 += r.overtimeHours;
        break;
      case "sunday_200":
        entry.h200 += r.overtimeHours;
        break;
      default:
        // Type inconnu → traité comme 125 % par défaut (heures sup standards)
        entry.h125 += r.overtimeHours;
    }
    entry.total += r.overtimeHours;
  }

  return byUser;
}

/**
 * Convertit un breakdown en montant FCFA en utilisant le taux horaire
 * base (= baseSalary / 173 h) + majoration selon type.
 */
export function computeOvertimeAmount(
  breakdown: OvertimeBreakdown,
  hourlyRate: number,
): number {
  return Math.round(
    breakdown.h125 * hourlyRate * 1.25 +
    breakdown.h150 * hourlyRate * 1.50 +
    breakdown.h200 * hourlyRate * 2.00
  );
}
