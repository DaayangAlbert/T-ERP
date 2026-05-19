import { prisma } from "@/lib/prisma";

export class TenantQuotaError extends Error {
  constructor(
    public readonly resource: "users" | "sites" | "storageGb",
    public readonly limit: number,
    public readonly current: number,
  ) {
    super(
      `Quota ${resource} atteint : ${current}/${limit}. Contactez votre administrateur pour augmenter votre plan.`,
    );
    this.name = "TenantQuotaError";
  }
}

async function getEffectiveLimit(
  tenantId: string,
  field: "maxUsers" | "maxSites" | "maxStorageGb",
): Promise<number | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      maxUsers: true,
      maxSites: true,
      maxStorageGb: true,
      subscriptionPlan: {
        select: { maxUsers: true, maxSites: true, maxStorageGb: true },
      },
    },
  });
  if (!tenant) return null;
  const override = tenant[field];
  const planLimit = tenant.subscriptionPlan?.[field];
  if (override == null && planLimit == null) return null;
  if (override == null) return planLimit ?? null;
  if (planLimit == null) return override;
  return Math.min(override, planLimit);
}

export async function assertUserQuota(tenantId: string): Promise<void> {
  const limit = await getEffectiveLimit(tenantId, "maxUsers");
  if (limit === null) return;
  const current = await prisma.user.count({
    where: { tenantId, status: "ACTIVE" },
  });
  if (current >= limit) throw new TenantQuotaError("users", limit, current);
}

export async function assertSiteQuota(tenantId: string): Promise<void> {
  const limit = await getEffectiveLimit(tenantId, "maxSites");
  if (limit === null) return;
  const current = await prisma.site.count({
    where: { tenantId, status: { not: "ARCHIVED" } },
  });
  if (current >= limit) throw new TenantQuotaError("sites", limit, current);
}
