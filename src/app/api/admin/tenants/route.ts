import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, TenantStatus, LegalForm, PaymentMethod, Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const planCode = url.searchParams.get("plan");
  const country = url.searchParams.get("country");
  const search = url.searchParams.get("search")?.trim() ?? "";

  const where: Prisma.TenantWhereInput = {};
  if (status && status !== "all") where.status = status as TenantStatus;
  if (country) where.country = country;
  if (planCode) where.subscriptionPlan = { is: { code: planCode } };
  if (search)
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { subdomain: { contains: search, mode: "insensitive" } },
    ];

  const [tenants, counts] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        subscriptionPlan: { select: { code: true, name: true, monthlyPriceXAF: true } },
        _count: { select: { users: true, sites: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.tenant.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const countsByStatus: Record<string, number> = {};
  for (const c of counts) countsByStatus[c.status] = c._count.id;

  return NextResponse.json({
    stats: {
      total: tenants.length,
      active: countsByStatus.ACTIVE ?? 0,
      demo: countsByStatus.DEMO ?? 0,
      suspended: countsByStatus.SUSPENDED ?? 0,
      trial: countsByStatus.TRIAL ?? 0,
    },
    tenants: tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      subdomain: t.subdomain,
      name: t.name,
      country: t.country,
      legalForm: t.legalForm,
      status: t.status,
      planCode: t.subscriptionPlan?.code ?? null,
      planName: t.subscriptionPlan?.name ?? null,
      monthlyPriceXAF: t.subscriptionPlan
        ? Number(t.subscriptionPlan.monthlyPriceXAF)
        : null,
      provisionedAt: t.provisionedAt?.toISOString() ?? null,
      suspendedAt: t.suspendedAt?.toISOString() ?? null,
      suspensionReason: t.suspensionReason,
      isDemoTenant: t.isDemoTenant,
      demoExpiresAt: t.demoExpiresAt?.toISOString() ?? null,
      billingContactEmail: t.billingContactEmail,
      usersCount: t._count.users,
      sitesCount: t._count.sites,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

const provisionSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/, "Slug invalide"),
  country: z.string().min(2).max(3).default("CM"),
  legalForm: z.nativeEnum(LegalForm).optional(),
  taxId: z.string().max(40).optional(),
  planCode: z.string().min(1),
  billingContactEmail: z.string().email(),
  billingContactName: z.string().min(2),
  paymentMethod: z.nativeEnum(PaymentMethod).default("BANK_TRANSFER"),
  isDemoTenant: z.boolean().default(false),
});

export async function POST(req: Request) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const body = await req.json().catch(() => null);
  const parsed = provisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug déjà utilisé" }, { status: 409 });
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: data.planCode },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
  }

  const now = new Date();
  const tenant = await prisma.tenant.create({
    data: {
      slug: data.slug,
      subdomain: `${data.slug}.terpgroup.com`,
      name: data.name,
      country: data.country,
      legalForm: data.legalForm,
      taxId: data.taxId,
      subscriptionPlanId: plan.id,
      plan: Plan.STANDARD,
      status: data.isDemoTenant ? TenantStatus.DEMO : TenantStatus.ACTIVE,
      provisionedAt: now,
      isDemoTenant: data.isDemoTenant,
      demoExpiresAt: data.isDemoTenant
        ? new Date(now.getTime() + 1000 * 86_400 * 30)
        : null,
      billingContactEmail: data.billingContactEmail,
      billingContactName: data.billingContactName,
      paymentMethod: data.paymentMethod,
      maxUsers: plan.maxUsers,
      maxSites: plan.maxSites,
      maxStorageGb: plan.maxStorageGb,
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: plan.id,
      startDate: now,
      billingCycle: "MONTHLY",
      status: "ACTIVE",
      mrrXAF: plan.monthlyPriceXAF,
    },
  });

  await logAdminAction({
    session,
    action: "TENANT_PROVISIONED",
    targetType: "Tenant",
    targetId: tenant.id,
    targetDescription: `${tenant.name} (${tenant.slug})`,
    tenantId: tenant.id,
    afterState: { slug: tenant.slug, plan: plan.code },
  });

  return NextResponse.json(
    { ok: true, tenantId: tenant.id, slug: tenant.slug },
    { status: 201 },
  );
}
