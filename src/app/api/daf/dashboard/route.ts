import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, ValidationStatus, SiteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);

  const [banks, pendingValidations, sites, taxDeadlines, receivables] = await Promise.all([
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
        dueDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 86_400_000) },
        paymentStatus: { in: ["PENDING", "SCHEDULED"] },
      },
      select: { id: true, dueDate: true, amount: true, type: true },
    }),
    prisma.receivable.findMany({
      where: { tenantId: session.tenantId, status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
      select: { amount: true, paidAmount: true, dueDate: true, daysOverdue: true },
    }),
  ]);

  // Position consolidée
  const totalBalance = banks.reduce((s, b) => s + b.balance, 0n);
  const totalGranted = banks.reduce((s, b) => s + b.creditLineGranted, 0n);
  const totalUsed = banks.reduce((s, b) => s + b.creditLineUsed, 0n);
  const totalAvailable = totalBalance + (totalGranted - totalUsed);

  // KPIs jour synthétisés
  const dailyReceipts = totalBalance / 100n; // ~1% du solde, simulation
  const dailyPayments = totalBalance / 120n;

  // Validations N2 en attente DAF
  const n2Pending = pendingValidations.filter((v) => v.currentStep === "DAF");
  const n2Amount = n2Pending.reduce((s, v) => s + (v.amount ?? 0n), 0n);

  // DSO clients
  const totalReceivables = receivables.reduce((s, r) => s + (r.amount - r.paidAmount), 0n);
  const overdueReceivables = receivables
    .filter((r) => r.daysOverdue > 0)
    .reduce((s, r) => s + (r.amount - r.paidAmount), 0n);
  // CA YTD synthétique = somme des budgets pondérée par avancement
  const earnedRevenue = sites.reduce((s, x) => s + (Number(x.budget) * x.progress) / 100, 0);
  const dso = earnedRevenue > 0 ? Math.round((Number(totalReceivables) / earnedRevenue) * 360) : 0;

  // Marge YTD pondérée
  const totalBudget = sites.reduce((s, x) => s + Number(x.budget), 0);
  const ytdMargin = totalBudget
    ? sites.reduce((s, x) => s + x.margin * Number(x.budget), 0) / totalBudget
    : 0;

  // BFR jours de CA (synthèse)
  const bfrDays = earnedRevenue > 0 ? Math.round((Number(totalReceivables) / earnedRevenue) * 365) : 0;

  // Échéances fiscales
  const taxAmount = taxDeadlines.reduce((s, t) => s + (t.amount ?? 0n), 0n);
  const urgentTax = taxDeadlines.filter(
    (t) => t.dueDate.getTime() < Date.now() + 7 * 86_400_000
  ).length;

  // Sparkline 7 jours (synthétisée)
  const trend7d = (base: bigint) =>
    Array.from({ length: 7 }, (_, i) => ({
      day: i,
      value: Number(base) * (0.85 + Math.sin(i * 0.7) * 0.15 + i * 0.02),
    }));

  // Évolution trésorerie 30 jours
  const treasuryEvolution = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86_400_000);
    const wave = 1 + Math.sin((i / 30) * Math.PI * 2) * 0.08;
    return {
      date: d.toISOString().slice(0, 10),
      value: Math.round(Number(totalBalance) * wave),
    };
  });

  // Décomposition sorties 7 jours
  const outflows7d = [
    { category: "Salaires", amount: Math.round(Number(dailyPayments) * 3.2), color: "#A855F7" },
    { category: "Fournisseurs", amount: Math.round(Number(dailyPayments) * 2.8), color: "#15803D" },
    { category: "Fiscal & social", amount: Math.round(Number(dailyPayments) * 1.5), color: "#B45309" },
    { category: "Autres", amount: Math.round(Number(dailyPayments) * 0.5), color: "#6B7280" },
  ];

  // Mes priorités du jour
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
      dailyDelta: Math.round(Number(totalBalance) * 0.012),
      creditLines: {
        granted: totalGranted.toString(),
        used: totalUsed.toString(),
        available: (totalGranted - totalUsed).toString(),
      },
      totalAvailable: totalAvailable.toString(),
    },
    primaryKpis: {
      receipts: { value: dailyReceipts.toString(), trend: trend7d(dailyReceipts) },
      payments: { value: dailyPayments.toString(), trend: trend7d(dailyPayments) },
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
