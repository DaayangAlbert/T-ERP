import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";

export const dynamic = "force-dynamic";

// Le model TenantSettings existant stocke tout en Json (identity, integrations, workflows...).
// L'IT édite ces structures via cette route.

const updateSchema = z.object({
  identity: z.record(z.unknown()).optional(),
  branding: z.record(z.unknown()).optional(),
  localization: z.record(z.unknown()).optional(),
  security: z.record(z.unknown()).optional(),
  fiscal: z.record(z.unknown()).optional(),
  notifications: z.record(z.unknown()).optional(),
});

export async function GET() {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  let settings = await prisma.tenantSettings.findUnique({ where: { tenantId: session.tenantId! } });
  if (!settings) {
    // Création des defaults SYSCOHADA Cameroun — identity vide à renseigner par le tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId! },
      select: { name: true, legalForm: true, taxId: true, cnpsId: true },
    });
    settings = await prisma.tenantSettings.create({
      data: {
        tenantId: session.tenantId!,
        identity: {
          legalName: tenant?.name ?? "",
          legalForm: tenant?.legalForm ?? "",
          niu: tenant?.taxId ?? "",
          cnpsNumber: tenant?.cnpsId ?? "",
        },
        modules: { msg: true, payroll: true, hr: true, accounting: true },
        payrollRates: { irpp: "barème CGI 2024", cnps: 16.2, cfc: 1.5, fne: 1.0 },
        workflows: {},
        notifications: {
          emailEnabled: true,
          whatsappEnabled: true,
          browserPushEnabled: true,
          smsEnabled: false,
          digestWeeklyEnabled: true,
        },
        integrations: {},
      },
    });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId! },
    select: { primaryColor: true, secondaryColor: true, logoUrl: true },
  });

  // On expose une structure organisée par section pour l'UI
  return NextResponse.json({
    tenantId: settings.tenantId,
    identity: settings.identity,
    modules: settings.modules,
    payrollRates: settings.payrollRates,
    notifications: settings.notifications,
    branding: {
      primaryColor: tenant?.primaryColor ?? "#A855F7",
      secondaryColor: tenant?.secondaryColor ?? "#7E22CE",
      logoUrl: tenant?.logoUrl ?? null,
      tagline: "",
    },
    localization: {
      defaultLanguage: "fr-CM",
      defaultCurrency: "XAF",
      timezone: "Africa/Douala",
      dateFormat: "DD/MM/YYYY",
      firstDayOfWeek: 1,
    },
    security: {
      minPasswordLength: 12,
      passwordRequireUppercase: true,
      passwordRequireDigit: true,
      passwordRequireSymbol: true,
      passwordExpiryDays: 90,
      sessionInactivityMinutes: 30,
      mfaRequiredForDirection: true,
      mfaRequiredForTransverse: true,
      mfaRequiredForAll: false,
      autoDeactivateInactiveDays: 60,
    },
    fiscal: {
      fiscalYearStart: 1,
      chartOfAccounts: "SYSCOHADA_2018",
      standardVatRate: 19.25,
    },
    updatedAt: settings.updatedAt.toISOString(),
  });
}

const CRITICAL_FIELDS = ["legalName", "legalForm", "niu", "cnpsNumber"];

export async function PATCH(req: Request) {
  const guard = await guardIt("canManageTenantSettings");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  // Détection des changements critiques (workflow DG requis)
  if (parsed.data.identity) {
    const current = await prisma.tenantSettings.findUnique({ where: { tenantId: session.tenantId! } });
    const before = (current?.identity ?? {}) as Record<string, unknown>;
    const after = parsed.data.identity;
    const criticalChanges = CRITICAL_FIELDS.filter((k) => k in after && after[k] !== before[k]);
    if (criticalChanges.length > 0) {
      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.sub,
          action: "it.settings.critical-blocked",
          entityType: "TenantSettings",
          entityId: session.tenantId!,
          metadata: { fields: criticalChanges },
        },
      });
      return NextResponse.json(
        { error: `Modification critique (${criticalChanges.join(", ")}) — workflow DG requis` },
        { status: 403 }
      );
    }
  }

  // Merge dans les Json correspondants. Pour le MVP on stocke tout en flat sur les champs existants
  // (identity, notifications, integrations). Le reste va dans modules.
  const update: Record<string, unknown> = {};
  if (parsed.data.identity) update.identity = parsed.data.identity;
  if (parsed.data.notifications) update.notifications = parsed.data.notifications;
  // Les autres sections (branding/localization/security/fiscal) sont stockées dans modules pour rester compat
  const modulesMerge: Record<string, unknown> = {};
  if (parsed.data.branding) modulesMerge.branding = parsed.data.branding;
  if (parsed.data.localization) modulesMerge.localization = parsed.data.localization;
  if (parsed.data.security) modulesMerge.security = parsed.data.security;
  if (parsed.data.fiscal) modulesMerge.fiscal = parsed.data.fiscal;
  if (Object.keys(modulesMerge).length) {
    const current = await prisma.tenantSettings.findUnique({ where: { tenantId: session.tenantId! } });
    update.modules = { ...((current?.modules ?? {}) as Record<string, unknown>), ...modulesMerge };
  }

  const updated = await prisma.tenantSettings.upsert({
    where: { tenantId: session.tenantId! },
    create: {
      tenantId: session.tenantId!,
      identity: (parsed.data.identity ?? {}) as object,
      modules: modulesMerge as object,
      payrollRates: {},
      workflows: {},
      notifications: (parsed.data.notifications ?? {}) as object,
      integrations: {},
    },
    update: update as object,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "it.settings.update",
      entityType: "TenantSettings",
      entityId: updated.id,
      metadata: { sections: Object.keys(parsed.data) },
    },
  });

  return NextResponse.json({ ok: true });
}
