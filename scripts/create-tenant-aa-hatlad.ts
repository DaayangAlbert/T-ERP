/**
 * Création one-shot du tenant AA HATLAD CONSTRUCTION NIG LTD en production.
 *
 * Usage :
 *   npx tsx scripts/create-tenant-aa-hatlad.ts
 *
 * Idempotent : si le tenant existe déjà (slug aa-hatlad), il est mis à jour.
 *
 * Notes :
 *  - Plan PRO (285 000 FCFA/mois)
 *  - Status ACTIVE (production, pas démo)
 *  - LegalForm "OTHER" car "NIG LTD" n'est pas dans l'enum CEMAC standard
 *  - RCCM stocké dans billingAddress (faute de champ dédié)
 *  - Logo à uploader séparément via /admin/tenants/<id>
 */
import {
  PrismaClient,
  LegalForm,
  Plan,
  TenantStatus,
  PaymentMethod,
  BillingCycle,
  SubscriptionStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const TENANT_DATA = {
  slug: "aa-hatlad",
  name: "AA HATLAD CONSTRUCTION NIG LTD",
  country: "CM",
  legalForm: LegalForm.OTHER, // "LTD" pas dans enum CEMAC standard
  taxId: "M112518203778J", // NIU
  contactPhone: "+237 674 77 72 72 / +237 693 82 42 52 / +237 653 03 79 21",
  contactEmail: "aahatladconsulting@gmail.com",
  contactAddress: "Rue pont palar, Maroua, Cameroun",
  // RCCM stocké dans billingAddress (pas de champ rccm dédié)
  billingAddress: "RCCM : CM-NSI-02-B13-00870 — Rue pont palar, Maroua, Cameroun",
  billingContactEmail: "aahatladconsulting@gmail.com",
  billingContactName: "AA HATLAD CONSTRUCTION",
  paymentMethod: PaymentMethod.BANK_TRANSFER,
  status: TenantStatus.ACTIVE,
  isDemoTenant: false,
  plan: Plan.STANDARD,
  primaryColor: "#1E40AF", // bleu (logo bleu/rose, on prend bleu comme dominant)
  secondaryColor: "#EC4899",
  subdomain: "aa-hatlad.terpgroup.com",
};

async function main() {
  // 1. Trouver le plan PRO
  const planPro = await prisma.subscriptionPlan.findUnique({
    where: { code: "PRO" },
  });
  if (!planPro) {
    throw new Error("Plan PRO introuvable. Lance d'abord seed-admin.ts pour créer les plans.");
  }

  const now = new Date();

  // 2. Upsert du tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_DATA.slug },
    create: {
      ...TENANT_DATA,
      subscriptionPlanId: planPro.id,
      provisionedAt: now,
      maxUsers: planPro.maxUsers,
      maxSites: planPro.maxSites,
      maxStorageGb: planPro.maxStorageGb,
    },
    update: {
      name: TENANT_DATA.name,
      taxId: TENANT_DATA.taxId,
      contactPhone: TENANT_DATA.contactPhone,
      contactEmail: TENANT_DATA.contactEmail,
      contactAddress: TENANT_DATA.contactAddress,
      billingAddress: TENANT_DATA.billingAddress,
      billingContactEmail: TENANT_DATA.billingContactEmail,
      billingContactName: TENANT_DATA.billingContactName,
      legalForm: TENANT_DATA.legalForm,
      status: TENANT_DATA.status,
      subscriptionPlanId: planPro.id,
    },
  });

  // 3. Créer ou mettre à jour la souscription
  await prisma.subscription.upsert({
    where: { id: `sub-${tenant.id}` },
    create: {
      id: `sub-${tenant.id}`,
      tenantId: tenant.id,
      planId: planPro.id,
      startDate: now,
      billingCycle: BillingCycle.MONTHLY,
      status: SubscriptionStatus.ACTIVE,
      autoRenew: true,
      mrrXAF: planPro.monthlyPriceXAF,
    },
    update: {
      planId: planPro.id,
      status: SubscriptionStatus.ACTIVE,
      mrrXAF: planPro.monthlyPriceXAF,
    },
  });

  console.log(`✓ Tenant ${tenant.name} (${tenant.slug}) ${tenant.createdAt.getTime() === tenant.updatedAt.getTime() ? "créé" : "mis à jour"}`);
  console.log(`  ID         : ${tenant.id}`);
  console.log(`  Sous-domaine: ${tenant.subdomain}`);
  console.log(`  URL prévue : https://${tenant.slug}.terpgroup.com`);
  console.log(`  Plan       : ${planPro.code} (${Number(planPro.monthlyPriceXAF).toLocaleString()} FCFA/mois)`);
  console.log(`  NIU        : ${tenant.taxId}`);
  console.log(`  RCCM       : (dans billingAddress) ${tenant.billingAddress}`);
  console.log(`  Logo       : (à uploader via /admin/tenants/${tenant.id})`);
  console.log("");
  console.log("Prochaines étapes :");
  console.log("  1. Créer un premier admin pour ce tenant via /admin/tenants/<id>/first-admin");
  console.log("  2. Uploader le logo via la page d'édition du tenant");
  console.log("  3. Ajouter un A record DNS aa-hatlad.terpgroup.com → 51.91.126.95 (si pas couvert par le wildcard *)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
