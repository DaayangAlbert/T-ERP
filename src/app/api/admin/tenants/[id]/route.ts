import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: {
      subscriptionPlan: {
        select: { code: true, name: true, monthlyPriceXAF: true, maxUsers: true, maxSites: true },
      },
      subscriptions: {
        orderBy: { startDate: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          billingCycle: true,
          mrrXAF: true,
          startDate: true,
        },
      },
      _count: { select: { users: true, sites: true, saasInvoices: true } },
    },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  }
  return NextResponse.json({
    tenant: {
      ...tenant,
      subscriptionPlan: tenant.subscriptionPlan
        ? {
            ...tenant.subscriptionPlan,
            monthlyPriceXAF: Number(tenant.subscriptionPlan.monthlyPriceXAF),
          }
        : null,
      subscriptions: tenant.subscriptions.map((s) => ({
        ...s,
        mrrXAF: Number(s.mrrXAF),
        startDate: s.startDate.toISOString(),
      })),
      provisionedAt: tenant.provisionedAt?.toISOString() ?? null,
      suspendedAt: tenant.suspendedAt?.toISOString() ?? null,
      terminatedAt: tenant.terminatedAt?.toISOString() ?? null,
      demoExpiresAt: tenant.demoExpiresAt?.toISOString() ?? null,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    },
  });
}
