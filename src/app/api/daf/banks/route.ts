import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, CptEntryStatus, MovementDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

const BANK_COLORS: Record<string, string> = {
  "UBA Cameroun": "#B91C1C",
  BICEC: "#0F766E",
  "Afriland First Bank": "#A855F7",
  Ecobank: "#1D4ED8",
  SGBC: "#DC2626",
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86_400_000);
  const tomorrowEnd = new Date(todayStart.getTime() + 2 * 86_400_000); // J+1 inclusif

  const [items, entryLines7d, dueSoonInvoices, recentEntryLines, recentBankMovements] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { bank: "asc" },
    }),
    // Lignes classe 5 sur 7 derniers jours — pour KPIs jour + évolution
    prisma.entryLine.findMany({
      where: {
        accountCode: { startsWith: "5" },
        entry: {
          tenantId: session.tenantId,
          status: CptEntryStatus.VALIDATED,
          entryDate: { gte: sevenDaysAgo },
        },
      },
      select: {
        debit: true,
        credit: true,
        entry: { select: { entryDate: true } },
      },
    }),
    // Factures fournisseurs à payer dans les prochaines 24-48 h (dueTomorrow)
    prisma.supplierInvoice.findMany({
      where: {
        tenantId: session.tenantId,
        status: { in: ["ACCOUNTED", "PENDING_PAYMENT"] },
        dueDate: { lte: tomorrowEnd },
      },
      select: { amountTtc: true },
    }),
    // 5 dernières lignes 5xx pour la timeline « Derniers mouvements »
    prisma.entryLine.findMany({
      where: {
        accountCode: { startsWith: "5" },
        entry: {
          tenantId: session.tenantId,
          status: CptEntryStatus.VALIDATED,
        },
      },
      orderBy: { entry: { entryDate: "desc" } },
      take: 5,
      include: {
        entry: { select: { entryDate: true, reference: true, description: true } },
      },
    }),
    // Fallback : si pas assez d'Entry, on complète avec d'éventuels BankMovement
    // résiduels (relevés bancaires importés).
    prisma.bankMovement.findMany({
      where: { bankAccount: { tenantId: session.tenantId } },
      orderBy: { occurredAt: "desc" },
      take: 5,
      include: { bankAccount: { select: { bank: true } } },
    }),
  ]);

  const totalBalance = items.reduce((s, b) => s + b.balance, 0n);
  const totalGranted = items.reduce((s, b) => s + b.creditLineGranted, 0n);
  const totalUsed = items.reduce((s, b) => s + b.creditLineUsed, 0n);
  const totalAvailable = totalGranted - totalUsed;

  // ─── KPIs jour : entrées/sorties classe 5 ───────────────────────────
  let dailyReceipts = 0n;
  let dailyPayments = 0n;
  for (const l of entryLines7d) {
    if (l.entry.entryDate >= todayStart) {
      dailyReceipts += l.debit;
      dailyPayments += l.credit;
    }
  }

  // ─── Projection J+7 : extrapolation depuis la moyenne 7 j ──────────
  let weekReceipts = 0n;
  let weekPayments = 0n;
  for (const l of entryLines7d) {
    weekReceipts += l.debit;
    weekPayments += l.credit;
  }
  const projectedJ7 = totalBalance + weekReceipts - weekPayments;

  // ─── Échéances J+1 : factures fournisseurs à payer ──────────────────
  const dueTomorrow = dueSoonInvoices.reduce((s, i) => s + i.amountTtc, 0n);

  // ─── Évolution 7 j : solde reconstruit jour par jour ────────────────
  const netFlowByDay = new Map<string, bigint>();
  for (const l of entryLines7d) {
    const key = l.entry.entryDate.toISOString().slice(0, 10);
    netFlowByDay.set(key, (netFlowByDay.get(key) ?? 0n) + l.debit - l.credit);
  }
  const evolution7d: Array<{ date: string; value: number }> = [];
  let runningBalance = totalBalance;
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayStart.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    evolution7d.unshift({ date: key, value: Number(runningBalance) });
    runningBalance = runningBalance - (netFlowByDay.get(key) ?? 0n);
  }

  // ─── Derniers mouvements : Entry classe 5 + BankMovement fallback ──
  const latestFromEntries = recentEntryLines.map((l) => {
    const isIn = l.debit > 0n;
    return {
      id: `entry-${l.id}`,
      direction: (isIn ? MovementDirection.INBOUND : MovementDirection.OUTBOUND) as MovementDirection,
      amount: (isIn ? l.debit : l.credit).toString(),
      label: l.entry.description || l.description,
      counterparty: l.description !== l.entry.description ? l.description : null,
      bank: l.accountCode,
      occurredAt: l.entry.entryDate.toISOString(),
    };
  });
  const latestFromBank = recentBankMovements.map((m) => ({
    id: `bank-${m.id}`,
    direction: m.direction,
    amount: m.amount.toString(),
    label: m.label,
    counterparty: m.counterparty,
    bank: m.bankAccount.bank,
    occurredAt: m.occurredAt.toISOString(),
  }));
  const latestMovements = [...latestFromEntries, ...latestFromBank]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5);

  return NextResponse.json({
    items: items.map((b) => ({
      id: b.id,
      bank: b.bank,
      accountNumber: b.accountNumber,
      accountType: b.accountType,
      currency: b.currency,
      balance: b.balance.toString(),
      creditLineGranted: b.creditLineGranted.toString(),
      creditLineUsed: b.creditLineUsed.toString(),
      creditLineAvailable: (b.creditLineGranted - b.creditLineUsed).toString(),
      lastSyncAt: b.lastSyncAt?.toISOString() ?? null,
      syncStatus: b.syncStatus,
      primaryColor: b.primaryColor ?? BANK_COLORS[b.bank] ?? "#6B7280",
      contact: b.contact,
    })),
    summary: {
      totalBalance: totalBalance.toString(),
      totalGranted: totalGranted.toString(),
      totalUsed: totalUsed.toString(),
      totalAvailable: totalAvailable.toString(),
      consolidatedPosition: (totalBalance + totalAvailable).toString(),
    },
    dailyKpis: {
      receipts: dailyReceipts.toString(),
      payments: dailyPayments.toString(),
      projectedJ7: projectedJ7.toString(),
      dueTomorrow: dueTomorrow.toString(),
    },
    evolution7d,
    latestMovements,
  });
}
