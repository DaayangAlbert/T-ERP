import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import {
  defaultIdentity,
  defaultIntegrations,
  defaultModules,
  defaultNotifications,
  defaultPayrollRates,
  defaultWorkflows,
} from "@/lib/tenant-settings";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const DG_ROLES: Role[] = [Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!DG_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès réservé DG / admin" }, { status: 403 });
  }

  let settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: session.tenantId },
  });

  if (!settings) {
    const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { name: true } });
    settings = await prisma.tenantSettings.create({
      data: {
        tenantId: session.tenantId,
        identity: defaultIdentity(tenant?.name ?? "Tenant") as object,
        modules: defaultModules() as object,
        payrollRates: defaultPayrollRates() as object,
        workflows: defaultWorkflows() as object,
        notifications: defaultNotifications() as object,
        integrations: defaultIntegrations() as object,
      },
    });
  }

  return NextResponse.json({
    identity: settings.identity,
    modules: settings.modules,
    payrollRates: settings.payrollRates,
    workflows: settings.workflows,
    notifications: settings.notifications,
    integrations: settings.integrations,
    updatedAt: settings.updatedAt.toISOString(),
  });
}
