#!/usr/bin/env node
// Propage `guardSgMutation` aux routes mutation SG.
// - Remplace `guardSg("...")` (avec pouvoir) → `guardSgMutation("...")`
// - Met à jour l'import depuis `@/lib/rbac/sg-guard`
//
// `guardSg()` sans argument reste pour les GET (lecture).

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "src", "app", "api", "sg");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

const files = walk(root);
let touched = 0;

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  if (!/guardSg\("/.test(original)) continue;

  let content = original.replace(/guardSg\(/g, (match, offset, full) => {
    // Conserver guardSg() (sans argument) pour les GET ; remplacer guardSg("...")
    const next = full[offset + match.length];
    return next === '"' ? "guardSgMutation(" : match;
  });

  // Met à jour l'import. Plusieurs cas possibles.
  const hasOnlyMutationCalls = !/guardSg\(\)/.test(content) && !/guardSg\(\s*\)/.test(content);
  const importRe = /import\s+\{([^}]+)\}\s+from\s+["']@\/lib\/rbac\/sg-guard["'];?/;
  const match = content.match(importRe);
  if (match) {
    const names = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    const set = new Set(names);
    set.add("guardSgMutation");
    if (hasOnlyMutationCalls) set.delete("guardSg");
    const newImport = `import { ${Array.from(set).sort().join(", ")} } from "@/lib/rbac/sg-guard";`;
    content = content.replace(importRe, newImport);
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    touched += 1;
    console.log(`✓ ${path.relative(root, file)}`);
  }
}

console.log(`\n${touched} fichier(s) modifié(s).`);
