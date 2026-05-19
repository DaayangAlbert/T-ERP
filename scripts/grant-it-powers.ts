/**
 * Active tous les "pouvoirs IT" sur un user existant (canManageUsers,
 * canManageRoles, canManageTenantSettings, canManageIntegrations,
 * canViewTechnicalLogs).
 *
 * Le guard `guardIt(requiredFlag)` refuse les mutations sans ces flags,
 * même si le user a le rôle TENANT_ADMIN. Ce script est le rattrapage
 * pour les comptes créés avant le fix de la route /first-admin.
 *
 * Usage :
 *   npx tsx scripts/grant-it-powers.ts <email>
 *
 * Exemple :
 *   npx tsx scripts/grant-it-powers.ts daayangalbert@gmail.com
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage : npx tsx scripts/grant-it-powers.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      tenant: { select: { slug: true, name: true } },
    },
  });
  if (!user) {
    console.error(`❌ Aucun user trouvé avec email = "${email}"`);
    process.exit(2);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      canManageUsers: true,
      canManageRoles: true,
      canManageTenantSettings: true,
      canManageIntegrations: true,
      canViewTechnicalLogs: true,
    },
    select: {
      canManageUsers: true,
      canManageRoles: true,
      canManageTenantSettings: true,
      canManageIntegrations: true,
      canViewTechnicalLogs: true,
    },
  });

  console.log(`✓ Pouvoirs IT accordés à ${user.firstName} ${user.lastName} (${user.email})`);
  console.log(`  Tenant : ${user.tenant?.name ?? "—"} (${user.tenant?.slug ?? "—"})`);
  console.log(`  Role   : ${user.role}`);
  console.log(`  Flags  :`);
  console.log(`    canManageUsers          : ${updated.canManageUsers}`);
  console.log(`    canManageRoles          : ${updated.canManageRoles}`);
  console.log(`    canManageTenantSettings : ${updated.canManageTenantSettings}`);
  console.log(`    canManageIntegrations   : ${updated.canManageIntegrations}`);
  console.log(`    canViewTechnicalLogs    : ${updated.canViewTechnicalLogs}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(99);
  })
  .finally(() => prisma.$disconnect());
