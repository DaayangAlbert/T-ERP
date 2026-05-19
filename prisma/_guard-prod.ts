// Garde-fou commun aux seeds Prisma.
// Bloque l'exécution si NODE_ENV=production, sauf si ALLOW_SEED_PROD=1.
// Importer en tout début de seed : import "./_guard-prod";
if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED_PROD !== "1") {
  const url = process.env.DATABASE_URL || "";
  const target = url.replace(/^(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@.*)$/, "$1***$2");
  console.error(
    `\n[seed] ⛔ Refusé : NODE_ENV=production (DATABASE_URL=${target || "non défini"}).\n` +
      `       Pour forcer : ALLOW_SEED_PROD=1 pnpm db:seed\n`,
  );
  process.exit(1);
}
