import "./_guard-prod";
/**
 * Seed complémentaire — données Informaticien d'entreprise (TENANT_ADMIN).
 *
 * À lancer APRÈS le seed principal :
 *   pnpm exec tsx prisma/seed-it.ts
 *
 * Ajoute :
 *  - Olivier MEKA (TENANT_ADMIN existant) reçoit les 5 pouvoirs spéciaux + MFA actif
 *  - 8 Integration (CNPS, DGI, Afriland, SGBC, Resend, WhatsApp, Cloudflare R2, Sentry)
 *    dont 2 en erreur (CNPS timeout, SGBC signature invalide)
 *  - 4 ApiKey démo
 *  - 12 WebhookEndpoint démo
 *  - 150 TechnicalLog dont 12 ERROR
 */
import {
  PrismaClient,
  IntegrationCategory,
  IntegrationStatus,
  LogLevel,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed Informaticien (TENANT_ADMIN)...");

  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  if (tenants.length === 0) {
    console.error("Aucun tenant — lancez d'abord pnpm db:seed");
    return;
  }
  const tenant = tenants[0];

  const itAdmin = await prisma.user.findFirst({
    where: { email: "olivier@batimcam.cm" },
    select: { id: true },
  });
  if (!itAdmin) {
    console.error("Olivier MEKA (TENANT_ADMIN) introuvable");
    return;
  }

  // 1) Pouvoirs spéciaux + MFA
  await prisma.user.update({
    where: { id: itAdmin.id },
    data: {
      canManageUsers: true,
      canManageRoles: false, // requires DG approval
      canManageTenantSettings: true,
      canManageIntegrations: true,
      canViewTechnicalLogs: true,
      twoFactorEnabled: true,
    },
  });
  console.log(`  ✓ Pouvoirs spéciaux IT octroyés + MFA actif`);

  // 2) Intégrations
  await prisma.integration.deleteMany({ where: { tenantId: tenant.id } });
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3_600_000);
  const yesterday = new Date(now.getTime() - 86_400_000);

  await prisma.integration.createMany({
    data: [
      {
        tenantId: tenant.id,
        code: "CNPS_DIPE",
        name: "CNPS DIPE",
        category: IntegrationCategory.SOCIAL_SECURITY,
        endpoint: "https://api.cnps.cm/dipe/v2",
        status: IntegrationStatus.ERROR,
        lastSyncAt: oneHourAgo,
        lastSyncSuccess: false,
        lastError: "Connection timeout après 30s — endpoint DIPE indisponible depuis 09/05 08:14",
        retryCount: 4,
        maxRetries: 5,
        frequency: "monthly_day10",
      },
      {
        tenantId: tenant.id,
        code: "DGI_ETAX",
        name: "DGI e-Tax",
        category: IntegrationCategory.TAX_AUTHORITY,
        endpoint: "https://etax.dgi.cm/api/v3",
        status: IntegrationStatus.ACTIVE,
        lastSyncAt: new Date(now.getTime() - 6 * 3_600_000),
        lastSyncSuccess: true,
        frequency: "daily_6am",
      },
      {
        tenantId: tenant.id,
        code: "AFRILAND",
        name: "Afriland First Bank",
        category: IntegrationCategory.BANK,
        endpoint: "https://api.afrilandfirstbank.com/v1/webhooks",
        status: IntegrationStatus.ACTIVE,
        lastSyncAt: new Date(now.getTime() - 45 * 60_000),
        lastSyncSuccess: true,
        frequency: "hourly",
        webhookSecret: "whsec_afril_xxxxxx",
      },
      {
        tenantId: tenant.id,
        code: "SGBC",
        name: "SGBC Webhooks",
        category: IntegrationCategory.BANK,
        endpoint: "https://api.sgbc.cm/v2/notify",
        status: IntegrationStatus.ERROR,
        lastSyncAt: yesterday,
        lastSyncSuccess: false,
        lastError: "Signature HMAC-SHA256 invalide — rotation de clé suspectée. 28 messages en attente.",
        retryCount: 2,
        maxRetries: 5,
        frequency: "realtime",
        webhookSecret: "whsec_sgbc_OLD_INVALID",
      },
      {
        tenantId: tenant.id,
        code: "RESEND",
        name: "Resend",
        category: IntegrationCategory.EMAIL,
        endpoint: "https://api.resend.com",
        status: IntegrationStatus.ACTIVE,
        lastSyncAt: new Date(now.getTime() - 12 * 60_000),
        lastSyncSuccess: true,
        frequency: "realtime",
      },
      {
        tenantId: tenant.id,
        code: "WHATSAPP_BUSINESS",
        name: "WhatsApp Business",
        category: IntegrationCategory.SMS_MESSAGING,
        endpoint: "https://graph.facebook.com/v18.0",
        status: IntegrationStatus.ACTIVE,
        lastSyncAt: new Date(now.getTime() - 8 * 60_000),
        lastSyncSuccess: true,
      },
      {
        tenantId: tenant.id,
        code: "CLOUDFLARE_R2",
        name: "Cloudflare R2",
        category: IntegrationCategory.STORAGE,
        endpoint: "https://terp.r2.cloudflarestorage.com",
        status: IntegrationStatus.ACTIVE,
        lastSyncAt: new Date(now.getTime() - 2 * 60_000),
        lastSyncSuccess: true,
      },
      {
        tenantId: tenant.id,
        code: "SENTRY",
        name: "Sentry",
        category: IntegrationCategory.MONITORING,
        endpoint: "https://sentry.io/api/0",
        status: IntegrationStatus.ACTIVE,
        lastSyncAt: new Date(now.getTime() - 90 * 1000),
        lastSyncSuccess: true,
      },
    ],
  });
  console.log(`  ✓ 8 intégrations (2 en erreur : CNPS + SGBC)`);

  // 3) API Keys
  await prisma.apiKey.deleteMany({ where: { tenantId: tenant.id } });
  const keysSeed = [
    { name: "Application mobile BatimCAM", keyPrefix: "terp_live_app_mobile", scopes: ["read:sites", "write:timesheets", "read:workforce"] },
    { name: "Intégration ERP Sage", keyPrefix: "terp_live_sage", scopes: ["read:accounting", "write:accounting"] },
    { name: "Connecteur Power BI Direction", keyPrefix: "terp_live_powerbi", scopes: ["read:reports", "read:kpis"] },
    { name: "Sandbox tests", keyPrefix: "terp_test_sandbox", scopes: ["read:*"] },
  ];
  for (const k of keysSeed) {
    await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        keyHash: "$2b$12$stub.hash.value.for.demo",
        scopes: k.scopes,
        createdById: itAdmin.id,
        lastUsedAt: new Date(now.getTime() - Math.random() * 7 * 86_400_000),
      },
    });
  }
  console.log(`  ✓ 4 clés API démo`);

  // 4) Webhooks
  await prisma.webhookEndpoint.deleteMany({ where: { tenantId: tenant.id } });
  const webhookEvents = [
    { name: "Notification BCT — événements chantier", url: "https://bct.cm/webhooks/terp", events: ["site.created", "site.completed"] },
    { name: "Sync Sage — écritures comptables", url: "https://sage.batimcam.cm/hooks", events: ["entry.validated", "entry.cancelled"] },
    { name: "Slack Direction — alertes critiques", url: "https://hooks.slack.com/services/T0000/B0000/xxx", events: ["alert.critical"] },
    { name: "DGI — notifications déclarations", url: "https://etax.dgi.cm/webhooks/terp", events: ["tax.declared", "tax.paid"] },
    { name: "Application mobile — push", url: "https://push.batimcam-mobile.cm", events: ["validation.required", "timesheet.rejected"] },
    { name: "CNPS — déclarations mensuelles", url: "https://api.cnps.cm/webhooks", events: ["payroll.cycle.closed"] },
    { name: "Notion CRM commercial", url: "https://api.notion.so/v1/databases/xyz", events: ["tender.won", "tender.lost"] },
    { name: "Google Drive — sync GED", url: "https://www.googleapis.com/drive/v3/files", events: ["document.uploaded"] },
    { name: "Webhook test développement", url: "https://webhook.site/abcdef", events: ["*"] },
    { name: "Backup automatique S3", url: "https://s3.eu-west-3.amazonaws.com/batimcam-backups", events: ["backup.completed"] },
    { name: "ZapEAM — assurance", url: "https://api.zapeam.cm/webhooks", events: ["incident.declared"] },
    { name: "Banque BICEC — relevés", url: "https://api.bicec.cm/webhooks", events: ["bank.movement"] },
  ];
  for (const w of webhookEvents) {
    await prisma.webhookEndpoint.create({
      data: {
        tenantId: tenant.id,
        name: w.name,
        url: w.url,
        secret: `whsec_${Math.random().toString(36).slice(2, 14)}`,
        events: w.events,
        deliveryCount: Math.floor(Math.random() * 1000),
        failureCount: Math.floor(Math.random() * 10),
        lastDeliveryAt: new Date(now.getTime() - Math.random() * 86_400_000),
        lastDeliverySuccess: Math.random() > 0.1,
      },
    });
  }
  console.log(`  ✓ 12 webhooks endpoints`);

  // 5) Technical logs (150 entrées dont 12 ERROR)
  await prisma.technicalLog.deleteMany({ where: { tenantId: tenant.id } });
  const services = ["auth", "cnps-integration", "sgbc-webhook", "resend-mailer", "scheduled-jobs", "session-tracker", "payroll-batch"];
  const errorMessages = [
    "CNPS DIPE timeout après 30s",
    "SGBC webhook signature HMAC invalide",
    "Tentative login bloquée — IP hors-Cameroun (FR)",
    "Échec envoi email Resend — quota mensuel atteint",
    "Job scheduled-payroll-close failed: missing settings",
    "Database connection pool exhausted",
  ];
  const logs: Array<{ tenantId: string; timestamp: Date; level: LogLevel; service: string; message: string; userId?: string }> = [];
  for (let i = 0; i < 150; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * 7 * 86_400_000);
    const isError = i < 12;
    logs.push({
      tenantId: tenant.id,
      timestamp,
      level: isError ? LogLevel.ERROR : i < 30 ? LogLevel.WARN : LogLevel.INFO,
      service: services[Math.floor(Math.random() * services.length)],
      message: isError
        ? errorMessages[Math.floor(Math.random() * errorMessages.length)]
        : `Sync OK · ${Math.floor(Math.random() * 142)} records traités`,
      userId: Math.random() > 0.7 ? itAdmin.id : undefined,
    });
  }
  for (const log of logs) {
    await prisma.technicalLog.create({ data: log });
  }
  console.log(`  ✓ 150 entrées logs (12 ERROR)`);

  console.log("✅ Seed Informaticien terminé");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
