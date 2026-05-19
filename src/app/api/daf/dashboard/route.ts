import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, ValidationStatus, SiteStatus, CptEntryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

// Familles SYSCOHADA charges pour la répartition des sorties.
const OUTFLOW_FAMILIES: Array<{ prefix: string; label: string; color: string }> = [
  { prefix: "60", label: "Achats", color: "#15803D" },
  { prefix: "61", label: "Services ext.", color: "#0369A1" },
  { prefix: "62", label: "Transports", color: "#B45309" },
  { prefix: "64", label: "Impôts & taxes", color: "#7C3AED" },
  { prefix: "66", label: "Salaires & charges", color: "#A855F7" },
  { prefix: "67", label: "Charges financières", color: "#DC2626" },
];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86_400_000);
  const thirtyDaysAgo = new Date(todayStart.getTime() - 29 * 86_400_000);

  const [banks, pendingValidations, sites, taxDeadlines, receivables, entryLines30d, outflowLines7d] =
    await Promise.all([
      prisma.bankAccount.findMany({
        where: { tenantId: { in: scopeIds } },
        select: { balance: true, creditLineGranted: true, creditLineUsed: true },
      }),
      prisma.validation.findMany({
        where: { tenantId: session.tenantId, status: ValidationStatus.PENDING },
        select: { id: true, amount: true, currentStep: true },
      }),
      prisma.site.findMany({
        where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
        select: { budget: true, progress: true, margin: true },
      }),
      prisma.taxDeadline.findMany({
        where: {
          tenantId: session.tenantId,
          dueDate: { gte: now, lte: new Date(now.getTime() + 30 * 86_400_000) },
          paymentStatus: { in: ["PENDING", "SCHEDULED"] },
        },
        select: { id: true, dueDate: true, amount: true, type: true },
      }),
      prisma.receivable.findMany({
        where: { tenantId: session.tenantId, status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
        select: { amount: true, paidAmount: true, dueDate: true, daysOverdue: true },
      }),
      // Toutes les lignes d'écritures sur la classe 5 (trésorerie) des 30 derniers jours.
      // → Sert à calculer receipts/payments du jour + sparklines + évolution 30 j.
      prisma.entryLine.findMany({
        where: {
          accountCode: { startsWith: "5" },
          entry: {
            tenantId: { in: scopeIds },
            status: CptEntryStatus.VALIDATED,
            entryDate: { gte: thirtyDaysAgo },
          },
        },
        select: {
          debit: true,
          credit: true,
          entry: { select: { entryDate: true } },
        },
      }),
      // Lignes débitrices sur les classes de charges 6x — 7 derniers jours.
      prisma.entryLine.findMany({
        where: {
          accountCode: { startsWith: "6" },
          entry: {
            tenantId: { in: scopeIds },
            status: CptEntryStatus.VALIDATED,
            entryDate: { gte: sevenDaysAgo },
          },
        },
        select: { accountCode: true, debit: true, credit: true },
      }),
    ]);

  // ─── Position consolidée ────────────────────────────────────────────
  const totalBalance = banks.reduce((s, b) => s + b.balance, 0n);
  const totalGranted = banks.reduce((s, b) => s + b.creditLineGranted, 0n);
  const totalUsed = banks.reduce((s, b) => s + b.creditLineUsed, 0n);
  const totalAvailable = totalBalance + (totalGranted - totalUsed);

  // ─── Receipts/Payments du jour (entrées/sorties classe 5) ───────────
  let dailyReceipts = 0n;
  let dailyPayments = 0n;
  for (const l of entryLines30d) {
    const d = l.entry.entryDate;
    if (d >= todayStart) {
      dailyReceipts += l.debit;
      dailyPayments += l.credit;
    }
  }

  // ─── Sparkline 7 j entrées + sorties ────────────────────────────────
  const trend7d = (kind: "in" | "out") => {
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(sevenDaysAgo.getTime() + i * 86_400_000);
      return { day: i, value: 0, date: day.toISOString().slice(0, 10) };
    });
    for (const l of entryLines30d) {
      const d = l.entry.entryDate;
      if (d < sevenDaysAgo) continue;
      const idx = Math.floor((d.getTime() - sevenDaysAgo.getTime()) / 86_400_000);
      if (idx < 0 || idx > 6) continue;
      buckets[idx].value += Number(kind === "in" ? l.debit : l.credit);
    }
    return buckets;
  };

  // Validations N2 en attente DAF
  const n2Pending = pendingValidations.filter((v) => v.currentStep === "DAF");
  const n2Amount = n2Pending.reduce((s, v) => s + (v.amount ?? 0n), 0n);

  // DSO clients
  const totalReceivables = receivables.reduce((s, r) => s + (r.amount - r.paidAmount), 0n);
  const overdueReceivables = receivables
    .filter((r) => r.daysOverdue > 0)
    .reduce((s, r) => s + (r.amount - r.paidAmount), 0n);
  const earnedRevenue = sites.reduce((s, x) => s + (Number(x.budget) * x.progress) / 100, 0);
  const dso = earnedRevenue > 0 ? Math.round((Number(totalReceivables) / earnedRevenue) * 360) : 0;

  // Marge YTD pondérée
  const totalBudget = sites.reduce((s, x) => s + Number(x.budget), 0);
  const ytdMargin = totalBudget
    ? sites.reduce((s, x) => s + x.margin * Number(x.budget), 0) / totalBudget
    : 0;
  const bfrDays = earnedRevenue > 0 ? Math.round((Number(totalReceivables) / earnedRevenue) * 365) : 0;

  // Échéances fiscales
  const taxAmount = taxDeadlines.reduce((s, t) => s + (t.amount ?? 0n), 0n);
  const urgentTax = taxDeadlines.filter(
    (t) => t.dueDate.getTime() < Date.now() + 7 * 86_400_000
  ).length;

  // ─── Évolution trésorerie 30 j ──────────────────────────────────────
  // On part du solde actuel et on rembobine en sens inverse :
  //   solde[j] = solde[j+1] - net_flow[j+1]
  // où net_flow[j] = Σ(débits 5xx) - Σ(crédits 5xx) du jour j.
  const netFlowByDay = new Map<string, bigint>();
  for (const l of entryLines30d) {
    const key = l.entry.entryDate.toISOString().slice(0, 10);
    netFlowByDay.set(key, (netFlowByDay.get(key) ?? 0n) + l.debit - l.credit);
  }
  const treasuryEvolution: Array<{ date: string; value: number }> = [];
  let runningBalance = totalBalance;
  for (let i = 0; i < 30; i++) {
    const d = new Date(todayStart.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    treasuryEvolution.unshift({ date: key, value: Number(runningBalance) });
    const flow = netFlowByDay.get(key) ?? 0n;
    runningBalance = runningBalance - flow;
  }

  // ─── Répartition sorties 7 j (par famille SYSCOHADA) ────────────────
  const outflowsByFamily = new Map<string, bigint>();
  for (const l of outflowLines7d) {
    const prefix = l.accountCode.slice(0, 2);
    const fam = OUTFLOW_FAMILIES.find((f) => f.prefix === prefix);
    if (!fam) continue;
    // Net (débit - crédit) — pour les charges, on attend net positif.
    outflowsByFamily.set(fam.prefix, (outflowsByFamily.get(fam.prefix) ?? 0n) + l.debit - l.credit);
  }
  const outflows7d = OUTFLOW_FAMILIES.map((f) => ({
    category: f.label,
    amount: Math.max(0, Number(outflowsByFamily.get(f.prefix) ?? 0n)),
    color: f.color,
  })).filter((x) => x.amount > 0);

  // ─── Priorités du jour ──────────────────────────────────────────────
  const priorities = [
    n2Pending.length > 0 && {
      type: "VALIDATION",
      title: `Valider ${n2Pending.length} demande${n2Pending.length > 1 ? "s" : ""} en attente N2 DAF`,
      urgency: n2Pending.length > 5 ? "HIGH" : "NORMAL",
      link: "/direction-financiere/validations",
    },
    urgentTax > 0 && {
      type: "TAX",
      title: `Préparer ${urgentTax} dépôt${urgentTax > 1 ? "s" : ""} fiscaux dans les 7 jours`,
      urgency: "HIGH",
      link: "/direction-financiere/fiscal",
    },
    overdueReceivables > 50_000_000n && {
      type: "RECOVERY",
      title: `Relancer les créances échues (${(Number(overdueReceivables) / 1_000_000).toFixed(0)} M FCFA en retard)`,
      urgency: "NORMAL",
      link: "/direction-financiere/recouvrement",
    },
    {
      type: "TREASURY",
      title: "Vérifier les rapprochements bancaires UBA et BICEC",
      urgency: "NORMAL",
      link: "/direction-financiere/tresorerie",
    },
  ].filter(Boolean);

  return NextResponse.json({
    consolidatedPosition: {
      value: totalBalance.toString(),
      // Delta du jour = net flow d'aujourd'hui (entrées - sorties), réel.
      dailyDelta: Number(dailyReceipts - dailyPayments),
      creditLines: {
        granted: totalGranted.toString(),
        used: totalUsed.toString(),
        available: (totalGranted - totalUsed).toString(),
      },
      totalAvailable: totalAvailable.toString(),
    },
    primaryKpis: {
      receipts: { value: dailyReceipts.toString(), trend: trend7d("in") },
      payments: { value: dailyPayments.toString(), trend: trend7d("out") },
      pendingValidations: { count: n2Pending.length, amount: n2Amount.toString() },
      dso: { value: dso, alert: dso > 60 },
    },
    secondaryKpis: {
      taxDeadlines: { count: taxDeadlines.length, amount: taxAmount.toString(), urgent: urgentTax },
      overdueReceivables: { amount: overdueReceivables.toString() },
      ytdMargin: { value: Number(ytdMargin.toFixed(1)) },
      bfr: { days: bfrDays },
    },
    priorities,
    treasuryEvolution30d: treasuryEvolution,
    outflowsBreakdown7d: outflows7d,
  });
}
