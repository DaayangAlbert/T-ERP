import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";
import { IntegrationStatus, LogLevel } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [
    totalUsers,
    activeUsers,
    activeSessions,
    mfaEnabled,
    inactiveUsers,
    integrations,
    recentErrorLogs,
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId: session.tenantId! } }),
    prisma.user.count({ where: { tenantId: session.tenantId!, status: "ACTIVE" } }),
    prisma.session.count({
      where: { user: { tenantId: session.tenantId! }, expiresAt: { gt: now }, revokedAt: null },
    }),
    prisma.user.count({ where: { tenantId: session.tenantId!, twoFactorEnabled: true } }),
    prisma.user.count({
      where: { tenantId: session.tenantId!, status: "ACTIVE", lastLoginAt: { lt: thirtyDaysAgo } },
    }),
    prisma.integration.findMany({
      where: { tenantId: session.tenantId! },
      orderBy: { status: "asc" },
    }),
    prisma.technicalLog.findMany({
      where: { tenantId: session.tenantId!, level: { in: [LogLevel.ERROR, LogLevel.FATAL] } },
      orderBy: { timestamp: "desc" },
      take: 10,
    }),
  ]);

  // KPIs
  const integrationsOk = integrations.filter((i) => i.status === IntegrationStatus.ACTIVE).length;
  const integrationsError = integrations.filter((i) => i.status === IntegrationStatus.ERROR).length;

  // Alertes hiérarchisées
  const alerts: Array<{ id: string; severity: "danger" | "warning" | "info"; title: string; detail: string; action?: string }> = [];
  for (const i of integrations) {
    if (i.status === IntegrationStatus.ERROR) {
      alerts.push({
        id: `int-${i.id}`,
        severity: "danger",
        title: `${i.name} en erreur`,
        detail: i.lastError ?? "Échec dernier sync",
        action: "/it/integrations",
      });
    }
  }
  if (inactiveUsers > 0) {
    alerts.push({
      id: "inactive-users",
      severity: "warning",
      title: `${inactiveUsers} utilisateurs inactifs > 30 j`,
      detail: "Désactivation auto à 60 j",
      action: "/it/users",
    });
  }
  for (const log of recentErrorLogs.slice(0, 2)) {
    alerts.push({
      id: `log-${log.id}`,
      severity: log.level === LogLevel.FATAL ? "danger" : "warning",
      title: `${log.service} · ${log.level}`,
      detail: log.message.slice(0, 200),
    });
  }

  // Sessions par catégorie de rôle
  const sessionsByRole = await prisma.user.groupBy({
    by: ["role"],
    where: { tenantId: session.tenantId!, status: "ACTIVE" },
    _count: true,
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId! },
    select: { slug: true },
  });

  return NextResponse.json({
    tenant: { slug: tenant?.slug ?? "", env: "production" },
    overallStatus: integrationsError === 0 ? "OPERATIONAL" : "DEGRADED",
    kpis: {
      activeUsers,
      totalUsers,
      activeSessions,
      mfaEnabled,
      inactiveUsers,
      integrationsOk,
      integrationsTotal: integrations.length,
      securityAlerts: alerts.filter((a) => a.severity === "danger").length,
    },
    alerts: alerts.slice(0, 5),
    integrations: integrations.map((i) => ({
      id: i.id,
      code: i.code,
      name: i.name,
      category: i.category,
      status: i.status,
      lastSyncAt: i.lastSyncAt?.toISOString() ?? null,
      lastError: i.lastError,
      retryCount: i.retryCount,
    })),
    sessionsByRole: sessionsByRole.map((s) => ({ role: s.role, users: s._count })),
  });
}
