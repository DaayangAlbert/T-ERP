/**
 * Seed Super-Admin Anthropic (PROMPT 0).
 *
 *  pnpm exec tsx prisma/seed-admin.ts
 *
 * Crée :
 *  - 2 PlatformAdmin : superadmin@terp.cm (CTO) + support@terp.cm (SUPPORT_L3)
 *  - 3 SubscriptionPlan : ESSENTIEL 95K, PRO 285K (recommandé), ENTERPRISE
 *  - Souscription pour chaque tenant existant + factures derniers 3 mois
 *  - 8 GlobalIntegration (CNPS, DGI, WhatsApp, R2, Resend, Afriland, Sentry, Neon)
 *  - 30 SaasMetric (jour J-30 → J0)
 *  - 2 PlatformIncident actifs (P2 + P3)
 *  - ~50 GlobalAuditLog 30 derniers jours
 */
import {
  PrismaClient,
  PlatformAdminRole,
  PlatformAdminStatus,
  BillingCycle,
  SubscriptionStatus,
  SaasInvoiceStatus,
  PaymentMethod,
  PlatformIncidentSeverity,
  PlatformIncidentStatus,
  GlobalIntegrationStatus,
  GlobalAuditAction,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const PWD = "Admin2026!";

async function main() {
  console.log("🌱 Seed Super-Admin plateforme…");

  const passwordHash = await bcrypt.hash(PWD, 12);

  const cto = await prisma.platformAdmin.upsert({
    where: { email: "superadmin@terp.cm" },
    create: {
      email: "superadmin@terp.cm",
      passwordHash,
      firstName: "Albert",
      lastName: "DAAYANG",
      role: PlatformAdminRole.CTO,
      mfaEnabled: false,
      mfaSecret: "DEMO",
      whitelistedIps: ["0.0.0.0/0"],
      canCreateTenants: true,
      canSuspendTenants: true,
      canDeleteTenants: true,
      canManageBilling: true,
      canManagePlatformConfig: true,
      canViewAllTenantsData: true,
      canManageGlobalIntegrations: true,
      canViewGlobalAudit: true,
      status: PlatformAdminStatus.ACTIVE,
    },
    update: { passwordHash, status: PlatformAdminStatus.ACTIVE },
  });
  console.log(`✓ Super-Admin CTO : ${cto.email} / ${PWD}`);

  const support = await prisma.platformAdmin.upsert({
    where: { email: "support@terp.cm" },
    create: {
      email: "support@terp.cm",
      passwordHash,
      firstName: "Marie",
      lastName: "FOUDA",
      role: PlatformAdminRole.SUPPORT_L3,
      mfaEnabled: false,
      whitelistedIps: ["0.0.0.0/0"],
      canCreateTenants: false,
      canSuspendTenants: false,
      canDeleteTenants: false,
      canManageBilling: false,
      canManagePlatformConfig: false,
      canViewAllTenantsData: true,
      canManageGlobalIntegrations: false,
      canViewGlobalAudit: true,
      status: PlatformAdminStatus.ACTIVE,
    },
    update: { passwordHash, status: PlatformAdminStatus.ACTIVE },
  });
  console.log(`✓ Support L3 : ${support.email}`);

  // 3 plans
  const planEssentiel = await prisma.subscriptionPlan.upsert({
    where: { code: "ESSENTIEL" },
    create: {
      code: "ESSENTIEL",
      name: "Essentiel",
      description: "PME 5-30 employés · 1 société",
      monthlyPriceXAF: 95_000n,
      annualPriceXAF: 950_000n,
      maxUsers: 30,
      maxSites: 5,
      maxStorageGb: 5,
      enabledModules: ["RH", "PAIE", "COMPTA_BASE", "PWA"],
      supportSlaHours: 48,
      orderIndex: 1,
    },
    update: { active: true },
  });
  const planPro = await prisma.subscriptionPlan.upsert({
    where: { code: "PRO" },
    create: {
      code: "PRO",
      name: "Pro",
      description: "PME 30-150 employés · 3 sociétés",
      monthlyPriceXAF: 285_000n,
      annualPriceXAF: 2_850_000n,
      maxUsers: 150,
      maxSites: 25,
      maxStorageGb: 50,
      enabledModules: [
        "RH",
        "PAIE",
        "COMPTA_FULL",
        "GED",
        "WHATSAPP",
        "RECRUITMENT",
        "PWA",
      ],
      hasWhatsAppBusiness: true,
      hasJobPortal: true,
      supportSlaHours: 24,
      isRecommended: true,
      orderIndex: 2,
    },
    update: { active: true, isRecommended: true },
  });
  const planEnterprise = await prisma.subscriptionPlan.upsert({
    where: { code: "ENTERPRISE" },
    create: {
      code: "ENTERPRISE",
      name: "Enterprise",
      description: "Groupes 150+ employés · multi-sociétés",
      monthlyPriceXAF: 850_000n,
      annualPriceXAF: 8_500_000n,
      maxUsers: 9999,
      maxSites: 999,
      maxStorageGb: 500,
      enabledModules: [
        "RH",
        "PAIE",
        "COMPTA_FULL",
        "GED",
        "WHATSAPP",
        "RECRUITMENT",
        "SG_GOVERNANCE",
        "PWA",
        "AUDIT_PREMIUM",
      ],
      hasWhatsAppBusiness: true,
      hasJobPortal: true,
      hasSgModule: true,
      supportSlaHours: 4,
      orderIndex: 3,
    },
    update: { active: true },
  });
  console.log("✓ 3 plans : Essentiel, Pro (recommandé), Enterprise");

  // Lier les tenants existants à un plan + créer Subscription + factures
  const tenants = await prisma.tenant.findMany({
    select: { id: true, slug: true, name: true, status: true },
  });
  const now = new Date();
  let invCount = 0;
  let subCount = 0;
  for (const t of tenants) {
    const plan =
      t.slug === "batimcam"
        ? planPro
        : t.slug.startsWith("batimcam-")
          ? planEssentiel
          : planPro;
    await prisma.tenant.update({
      where: { id: t.id },
      data: {
        subscriptionPlanId: plan.id,
        provisionedAt: new Date(now.getTime() - 1000 * 86_400 * 180),
        billingContactEmail: `daf@${t.slug}.cm`,
        billingContactName: "Marie NGONO",
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        subdomain: `${t.slug}.terp.cm`,
        legalForm: "SA",
        country: "CM",
      },
    });

    const sub = await prisma.subscription.upsert({
      where: { id: `sub-${t.id}` },
      create: {
        id: `sub-${t.id}`,
        tenantId: t.id,
        planId: plan.id,
        startDate: new Date(now.getTime() - 1000 * 86_400 * 180),
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        mrrXAF: plan.monthlyPriceXAF,
      },
      update: { mrrXAF: plan.monthlyPriceXAF },
    });
    subCount++;

    // 3 dernières factures
    for (let m = 2; m >= 0; m--) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
      const dueAt = new Date(periodEnd.getTime() + 1000 * 86_400 * 15);
      const amountHT = plan.monthlyPriceXAF;
      const vat = (Number(amountHT) * 19.25) / 100;
      const amountTTC = Number(amountHT) + vat;
      const ref = `F-${now.getFullYear()}-${String(invCount + 1).padStart(4, "0")}`;
      const isOverdue = m === 2 && t.slug === "batimcam-douala";
      const isPaid = !isOverdue && m > 0;
      const status: SaasInvoiceStatus = isOverdue
        ? SaasInvoiceStatus.OVERDUE
        : isPaid
          ? SaasInvoiceStatus.PAID
          : SaasInvoiceStatus.ISSUED;
      await prisma.saasInvoice.upsert({
        where: { reference: ref },
        create: {
          reference: ref,
          tenantId: t.id,
          subscriptionId: sub.id,
          periodStart,
          periodEnd,
          amountHT,
          vatRate: 19.25,
          vatAmount: BigInt(Math.round(vat)),
          amountTTC: BigInt(Math.round(amountTTC)),
          status,
          dueAt,
          paidAt: isPaid ? new Date(dueAt.getTime() - 1000 * 86_400 * 5) : null,
          paidAmount: isPaid ? BigInt(Math.round(amountTTC)) : null,
          paymentMethod: isPaid ? PaymentMethod.BANK_TRANSFER : null,
          reminderCount: isOverdue ? 2 : 0,
        },
        update: {},
      });
      invCount++;
    }
  }
  console.log(`✓ ${subCount} subscriptions, ${invCount} factures (dont impayés)`);

  // 8 intégrations globales
  const integrations = [
    { code: "CNPS", name: "CNPS Cameroun", provider: "Gouvernement", status: GlobalIntegrationStatus.ACTIVE },
    { code: "DGI", name: "DGI Cameroun", provider: "Gouvernement", status: GlobalIntegrationStatus.ACTIVE },
    { code: "WHATSAPP", name: "WhatsApp Business", provider: "Meta", status: GlobalIntegrationStatus.ACTIVE },
    { code: "R2", name: "Cloudflare R2", provider: "Cloudflare", status: GlobalIntegrationStatus.ACTIVE },
    { code: "RESEND", name: "Resend Email", provider: "Resend", status: GlobalIntegrationStatus.ACTIVE },
    { code: "AFRILAND", name: "Afriland First Bank", provider: "Afriland", status: GlobalIntegrationStatus.DEGRADED },
    { code: "SENTRY", name: "Sentry", provider: "Sentry", status: GlobalIntegrationStatus.ACTIVE },
    { code: "NEON", name: "Neon Postgres", provider: "Neon", status: GlobalIntegrationStatus.ACTIVE },
  ];
  for (const ig of integrations) {
    await prisma.globalIntegration.upsert({
      where: { code: ig.code },
      create: { ...ig, lastHealthCheckAt: new Date() },
      update: { status: ig.status, lastHealthCheckAt: new Date() },
    });
  }
  console.log(`✓ ${integrations.length} intégrations globales`);

  // SaasMetric pour 30 derniers jours
  await prisma.saasMetric.deleteMany();
  for (let d = 30; d >= 0; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
    day.setHours(0, 0, 0, 0);
    const activeTenants = tenants.length;
    const mrrXAF = BigInt(activeTenants * 285_000);
    await prisma.saasMetric.create({
      data: {
        date: day,
        mrrXAF,
        arrXAF: mrrXAF * 12n,
        activeTenants,
        newTenants: d === 15 ? 1 : 0,
        churnedTenants: 0,
        activeUsers: 50 + activeTenants * 10,
        dau: 30 + activeTenants * 4,
        mau: 50 + activeTenants * 10,
        arpuXAF: 285_000n,
        conversionRate: 0.18,
      },
    });
  }
  console.log("✓ 31 SaasMetric (J-30 → J0)");

  // 2 incidents actifs
  await prisma.platformIncident.deleteMany({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } });
  await prisma.platformIncident.create({
    data: {
      reference: "INC-2026-0142",
      title: "Latence élevée module paie njoya-construction",
      description: "P95 > 8s observé sur les calculs de bulletins du tenant njoya-construction.",
      severity: PlatformIncidentSeverity.P2_MAJOR,
      status: PlatformIncidentStatus.INVESTIGATING,
      affectedTenants: ["njoya-construction"],
      module: "Paie",
      usersImpacted: 12,
      hypothesis: "Index manquant sur payslip_lines.tenantId — investigation en cours.",
      assignedTo: support.id,
    },
  });
  await prisma.platformIncident.create({
    data: {
      reference: "INC-2026-0141",
      title: "Latence R2 upload CV",
      description: "Latence ~3s sur uploads CV > 2 Mo région CM.",
      severity: PlatformIncidentSeverity.P3_MINOR,
      status: PlatformIncidentStatus.MONITORING,
      affectedTenants: tenants.map((t) => t.slug),
      module: "Storage",
      usersImpacted: 8,
      assignedTo: support.id,
    },
  });
  console.log("✓ 2 incidents actifs (INC-2026-0142 P2 + INC-2026-0141 P3)");

  // Audit logs simulés
  await prisma.globalAuditLog.deleteMany();
  const actions: GlobalAuditAction[] = [
    GlobalAuditAction.AUTH_MFA_SUCCESS,
    GlobalAuditAction.CROSS_TENANT_ACCESS,
    GlobalAuditAction.CONFIG_MODIFIED,
    GlobalAuditAction.INVOICE_ISSUED,
    GlobalAuditAction.PAYMENT_RECORDED,
    GlobalAuditAction.FEATURE_FLAG_TOGGLED,
  ];
  for (let i = 0; i < 50; i++) {
    const action = actions[i % actions.length];
    const isCto = i % 3 === 0;
    await prisma.globalAuditLog.create({
      data: {
        timestamp: new Date(now.getTime() - 1000 * 3600 * (i * 6 + 1)),
        platformAdminId: isCto ? cto.id : support.id,
        actorEmail: isCto ? cto.email : support.email,
        actorRole: isCto ? PlatformAdminRole.CTO : PlatformAdminRole.SUPPORT_L3,
        action,
        targetType: action === GlobalAuditAction.INVOICE_ISSUED ? "SaasInvoice" : "Tenant",
        targetId: tenants[i % tenants.length].id,
        targetDescription: tenants[i % tenants.length].name,
        tenantId: tenants[i % tenants.length].id,
        ipAddress: "203.0.113." + (10 + (i % 90)),
        userAgent: "Mozilla/5.0 (Console-Admin)",
        justification: action === GlobalAuditAction.CROSS_TENANT_ACCESS ? "Support ticket #TK-" + (1000 + i) : null,
      },
    });
  }
  console.log("✓ 50 GlobalAuditLog");

  console.log("\n=== Comptes Super-Admin ===");
  console.log(`  CTO     : superadmin@terp.cm / ${PWD}`);
  console.log(`  Support : support@terp.cm / ${PWD}`);
  console.log(`  URL     : http://localhost:5000/admin/login`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
