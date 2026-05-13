import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    activeTenants,
    demoTenants,
    suspendedTenants,
    totalUsers,
    subscriptionsAgg,
    overdueInvoicesCount,
    overdueAmount,
    openIncidents,
    latestMetric,
    topTenants,
    recentActivity,
  ] = await Promise.all([
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.count({ where: { status: "DEMO" } }),
    prisma.tenant.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.aggregate({
      where: { status: "ACTIVE" },
      _sum: { mrrXAF: true },
      _count: { id: true },
    }),
    prisma.saasInvoice.count({ where: { status: "OVERDUE" } }),
    prisma.saasInvoice.aggregate({
      where: { status: "OVERDUE" },
      _sum: { amountTTC: true },
    }),
    prisma.platformIncident.findMany({
      where: { status: { in: ["OPEN", "INVESTIGATING", "MONITORING"] } },
      orderBy: { severity: "asc" },
      take: 5,
      select: {
        id: true,
        reference: true,
        title: true,
        severity: true,
        status: true,
        detectedAt: true,
        usersImpacted: true,
        affectedTenants: true,
      },
    }),
    prisma.saasMetric.findFirst({ orderBy: { date: "desc" } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      orderBy: { mrrXAF: "desc" },
      take: 5,
      select: {
        id: true,
        mrrXAF: true,
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        plan: { select: { code: true, name: true } },
      },
    }),
    prisma.globalAuditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 20,
      select: {
        id: true,
        timestamp: true,
        actorEmail: true,
        action: true,
        targetType: true,
        targetDescription: true,
        ipAddress: true,
      },
    }),
  ]);

  const mrr = subscriptionsAgg._sum.mrrXAF ?? 0n;

  return NextResponse.json({
    kpis: {
      activeTenants,
      demoTenants,
      suspendedTenants,
      totalTenants: activeTenants + demoTenants + suspendedTenants,
      totalUsers,
      activeSubscriptions: subscriptionsAgg._count.id,
      mrrXAF: Number(mrr),
      arrXAF: Number(mrr) * 12,
      overdueInvoices: overdueInvoicesCount,
      overdueAmountXAF: Number(overdueAmount._sum.amountTTC ?? 0n),
      uptime: 99.98,
      latestDau: latestMetric?.dau ?? 0,
      latestMau: latestMetric?.mau ?? 0,
    },
    incidents: openIncidents.map((i) => ({
      ...i,
      detectedAt: i.detectedAt.toISOString(),
    })),
    topTenants: topTenants.map((s) => ({
      tenantId: s.tenant.id,
      slug: s.tenant.slug,
      name: s.tenant.name,
      status: s.tenant.status,
      planCode: s.plan.code,
      planName: s.plan.name,
      mrrXAF: Number(s.mrrXAF),
    })),
    recentActivity: recentActivity.map((a) => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
    })),
  });
}
