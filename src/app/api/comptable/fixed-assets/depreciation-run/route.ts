import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, CptEntryStatus } from "@prisma/client";

const DIRECTION_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

/**
 * Calcule l'amortissement linéaire du mois en cours et génère
 * une écriture OD : 6811 (dotation) / 2815 (amortissement cumulé).
 */
export async function POST() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!DIRECTION_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  // Comptable Chantier : pas autorisé
  if (session.role === Role.ACCOUNTANT) {
    const u = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { assignedSiteIds: true },
    });
    if (u && u.assignedSiteIds.length > 0) {
      return NextResponse.json({ error: "Réservé au Comptable Direction" }, { status: 403 });
    }
  }

  const assets = await prisma.fixedAsset.findMany({
    where: { tenantId: session.tenantId },
  });

  let totalDot = 0;
  const updates: Array<{ id: string; dot: number; newAccumulated: number; newNet: number }> = [];
  for (const a of assets) {
    if (a.usefulLifeMonths <= 0) continue;
    const monthlyDot = Number(a.grossValue) / a.usefulLifeMonths;
    const remainingNet = Number(a.netValue);
    const dot = Math.min(monthlyDot, remainingNet);
    if (dot <= 0) continue;
    totalDot += dot;
    updates.push({
      id: a.id,
      dot,
      newAccumulated: Number(a.accumulatedDepreciation) + dot,
      newNet: remainingNet - dot,
    });
  }

  if (totalDot === 0) {
    return NextResponse.json({ message: "Aucune dotation à calculer", count: 0 });
  }

  const now = new Date();
  const periodLabel = now.toISOString().slice(0, 7);
  const ref = `OD-AMORT-${periodLabel}`;

  // Transaction : update assets + create entry
  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      await tx.fixedAsset.update({
        where: { id: u.id },
        data: {
          accumulatedDepreciation: BigInt(Math.round(u.newAccumulated)),
          netValue: BigInt(Math.round(u.newNet)),
        },
      });
    }
    await tx.entry.create({
      data: {
        tenantId: session.tenantId!,
        siteId: null,
        journalCode: "OD",
        entryDate: now,
        reference: ref,
        description: `Dotation amortissement mensuelle ${periodLabel} (${updates.length} immobilisations)`,
        status: CptEntryStatus.VALIDATED,
        createdById: session.sub,
        validatedById: session.sub,
        validatedAt: now,
        lines: {
          create: [
            { accountCode: "6811", description: "Dotation aux amortissements", debit: BigInt(Math.round(totalDot)), credit: BigInt(0) },
            { accountCode: "2815", description: "Amortissement cumulé", debit: BigInt(0), credit: BigInt(Math.round(totalDot)) },
          ],
        },
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "fixed-asset.depreciation-run",
      entityType: "FixedAsset",
      entityId: "batch",
      metadata: { period: periodLabel, count: updates.length, totalDotation: totalDot },
    },
  });

  return NextResponse.json({ count: updates.length, totalDot, period: periodLabel, reference: ref });
}
