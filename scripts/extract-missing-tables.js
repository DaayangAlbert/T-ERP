#!/usr/bin/env node
/**
 * Extrait du DDL complet (prisma migrate diff --from-empty) les sections
 * nécessaires à la création des 18 tables qui n'ont jamais été migrées :
 *   - CREATE TYPE pour les enums référencés
 *   - CREATE TABLE
 *   - CREATE INDEX
 *   - ALTER TABLE ADD CONSTRAINT (FK)
 *
 * Génère ensuite un fichier migration.sql idempotent.
 */
const fs = require("fs");

const MISSING = [
  "time_reports",
  "it_integrations",
  "it_api_keys",
  "it_webhooks",
  "it_technical_logs",
  "job_matches",
  "candidate_experiences",
  "candidate_formations",
  "demo_requests",
  "platform_admins",
  "subscription_plans",
  "subscriptions",
  "saas_invoices",
  "saas_metrics",
  "platform_incidents",
  "global_audit_logs",
  "tenant_feature_flags",
  "global_integrations",
];

const src = fs.readFileSync("scripts/full-schema.sql", "utf8");
const lines = src.split("\n");

// 1) Trouve toutes les sections CREATE TABLE pour les tables manquantes
//    (du CREATE TABLE jusqu'à la prochaine ligne vide ou prochain statement)
function extractCreateTable(table) {
  const idx = lines.findIndex((l) => l.startsWith(`CREATE TABLE "${table}"`));
  if (idx === -1) return null;
  let end = idx;
  while (end < lines.length && !lines[end].match(/^\);$/)) end++;
  return lines.slice(idx, end + 1).join("\n");
}

// 2) Trouve les CREATE INDEX qui matchent les tables manquantes
function extractIndexes(table) {
  return lines
    .filter((l) => l.startsWith("CREATE") && l.includes("INDEX") && l.includes(`"${table}"`))
    .join("\n");
}

// 3) Trouve les CREATE TYPE pour les enums utilisés dans les CREATE TABLE
function extractEnumsUsed(tableBlocks) {
  // Liste de tous les CREATE TYPE du DDL complet (avec leur nom)
  const allEnums = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^CREATE TYPE "([^"]+)" AS ENUM/);
    if (m) {
      let end = i;
      while (end < lines.length && !lines[end].endsWith(");")) end++;
      allEnums.push({ name: m[1], sql: lines.slice(i, end + 1).join("\n") });
    }
  }
  // Pour chaque CREATE TABLE manquant, on regarde quels enums sont référencés
  // via "EnumName" NOT NULL ou DEFAULT
  const blob = tableBlocks.join("\n");
  const used = allEnums.filter((e) => {
    // Match "EnumName" suivi de , ou ) ou espace puis NOT NULL/DEFAULT
    const re = new RegExp(`"${e.name}"\\s*[,\\)]|"${e.name}"\\s+(NOT NULL|DEFAULT)`);
    return re.test(blob);
  });
  return used;
}

// 4) Trouve les ALTER TABLE ADD CONSTRAINT pour les tables manquantes
//    (le DDL Prisma met les FK groupées en fin de fichier ou inline)
function extractFKs(table) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].startsWith(`ALTER TABLE "${table}" ADD CONSTRAINT`) ||
      (lines[i].startsWith(`-- AddForeignKey`) &&
        i + 1 < lines.length &&
        lines[i + 1].includes(`"${table}"`))
    ) {
      let start = lines[i].startsWith("-- AddForeignKey") ? i + 1 : i;
      let end = start;
      while (end < lines.length && !lines[end].endsWith(";")) end++;
      out.push(lines.slice(start, end + 1).join("\n"));
    }
  }
  return out.join("\n\n");
}

const tableBlocks = MISSING.map((t) => extractCreateTable(t)).filter(Boolean);
const indexBlocks = MISSING.map((t) => extractIndexes(t)).filter(Boolean);
const fkBlocks = MISSING.map((t) => extractFKs(t)).filter(Boolean);
const enums = extractEnumsUsed(tableBlocks);

// Wrap CREATE TYPE in DO blocks (idempotent)
const enumsIdempotent = enums
  .map(
    (e) => `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${e.name.toLowerCase()}') THEN
    ${e.sql.replace(/\n/g, "\n    ")}
  END IF;
END $$;`
  )
  .join("\n\n");

// CREATE TABLE → CREATE TABLE IF NOT EXISTS
const tablesIdempotent = tableBlocks
  .map((t) => t.replace(/^CREATE TABLE "/, 'CREATE TABLE IF NOT EXISTS "'))
  .join("\n\n");

// CREATE INDEX → CREATE INDEX IF NOT EXISTS
const indexesIdempotent = indexBlocks
  .map((b) =>
    b
      .split("\n")
      .map((l) =>
        l
          .replace(/^CREATE INDEX "/, 'CREATE INDEX IF NOT EXISTS "')
          .replace(/^CREATE UNIQUE INDEX "/, 'CREATE UNIQUE INDEX IF NOT EXISTS "')
      )
      .join("\n")
  )
  .join("\n");

// FK → wrap in DO block (PG ne supporte pas IF NOT EXISTS sur ADD CONSTRAINT)
const fkSections = fkBlocks
  .filter(Boolean)
  .map((block) =>
    block
      .split(/\n\n+/)
      .map((stmt) => {
        const m = stmt.match(/CONSTRAINT "([^"]+)"/);
        if (!m) return stmt;
        const constraintName = m[1];
        return `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}') THEN
    ${stmt.replace(/;$/, "").replace(/\n/g, "\n    ")};
  END IF;
END $$;`;
      })
      .join("\n\n")
  )
  .join("\n\n");

const out = `-- Catch-up migration : 18 tables qui n'ont jamais été migrées formellement.
-- Origine : sessions précédentes ont ajouté ces modèles au schema.prisma et
-- les ont poussés via \`prisma db push\` sans générer de migration.
-- Conséquence : le shadow DB Prisma plantait avec P3006 / P1014 sur les
-- migrations OUV qui touchaient time_reports (ALTER d'une table inexistante).
--
-- Tables couvertes :
--   ${MISSING.join(", ")}
--
-- 100% idempotent (IF NOT EXISTS partout + DO blocks pour les types et FK).
-- Safe sur fresh dev (crée tout) et sur dev existant déjà patché via db push.

-- ============================================================
-- 1) Types enum
-- ============================================================
${enumsIdempotent}

-- ============================================================
-- 2) Tables
-- ============================================================
${tablesIdempotent}

-- ============================================================
-- 3) Indexes
-- ============================================================
${indexesIdempotent}

-- ============================================================
-- 4) Foreign keys
-- ============================================================
${fkSections}
`;

fs.mkdirSync("prisma/migrations/20260513150000_catchup_missing_tables", { recursive: true });
fs.writeFileSync(
  "prisma/migrations/20260513150000_catchup_missing_tables/migration.sql",
  out
);
console.log(`✓ Migration écrite : ${out.split("\n").length} lignes`);
console.log(`  - ${enums.length} enums`);
console.log(`  - ${tableBlocks.length} tables`);
console.log(`  - ${fkBlocks.filter(Boolean).length} blocs FK`);
