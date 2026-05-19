/**
 * Supprime un tenant et toutes ses données associées.
 *
 * Usage :
 *   npx tsx scripts/delete-tenant.ts <slug> [--force]
 *
 * Exemple :
 *   npx tsx scripts/delete-tenant.ts ensah --force
 *
 * Le `--force` saute la confirmation interactive (utile en CI ou pour
 * usage non-interactif). Sans --force, le script demande confirmation
 * en affichant le détail de ce qui sera supprimé.
 *
 * ⚠️ Opération IRRÉVERSIBLE. À utiliser avec précaution.
 */
import { PrismaClient } from "@prisma/client";
import * as readline from "node:readline";

const prisma = new PrismaClient();

async function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const slug = args[0];
  const force = args.includes("--force");

  if (!slug) {
    console.error("Usage : npx tsx scripts/delete-tenant.ts <slug> [--force]");
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          users: true,
          sites: true,
          documents: true,
          conversations: true,
          jobOffers: true,
          payslips: true,
        },
      },
    },
  });

  if (!tenant) {
    console.error(`❌ Tenant "${slug}" introuvable.`);
    process.exit(2);
  }

  console.log(`\nTenant à supprimer :`);
  console.log(`  ID         : ${tenant.id}`);
  console.log(`  Slug       : ${tenant.slug}`);
  console.log(`  Nom        : ${tenant.name}`);
  console.log(`  Status     : ${tenant.status}`);
  console.log(`  Créé le    : ${tenant.createdAt.toISOString()}`);
  console.log(`\nDonnées associées qui seront DÉFINITIVEMENT supprimées :`);
  console.log(`  - ${tenant._count.users} users`);
  console.log(`  - ${tenant._count.sites} sites/chantiers`);
  console.log(`  - ${tenant._count.documents} documents`);
  console.log(`  - ${tenant._count.conversations} conversations`);
  console.log(`  - ${tenant._count.jobOffers} job offers`);
  console.log(`  - ${tenant._count.payslips} bulletins de paie`);
  console.log(`  (+ subscriptions, audit logs, validations, etc. en cascade)\n`);

  if (!force) {
    const ok = await confirm('Confirmer la suppression ? Tape "yes" pour confirmer : ');
    if (!ok) {
      console.log("Annulé.");
      process.exit(0);
    }
  }

  // Suppression en cascade. Prisma supprimera tout ce qui a onDelete: Cascade.
  // Pour les relations sans cascade, on doit supprimer manuellement avant.
  // On tente d'abord direct ; si erreur FK, on fera du manuel.
  try {
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log(`\n✓ Tenant "${slug}" supprimé avec succès.`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ Erreur lors de la suppression directe :`);
    console.error(msg);
    console.error(`\nLes contraintes FK suivantes ne sont probablement pas en CASCADE.`);
    console.error(`Solution : utiliser prisma db push --force-reset (DEV LOCAL UNIQUEMENT)`);
    console.error(`Ou créer une migration qui ajoute onDelete: Cascade aux relations bloquantes.`);
    process.exit(3);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(99);
  })
  .finally(() => prisma.$disconnect());
