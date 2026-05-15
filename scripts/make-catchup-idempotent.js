#!/usr/bin/env node
/**
 * Transforme le diff brut Prisma en migration 100 % idempotente :
 *   - CREATE TYPE → DO $$ IF NOT EXISTS pg_type ... END $$
 *   - CREATE TABLE → CREATE TABLE IF NOT EXISTS
 *   - CREATE INDEX → CREATE INDEX IF NOT EXISTS
 *   - CREATE UNIQUE INDEX → idem
 *   - ALTER TABLE ADD COLUMN → ADD COLUMN IF NOT EXISTS
 *   - ALTER TABLE ADD CONSTRAINT → DO $$ IF NOT EXISTS pg_constraint ... END $$
 *   - DROP / ALTER COLUMN → on les LAISSE TOMBER (le but est de combler des
 *     manques, pas d'écraser des colonnes existantes en prod / dev)
 */
const fs = require("fs");

const src = fs.readFileSync("scripts/catchup-diff.sql", "utf8");
const lines = src.split(/\r?\n/);

const out = [];
out.push(`-- Migration catch-up : 18 tables + colonnes/FK poussées via prisma db push
-- sans migration formelle. Répare l'historique de migrations pour qu'un fresh
-- 'prisma migrate dev' fonctionne sur DB vierge.
--
-- Tout est idempotent (IF NOT EXISTS / DO blocks pour types et FK).
-- Safe sur fresh dev et sur dev/prod déjà patché via db push.
`);

let i = 0;
let droppedDangerous = 0;
while (i < lines.length) {
  const l = lines[i];

  // CREATE TYPE
  let m = l.match(/^CREATE TYPE "([^"]+)" AS ENUM/);
  if (m) {
    let end = i;
    while (end < lines.length && !lines[end].endsWith(");")) end++;
    const sql = lines.slice(i, end + 1).join("\n");
    out.push(
      `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${m[1]}') THEN
    ${sql.replace(/\n/g, "\n    ")}
  END IF;
END $$;`
    );
    i = end + 1;
    continue;
  }

  // CREATE TABLE
  if (l.match(/^CREATE TABLE "/)) {
    let end = i;
    while (end < lines.length && !lines[end].match(/^\);$/)) end++;
    const block = lines.slice(i, end + 1).join("\n");
    out.push(block.replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS "));
    i = end + 1;
    continue;
  }

  // CREATE UNIQUE INDEX
  if (l.match(/^CREATE UNIQUE INDEX "/)) {
    out.push(l.replace(/^CREATE UNIQUE INDEX /, "CREATE UNIQUE INDEX IF NOT EXISTS "));
    i++;
    continue;
  }

  // CREATE INDEX
  if (l.match(/^CREATE INDEX "/)) {
    out.push(l.replace(/^CREATE INDEX /, "CREATE INDEX IF NOT EXISTS "));
    i++;
    continue;
  }

  // ALTER TABLE ADD COLUMN (peut contenir plusieurs ADD COLUMN sur plusieurs lignes)
  if (l.match(/^ALTER TABLE "[^"]+" ADD COLUMN /)) {
    // L'instruction est sur une ligne (Prisma émet généralement un ADD COLUMN par ligne)
    out.push(l.replace(/ADD COLUMN /, "ADD COLUMN IF NOT EXISTS "));
    i++;
    continue;
  }

  // ALTER TABLE ADD CONSTRAINT
  const c = l.match(/^ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)"/);
  if (c) {
    // L'ALTER peut être sur plusieurs lignes
    let end = i;
    while (end < lines.length && !lines[end].endsWith(";")) end++;
    const stmt = lines.slice(i, end + 1).join("\n");
    out.push(
      `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${c[2]}') THEN
    ${stmt.replace(/;$/, "").replace(/\n/g, "\n    ")};
  END IF;
END $$;`
    );
    i = end + 1;
    continue;
  }

  // Lignes dangereuses : DROP, ALTER COLUMN (peut écraser des données)
  if (
    l.match(/^ALTER TABLE.*ALTER COLUMN/) ||
    l.match(/^ALTER TABLE.*DROP /) ||
    l.match(/^DROP /)
  ) {
    out.push(`-- SKIPPED (dangerous): ${l}`);
    droppedDangerous++;
    i++;
    continue;
  }

  // Commentaires, lignes vides, autre → pass-through
  out.push(l);
  i++;
}

const finalSql = out.join("\n");
fs.mkdirSync("prisma/migrations/20260513150000_catchup_missing_tables", { recursive: true });
fs.writeFileSync(
  "prisma/migrations/20260513150000_catchup_missing_tables/migration.sql",
  finalSql
);
console.log(`✓ Migration ${out.length} lignes, ${droppedDangerous} statements dangereux skippés`);
