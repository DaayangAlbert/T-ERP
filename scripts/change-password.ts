/**
 * Change le mot de passe d'un utilisateur en production sans toucher au reste.
 *
 * Usage :
 *   npx tsx scripts/change-password.ts <email> <nouveau-mot-de-passe>
 *
 * Exemples :
 *   npx tsx scripts/change-password.ts albert@batimcam.cm 'M0n!N0uvEau-Pass'
 *   npx tsx scripts/change-password.ts superadmin@terp.cm 'Sup3r-Secr3t-2026!'
 *
 * Le hash bcrypt utilise 12 rounds (cohérent avec le seed).
 */
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error("Usage : npx tsx scripts/change-password.ts <email> <nouveau-mot-de-passe>");
    process.exit(1);
  }
  if (newPassword.length < 10) {
    console.error("⚠️  Mot de passe trop court (min 10 caractères).");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
  if (!user) {
    console.error(`❌ Aucun utilisateur trouvé avec email = "${email}"`);
    process.exit(2);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log(`✓ Mot de passe changé pour ${user.firstName} ${user.lastName} (${user.email}, role ${user.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(99);
  })
  .finally(() => prisma.$disconnect());
