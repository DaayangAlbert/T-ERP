#!/usr/bin/env node
// Propage la variante `*Mutation` aux routes mutation des espaces guards par module.
//
// Algorithme :
//   - Scanne chaque route.ts sous src/app/api/{cc,dtrav,mag,ged}.
//   - Localise chaque déclaration `export async function (POST|PATCH|PUT|DELETE)`.
//   - Repère, à l'intérieur de chaque handler de mutation, l'appel `guardXxx(...)`.
//   - Remplace par `guardXxxMutation(...)` et met à jour l'import depuis le guard.
//   - Les handlers GET (lecture) ne sont jamais modifiés.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "src", "app", "api");

const GUARDS = [
  { module: "cc", base: "guardCcSite", mutation: "guardCcSiteMutation", from: "@/lib/rbac/cc-guard" },
  { module: "dtrav", base: "guardDtravSite", mutation: "guardDtravSiteMutation", from: "@/lib/rbac/dtrav-guard" },
  { module: "mag", base: "guardMagWarehouse", mutation: "guardMagWarehouseMutation", from: "@/lib/rbac/mag-guard" },
  { module: "ged", base: "guardGed", mutation: "guardGedMutation", from: "@/lib/rbac/ged-guard" },
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

/**
 * Délimite les ranges (start..end) qui correspondent aux corps des handlers
 * POST/PATCH/PUT/DELETE dans le fichier. Le scan ignore les accolades à
 * l'intérieur de la signature (destructuring/typage des paramètres).
 */
function findMutationRanges(lines) {
  const ranges = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^export async function (POST|PATCH|PUT|DELETE)\b/);
    if (!m) continue;
    // 1) Trouver la fin de la signature : `)` matchant la `(` qui suit le verbe.
    const verbEnd = m[0].length; // position juste après POST/PATCH/PUT/DELETE
    let parenDepth = 0;
    let started = false;
    let sigEndLine = -1;
    let sigEndCol = -1;
    outer: for (let j = i; j < lines.length; j++) {
      const line = lines[j];
      const colStart = j === i ? verbEnd : 0;
      for (let k = colStart; k < line.length; k++) {
        const c = line[k];
        if (c === "(") {
          parenDepth += 1;
          started = true;
        } else if (c === ")") {
          parenDepth -= 1;
          if (started && parenDepth === 0) {
            sigEndLine = j;
            sigEndCol = k + 1;
            break outer;
          }
        }
      }
    }
    if (sigEndLine === -1) continue;
    // 2) Localiser le `{` d'ouverture du corps, juste après la signature.
    let openLine = sigEndLine;
    let openCol = -1;
    for (let j = sigEndLine; j < lines.length; j++) {
      const line = lines[j];
      const colStart = j === sigEndLine ? sigEndCol : 0;
      const idx = line.indexOf("{", colStart);
      if (idx !== -1) {
        openLine = j;
        openCol = idx;
        break;
      }
    }
    if (openCol === -1) continue;
    // 3) Trouver le `}` matchant.
    let depth = 0;
    let endLine = openLine;
    let done = false;
    for (let j = openLine; j < lines.length && !done; j++) {
      const line = lines[j];
      const colStart = j === openLine ? openCol : 0;
      for (let k = colStart; k < line.length; k++) {
        const c = line[k];
        if (c === "{") depth += 1;
        else if (c === "}") {
          depth -= 1;
          if (depth === 0) {
            endLine = j;
            done = true;
            break;
          }
        }
      }
    }
    ranges.push([i, endLine]);
    i = endLine;
  }
  return ranges;
}

function processFile(file, guard) {
  const original = fs.readFileSync(file, "utf8");
  if (!original.includes(guard.base + "(")) return false;

  const lines = original.split(/\r?\n/);
  const ranges = findMutationRanges(lines);
  if (ranges.length === 0) return false;

  let changed = false;
  const baseCallRe = new RegExp(`\\b${guard.base}\\(`, "g");
  for (const [start, end] of ranges) {
    for (let i = start; i <= end; i++) {
      if (baseCallRe.test(lines[i])) {
        const newLine = lines[i].replace(new RegExp(`\\b${guard.base}\\(`, "g"), guard.mutation + "(");
        if (newLine !== lines[i]) {
          lines[i] = newLine;
          changed = true;
        }
      }
      baseCallRe.lastIndex = 0;
    }
  }

  if (!changed) return false;

  // Met à jour l'import.
  const joined = lines.join("\n");
  const stillUsesBase = new RegExp(`\\b${guard.base}\\(`).test(joined);
  let updated = joined;
  const importRe = new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+["']${guard.from.replace(/[/-]/g, "\\$&")}["'];?`);
  const match = updated.match(importRe);
  if (match) {
    const names = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    const set = new Set(names);
    set.add(guard.mutation);
    if (!stillUsesBase) set.delete(guard.base);
    const newImport = `import { ${Array.from(set).sort().join(", ")} } from "${guard.from}";`;
    updated = updated.replace(importRe, newImport);
  }

  // Préserver CRLF / LF d'origine.
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  fs.writeFileSync(file, updated.split(/\r?\n/).join(eol));
  return true;
}

let total = 0;
for (const guard of GUARDS) {
  const dir = path.join(ROOT, guard.module);
  const files = walk(dir);
  let count = 0;
  for (const file of files) {
    if (processFile(file, guard)) {
      count += 1;
      total += 1;
      console.log(`✓ [${guard.module}] ${path.relative(ROOT, file)}`);
    }
  }
  if (count === 0) console.log(`  [${guard.module}] aucun fichier modifié`);
}
console.log(`\n${total} fichier(s) modifié(s) au total.`);
