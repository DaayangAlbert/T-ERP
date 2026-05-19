import { NextResponse } from "next/server";
import { z } from "zod";
import { TenantStatus, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const DATA_RETENTION_DAYS = 30;

const deleteSchema = z.object({
  confirmSlug: z.string().min(1),
  reason: z.string().max(500).optional(),
});

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

/**
 * Soft delete d'un tenant (droit à l'effacement RGPD).
 *
 * Le tenant passe en status TERMINATED + `terminatedAt` + `dataRetentionEndAt`
 * fixé à 30 jours. Les utilisateurs actifs sont suspendus. Les données restent
 * en base pendant la période de rétention pour permettre une restauration
 * ou un export sur demande. Un job de purge async (hors scope ici) effacera
 * définitivement les données après `dataRetentionEndAt`.
 *
 * Pour confirmer, le caller doit fournir le slug exact du tenant dans le body
 * (sécurité contre les suppressions accidentelles).
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      terminatedAt: true,
    },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  if (tenant.terminatedAt) {
    return NextResponse.json(
      { error: "Tenant déjà supprimé", terminatedAt: tenant.terminatedAt.toISOString() },
      { status: 409 },
    );
  }

  const parsed = deleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (parsed.data.confirmSlug !== tenant.slug) {
    return NextResponse.json(
      { error: `Confirmation invalide : tapez exactement "${tenant.slug}"` },
      { status: 400 },
    );
  }

  const now = new Date();
  const retentionEnd = new Date(now.getTime() + DATA_RETENTION_DAYS * 86_400_000);

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: TenantStatus.TERMINATED,
        terminatedAt: now,
        dataRetentionEndAt: retentionEnd,
        suspendedAt: tenant.status === TenantStatus.SUSPENDED ? undefined : now,
        suspensionReason: parsed.data.reason ?? "Suppression demandée par le client (RGPD)",
      },
    }),
    prisma.user.updateMany({
      where: { tenantId: tenant.id, status: UserStatus.ACTIVE },
      data: { status: UserStatus.SUSPENDED },
    }),
    prisma.subscription.updateMany({
      where: { tenantId: tenant.id, status: "ACTIVE" },
      data: { status: "CANCELLED", endDate: now },
    }),
  ]);

  await logAdminAction({
    session,
    action: "TENANT_DELETED",
    targetType: "Tenant",
    targetId: tenant.id,
    targetDescription: `${tenant.name} (${tenant.slug})`,
    tenantId: tenant.id,
    justification: parsed.data.reason,
    beforeState: { status: tenant.status },
    afterState: {
      status: TenantStatus.TERMINATED,
      dataRetentionEndAt: retentionEnd.toISOString(),
    },
  });

  return NextResponse.json({
    ok: true,
    tenantId: tenant.id,
    slug: tenant.slug,
    terminatedAt: now.toISOString(),
    dataRetentionEndAt: retentionEnd.toISOString(),
    message: `Tenant supprimé. Les données seront définitivement purgées le ${retentionEnd.toLocaleDateString("fr-FR")}.`,
  });
}
