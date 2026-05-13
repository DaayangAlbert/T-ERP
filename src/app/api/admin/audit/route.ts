import { NextResponse } from "next/server";
import { GlobalAuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const actor = url.searchParams.get("actor")?.trim() ?? "";
  const tenantId = url.searchParams.get("tenant");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const where: Prisma.GlobalAuditLogWhereInput = {};
  if (action && action !== "all") where.action = action as GlobalAuditAction;
  if (actor) where.actorEmail = { contains: actor, mode: "insensitive" };
  if (tenantId) where.tenantId = tenantId;
  if (dateFrom || dateTo) {
    where.timestamp = {};
    if (dateFrom) (where.timestamp as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) (where.timestamp as Prisma.DateTimeFilter).lte = new Date(dateTo);
  }

  const [logs, total, crossTenantCount, gdprCount, mfaFailures] = await Promise.all([
    prisma.globalAuditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 100,
      include: {
        tenant: { select: { name: true, slug: true } },
      },
    }),
    prisma.globalAuditLog.count({ where }),
    prisma.globalAuditLog.count({
      where: { action: GlobalAuditAction.CROSS_TENANT_ACCESS, ...where },
    }),
    prisma.globalAuditLog.count({
      where: { action: GlobalAuditAction.GDPR_EXPORT },
    }),
    prisma.globalAuditLog.count({
      where: { action: GlobalAuditAction.AUTH_MFA_FAILURE },
    }),
  ]);

  return NextResponse.json({
    stats: {
      total,
      crossTenantAccess: crossTenantCount,
      gdprExports: gdprCount,
      mfaFailures,
    },
    logs: logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp.toISOString(),
      actorEmail: l.actorEmail,
      actorRole: l.actorRole,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      targetDescription: l.targetDescription,
      tenantId: l.tenantId,
      tenantName: l.tenant?.name ?? null,
      tenantSlug: l.tenant?.slug ?? null,
      ipAddress: l.ipAddress,
      justification: l.justification,
      ticketReference: l.ticketReference,
    })),
  });
}
