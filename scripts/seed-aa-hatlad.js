require("./_guard-prod");
// Provisionne le tenant AA HATLAD CONSTRUCTION NIG LTD + son TENANT_ADMIN.
// Idempotent : skippe si tenant ou user déjà présent.
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─────────── Données entreprise ───────────
const TENANT = {
  slug: "aa-hatlad",
  name: "AA HATLAD CONSTRUCTION NIG LTD",
  taxId: "M112518203778J", // NIU
  legalForm: "SARL",
  country: "CM",
  logoUrl: "/uploads/tenant/aa-hatlad/logo.svg",
  primaryColor: "#2563eb", // bleu marine du logo
  secondaryColor: "#ef4444", // rouge "AA" du logo
  contactAddress: "Rue 1771, Derrière Usine Bastos, Yaoundé",
  contactPhone: "+237 674 77 72 72 / +237 693 82 42 52 / +237 653 03 79 21",
  contactEmail: "aahatladconsulting@gmail.com",
  status: "ACTIVE",
  plan: "STARTER",
  isDemoTenant: false,
};

// RCCM stocké dans TenantSettings (champ ad hoc — pas de champ rccm direct)
const RCCM = "CM-NSI-02-B13-00870";

// ─────────── Admin ───────────
// Login : par téléphone (le système accepte phone ou email). Un email
// technique est généré pour respecter la contrainte UNIQUE NOT NULL
// sur User.email — mais l'utilisateur se connectera par téléphone.
const ADMIN = {
  email: "admin@aahatlad.cm",
  phone: "+237693824252", // login = 693824252 (avec ou sans +237, normalisation côté serveur)
  password: "TGVtaiga@96",
  firstName: "Administrateur",
  lastName: "AA HATLAD",
  role: "TENANT_ADMIN",
};

async function main() {
  console.log("═══ Provisionnement AA HATLAD CONSTRUCTION NIG LTD ═══\n");

  // 1) Tenant
  let tenant = await prisma.tenant.findUnique({ where: { slug: TENANT.slug } });
  if (tenant) {
    console.log(`  • Tenant déjà existant (${tenant.id}), mise à jour des infos`);
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: TENANT.name,
        taxId: TENANT.taxId,
        legalForm: TENANT.legalForm,
        country: TENANT.country,
        logoUrl: TENANT.logoUrl,
        primaryColor: TENANT.primaryColor,
        secondaryColor: TENANT.secondaryColor,
        contactAddress: TENANT.contactAddress,
        contactPhone: TENANT.contactPhone,
        contactEmail: TENANT.contactEmail,
        status: TENANT.status,
      },
    });
  } else {
    tenant = await prisma.tenant.create({
      data: {
        ...TENANT,
        provisionedAt: new Date(),
      },
    });
    console.log(`  ✓ Tenant créé : ${tenant.name} (slug=${tenant.slug}, id=${tenant.id})`);
  }

  // 2) TenantSettings — RCCM + identité stockés dans le JSON `identity`
  // (pas de champ rccm direct sur le modèle).
  const identity = {
    legalName: TENANT.name,
    niu: TENANT.taxId,
    rccm: RCCM,
    address: TENANT.contactAddress,
    phones: TENANT.contactPhone.split(" / "),
    email: TENANT.contactEmail,
  };
  const existingSettings = await prisma.tenantSettings.findUnique({
    where: { tenantId: tenant.id },
  });
  if (!existingSettings) {
    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        identity,
        modules: {},
        payrollRates: {},
        workflows: {},
        notifications: {},
        integrations: {},
      },
    });
    console.log(`  ✓ TenantSettings créés (RCCM = ${RCCM} dans identity)`);
  } else {
    await prisma.tenantSettings.update({
      where: { tenantId: tenant.id },
      data: { identity },
    });
    console.log(`  ✓ TenantSettings.identity mis à jour`);
  }

  // 3) Admin user
  const existingAdmin = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "TENANT_ADMIN" },
  });
  if (existingAdmin) {
    console.log(`  • Admin déjà existant (${existingAdmin.email}) — mise à jour mot de passe + phone`);
    const passwordHash = await bcrypt.hash(ADMIN.password, 10);
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        phone: ADMIN.phone,
        firstName: ADMIN.firstName,
        lastName: ADMIN.lastName,
        status: "ACTIVE",
      },
    });
  } else {
    const passwordHash = await bcrypt.hash(ADMIN.password, 10);
    const admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: ADMIN.email,
        passwordHash,
        firstName: ADMIN.firstName,
        lastName: ADMIN.lastName,
        phone: ADMIN.phone,
        role: ADMIN.role,
        status: "ACTIVE",
      },
    });
    console.log(`  ✓ Admin créé : ${admin.email} (phone=${admin.phone}, role=${admin.role})`);
  }

  console.log("\n═══ Récap ═══");
  console.log(`  Nom        : ${TENANT.name}`);
  console.log(`  Slug       : ${TENANT.slug}`);
  console.log(`  RCCM       : ${RCCM}`);
  console.log(`  NIU        : ${TENANT.taxId}`);
  console.log(`  Adresse    : ${TENANT.contactAddress}`);
  console.log(`  Email      : ${TENANT.contactEmail}`);
  console.log(`  Téléphones : ${TENANT.contactPhone}`);
  console.log(`  Logo       : ${TENANT.logoUrl} (placeholder SVG — à remplacer par le vrai PNG/JPG via /informatique/settings)`);
  console.log("\n  ── Connexion admin ──");
  console.log(`  URL        : http://localhost:5000/${TENANT.slug}/dashboard`);
  console.log(`  Login      : ${ADMIN.phone} (ou ${ADMIN.email})`);
  console.log(`  Mot de passe : ${ADMIN.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
