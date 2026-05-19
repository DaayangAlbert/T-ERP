/**
 * Liste les utilisateurs d'un tenant (par slug ou nom).
 *
 * Usage :
 *   npx tsx scripts/list-tenant-users.ts <slug-ou-nom>
 *
 * Exemple :
 *   npx tsx scripts/list-tenant-users.ts aa-hatlad
 *   npx tsx scripts/list-tenant-users.ts "AA Hatlad"
 *
 * Pratique pour retrouver les emails des comptes d'un tenant créé
 * via le signup public avant de leur changer le mot de passe avec
 * change-password.ts.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , query] = process.argv;
  if (!query) {
    console.error("Usage : npx tsx scripts/list-tenant-users.ts <slug-ou-nom>");
    process.exit(1);
  }

  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { slug: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      users: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (tenants.length === 0) {
    console.error(`Aucun tenant trouvé pour "${query}"`);
    process.exit(2);
  }

  for (const t of tenants) {
    console.log(`\n━━━ ${t.name} (slug: ${t.slug}, ${t.users.length} users) ━━━`);
    for (const u of t.users) {
      const active = u.isActive ? "✓" : "✗";
      console.log(`  ${active}  ${u.email.padEnd(40)} ${u.role.padEnd(12)} ${u.firstName} ${u.lastName}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(99);
  })
  .finally(() => prisma.$disconnect());
