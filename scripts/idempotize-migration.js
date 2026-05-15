#!/usr/bin/env node
/**
 * Rend une migration SQL existante idempotente (IF NOT EXISTS partout +
 * DO blocks pour types et FK). Permet de faire passer une migration
 * historique sur une DB où ses tables/colonnes existent déjà (via db push
 * ou via une autre migration "catch-up").
 *
 * Usage : node scripts/idempotize-migration.js <path/to/migration.sql>
 */
const fs = require("fs");

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error("Usage: node scripts/idempotize-migration.js <migration.sql>");
  process.exit(1);
}

const src = fs.readFileSync(file, "utf8");
const lines = src.split(/\r?\n/);
const out = [];

let i = 0;
while (i < lines.length) {
  const l = lines[i];

  // CREATE TYPE → DO block (autorise plusieurs espaces avant AS ENUM)
  const t = l.match(/^CREATE TYPE "([^"]+)"\s+AS ENUM/);
  if (t) {
    let end = i;
    while (end < lines.length && !lines[end].endsWith(");")) end++;
    const sql = lines.slice(i, end + 1).join("\n");
    out.push(
      `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${t[1]}') THEN
    ${sql.replace(/\n/g, "\n    ")}
  END IF;
END $$;`
    );
    i = end + 1;
    continue;
  }

  // CREATE TABLE → IF NOT EXISTS
  if (l.match(/^CREATE TABLE "/)) {
    let end = i;
    while (end < lines.length && !lines[end].match(/^\);$/)) end++;
    out.push(lines.slice(i, end + 1).join("\n").replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS "));
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

  // ALTER TABLE ... ADD COLUMN [+ NOT NULL + DEFAULT + ARRAY etc.]
  // PostgreSQL supporte ADD COLUMN IF NOT EXISTS depuis 9.6
  // ALTER TABLE peut être multi-ligne avec plusieurs ADD COLUMN séparés par virgule.
  // ⚠️ Ne PAS attraper les ADD CONSTRAINT (gérés plus bas en DO block) :
  //    on vérifie que la ligne suivante commence bien par ADD COLUMN.
  if (
    l.match(/^ALTER TABLE "[^"]+"$/) &&
    i + 1 < lines.length &&
    lines[i + 1].match(/^\s*ADD COLUMN /)
  ) {
    // Cas multi-lignes : "ALTER TABLE x\n  ADD COLUMN y,\n  ADD COLUMN z;"
    const tableName = l.match(/^ALTER TABLE "([^"]+)"$/)[1];
    let end = i + 1;
    while (end < lines.length && !lines[end].endsWith(";")) end++;
    const cols = lines.slice(i + 1, end + 1).join("\n");
    // Split sur les virgules de fin de ligne pour avoir un ADD COLUMN par stmt
    // Chaque ligne devient une ALTER TABLE séparée pour pouvoir mettre IF NOT EXISTS
    const colDefs = cols
      .replace(/;$/, "")
      .split(/,\s*\n/)
      .map((c) => c.trim().replace(/,$/, ""))
      .filter(Boolean);
    for (const def of colDefs) {
      const adj = def.replace(/^ADD COLUMN /, "ADD COLUMN IF NOT EXISTS ");
      out.push(`ALTER TABLE "${tableName}" ${adj};`);
    }
    i = end + 1;
    continue;
  }

  // ALTER TABLE single-line
  if (l.match(/^ALTER TABLE "[^"]+" ADD COLUMN /)) {
    out.push(l.replace(/ADD COLUMN /, "ADD COLUMN IF NOT EXISTS "));
    i++;
    continue;
  }

  // ALTER TABLE ADD CONSTRAINT → DO block
  const c = l.match(/^ALTER TABLE "[^"]+"\s*$/);
  if (c) {
    // Peut être un multi-ligne avec ADD CONSTRAINT à la ligne suivante
    if (i + 1 < lines.length && lines[i + 1].match(/^\s*ADD CONSTRAINT "([^"]+)"/)) {
      const constraintName = lines[i + 1].match(/ADD CONSTRAINT "([^"]+)"/)[1];
      let end = i + 1;
      while (end < lines.length && !lines[end].endsWith(";")) end++;
      const stmt = lines.slice(i, end + 1).join("\n").replace(/;$/, "");
      out.push(
        `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}') THEN
    ${stmt.replace(/\n/g, "\n    ")};
  END IF;
END $$;`
      );
      i = end + 1;
      continue;
    }
  }

  // ALTER TABLE ... ADD CONSTRAINT inline
  const cInline = l.match(/^ALTER TABLE "[^"]+" ADD CONSTRAINT "([^"]+)"/);
  if (cInline) {
    let end = i;
    while (end < lines.length && !lines[end].endsWith(";")) end++;
    const stmt = lines.slice(i, end + 1).join("\n").replace(/;$/, "");
    out.push(
      `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${cInline[1]}') THEN
    ${stmt.replace(/\n/g, "\n    ")};
  END IF;
END $$;`
    );
    i = end + 1;
    continue;
  }

  out.push(l);
  i++;
}

fs.writeFileSync(file, out.join("\n"));
console.log(`✓ ${file} rendu idempotent (${lines.length} → ${out.length} lignes)`);
