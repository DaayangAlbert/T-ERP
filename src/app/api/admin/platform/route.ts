import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;

  const [plans, integrations, featureFlags] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      orderBy: { orderIndex: "asc" },
      include: { _count: { select: { tenants: true, subscriptions: true } } },
    }),
    prisma.globalIntegration.findMany({ orderBy: { code: "asc" } }),
    prisma.tenantFeatureFlag.findMany({
      include: { tenant: { select: { slug: true, name: true } } },
      orderBy: { enabledAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      monthlyPriceXAF: Number(p.monthlyPriceXAF),
      annualPriceXAF: p.annualPriceXAF ? Number(p.annualPriceXAF) : null,
      maxUsers: p.maxUsers,
      maxSites: p.maxSites,
      maxStorageGb: p.maxStorageGb,
      enabledModules: p.enabledModules,
      hasWhatsAppBusiness: p.hasWhatsAppBusiness,
      hasJobPortal: p.hasJobPortal,
      hasSgModule: p.hasSgModule,
      supportSlaHours: p.supportSlaHours,
      isRecommended: p.isRecommended,
      active: p.active,
      tenantsCount: p._count.tenants,
      subscriptionsCount: p._count.subscriptions,
    })),
    integrations: integrations.map((i) => ({
      ...i,
      lastHealthCheckAt: i.lastHealthCheckAt?.toISOString() ?? null,
    })),
    featureFlags: featureFlags.map((f) => ({
      ...f,
      enabledAt: f.enabledAt.toISOString(),
      expiresAt: f.expiresAt?.toISOString() ?? null,
    })),
  });
}
