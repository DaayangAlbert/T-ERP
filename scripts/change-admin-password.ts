/**
 * Change le mot de passe d'un PlatformAdmin (super-admin SaaS).
 *
 * Distinct de change-password.ts qui cible les User de tenants.
 *
 * Usage :
 *   npx tsx scripts/change-admin-password.ts <email> <nouveau-mot-de-passe>
 *
 * Exemple :
 *   npx tsx scripts/change-admin-password.ts superadmin@terp.cm 'NouveauPassFort!'
 */
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error("Usage : npx tsx scripts/change-admin-password.ts <email> <nouveau-mot-de-passe>");
    process.exit(1);
  }
  if (newPassword.length < 10) {
    console.error("⚠️  Mot de passe trop court (min 10 caractères).");
    process.exit(1);
  }

  const admin = await prisma.platformAdmin.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
  });
  if (!admin) {
    console.error(`❌ Aucun PlatformAdmin trouvé avec email = "${email}"`);
    process.exit(2);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.platformAdmin.update({
    where: { id: admin.id },
    data: { passwordHash },
  });

  console.log(`✓ Mot de passe changé pour ${admin.firstName} ${admin.lastName} (${admin.email}, role ${admin.role}, status ${admin.status})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(99);
  })
  .finally(() => prisma.$disconnect());
