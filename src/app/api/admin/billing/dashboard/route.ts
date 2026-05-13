import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;

  const [mrrAgg, overdue, monthInvoices, byPlan] = await Promise.all([
    prisma.subscription.aggregate({
      where: { status: "ACTIVE" },
      _sum: { mrrXAF: true },
      _count: { id: true },
    }),
    prisma.saasInvoice.findMany({
      where: { status: "OVERDUE" },
      orderBy: { dueAt: "asc" },
      take: 10,
      include: {
        tenant: { select: { name: true, slug: true } },
      },
    }),
    prisma.saasInvoice.findMany({
      where: { issuedAt: { gte: firstDayOfMonth() } },
      orderBy: { issuedAt: "desc" },
      take: 15,
      include: {
        tenant: { select: { name: true, slug: true } },
      },
    }),
    prisma.subscription.groupBy({
      by: ["planId"],
      where: { status: "ACTIVE" },
      _sum: { mrrXAF: true },
      _count: { id: true },
    }),
  ]);

  const planIds = byPlan.map((p) => p.planId);
  const plans =
    planIds.length === 0
      ? []
      : await prisma.subscriptionPlan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, code: true, name: true, monthlyPriceXAF: true },
        });
  const planById = new Map(plans.map((p) => [p.id, p]));

  const mrr = mrrAgg._sum.mrrXAF ?? 0n;
  const overdueSum = overdue.reduce((s, i) => s + Number(i.amountTTC), 0);

  return NextResponse.json({
    kpis: {
      mrrXAF: Number(mrr),
      arrXAF: Number(mrr) * 12,
      activeSubscriptions: mrrAgg._count.id,
      overdueCount: overdue.length,
      overdueAmountXAF: overdueSum,
      arpuXAF: mrrAgg._count.id > 0 ? Math.round(Number(mrr) / mrrAgg._count.id) : 0,
    },
    overdue: overdue.map((i) => ({
      id: i.id,
      reference: i.reference,
      tenantName: i.tenant.name,
      tenantSlug: i.tenant.slug,
      amountTTC: Number(i.amountTTC),
      dueAt: i.dueAt.toISOString(),
      daysOverdue: Math.max(
        0,
        Math.floor((Date.now() - i.dueAt.getTime()) / 86_400_000),
      ),
      reminderCount: i.reminderCount,
    })),
    recentInvoices: monthInvoices.map((i) => ({
      id: i.id,
      reference: i.reference,
      tenantName: i.tenant.name,
      tenantSlug: i.tenant.slug,
      amountHT: Number(i.amountHT),
      vatAmount: Number(i.vatAmount),
      amountTTC: Number(i.amountTTC),
      status: i.status,
      issuedAt: i.issuedAt.toISOString(),
      dueAt: i.dueAt.toISOString(),
      paidAt: i.paidAt?.toISOString() ?? null,
    })),
    revenueByPlan: byPlan.map((p) => {
      const plan = planById.get(p.planId);
      return {
        planId: p.planId,
        planCode: plan?.code ?? "?",
        planName: plan?.name ?? "Plan",
        subscriptions: p._count.id,
        mrrXAF: Number(p._sum.mrrXAF ?? 0n),
      };
    }),
  });
}

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
