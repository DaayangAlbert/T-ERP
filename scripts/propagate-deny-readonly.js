#!/usr/bin/env node
// Injecte le check `denyIfReadOnly` dans les routes mutation DAF/RH/DT/CPT/LOG/CDT
// dont la liste ALLOWED contient un rôle READ-only (drill-down vulnérable).
//
// Pour chaque handler POST/PATCH/PUT/DELETE, repère le bloc :
//   if (!ALLOWED.includes(session.role as Role)) {
//     return NextResponse.json({ error: "..." }, { status: 403 });
//   }
// et insère juste après :
//   const denied = denyIfReadOnly(session.role as Role, MODULES.X);
//   if (denied) return denied;

const fs = require("node:fs");
const path = require("node:path");

// Mapping path-segment → module key.
const MODULE_BY_DIR = {
  daf: "DAF",
  rh: "RH",
  dt: "DT",
  comptable: "CPT",
  log: "LOG",
  cdt: "CDT",
};

const TARGETS = [
  "daf/banks/sync/route.ts",
  "daf/finance/scenarios/route.ts",
  "daf/profile/alert-preferences/route.ts",
  "daf/profile/proxies/route.ts",
  "daf/profile/signature-power/route.ts",
  "daf/validations/delegations/route.ts",
  "daf/validations/delegations/[id]/route.ts",
  "rh/profile/alerts/route.ts",
  "rh/profile/signature/route.ts",
  "rh/validations/delegations/route.ts",
  "dt/profile/route.ts",
  "dt/tenders/route.ts",
  "comptable/entries/route.ts",
  "comptable/entries/[id]/validate/route.ts",
  "comptable/fixed-assets/route.ts",
  "comptable/lettering/route.ts",
  "comptable/progress-billings/route.ts",
  "comptable/progress-billings/[id]/route.ts",
  "comptable/supplier-invoices/route.ts",
  "comptable/supplier-invoices/[id]/route.ts",
  "comptable/treasury/cashboxes/route.ts",
  "log/purchase-orders/route.ts",
  "cdt/milestones/[id]/deliverable/route.ts",
  "cdt/quality-controls/route.ts",
  "cdt/visits/route.ts",
];

const API_ROOT = path.resolve(__dirname, "..", "src", "app", "api");

/**
 * Délimite les ranges (start..end) qui correspondent aux corps des handlers
 * POST/PATCH/PUT/DELETE dans le fichier.
 */
function findMutationRanges(lines) {
  const ranges = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^export async function (POST|PATCH|PUT|DELETE)\b/);
    if (!m) continue;
    const verbEnd = m[0].length;
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

function moduleForTarget(target) {
  const top = target.split("/")[0];
  return MODULE_BY_DIR[top];
}

function processFile(targetRel) {
  const moduleKey = moduleForTarget(targetRel);
  if (!moduleKey) return false;
  const file = path.join(API_ROOT, targetRel);
  if (!fs.existsSync(file)) {
    console.log(`! manquant: ${targetRel}`);
    return false;
  }
  const original = fs.readFileSync(file, "utf8");
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  let lines = original.split(/\r?\n/);
  const ranges = findMutationRanges(lines);
  if (ranges.length === 0) return false;

  // Sentinelle : si déjà patché, ne rien faire.
  if (original.includes("denyIfReadOnly(")) return false;

  // Pour chaque range mutation : insérer après le bloc ALLOWED.includes.
  let inserted = 0;
  // On parcourt en sens inverse pour préserver les indices.
  for (let r = ranges.length - 1; r >= 0; r--) {
    const [start, end] = ranges[r];
    let allowedLine = -1;
    for (let i = start; i <= end; i++) {
      if (/if\s*\(!ALLOWED(?:_ROLES)?\.includes\(session\.role/.test(lines[i])) {
        allowedLine = i;
        break;
      }
    }
    if (allowedLine === -1) continue;
    // Trouver la fin du bloc if (...) { ... }
    let braceDepth = 0;
    let blockEnd = -1;
    let sawOpen = false;
    for (let i = allowedLine; i <= end; i++) {
      for (const c of lines[i]) {
        if (c === "{") {
          braceDepth += 1;
          sawOpen = true;
        } else if (c === "}") {
          braceDepth -= 1;
          if (sawOpen && braceDepth === 0) {
            blockEnd = i;
            break;
          }
        }
      }
      if (blockEnd !== -1) break;
    }
    if (blockEnd === -1) continue;
    // Détecter l'indentation utilisée dans le handler (regarder la ligne if).
    const indent = (lines[allowedLine].match(/^(\s*)/) || ["", ""])[1];
    const denyLine1 = `${indent}const denied = denyIfReadOnly(session.role as Role, MODULES.${moduleKey});`;
    const denyLine2 = `${indent}if (denied) return denied;`;
    lines.splice(blockEnd + 1, 0, denyLine1, denyLine2);
    inserted += 1;
  }

  if (inserted === 0) return false;

  let updated = lines.join(eol);

  // Mise à jour des imports.
  // 1) denyIfReadOnly depuis @/lib/rbac/guard
  if (!/from\s+["']@\/lib\/rbac\/guard["']/.test(updated)) {
    // Ajouter une nouvelle ligne d'import après le dernier import existant.
    updated = updated.replace(
      /(import [^\n]+ from "@\/lib\/session";)/,
      `$1${eol}import { denyIfReadOnly } from "@/lib/rbac/guard";`
    );
  } else {
    updated = updated.replace(
      /import\s+\{([^}]+)\}\s+from\s+["']@\/lib\/rbac\/guard["'];?/,
      (m, names) => {
        const set = new Set(names.split(",").map((s) => s.trim()).filter(Boolean));
        set.add("denyIfReadOnly");
        return `import { ${Array.from(set).sort().join(", ")} } from "@/lib/rbac/guard";`;
      }
    );
  }

  // 2) MODULES depuis @/lib/rbac/modules
  if (!/from\s+["']@\/lib\/rbac\/modules["']/.test(updated)) {
    updated = updated.replace(
      /(import \{ denyIfReadOnly[^\n]+ from "@\/lib\/rbac\/guard";)/,
      `$1${eol}import { MODULES } from "@/lib/rbac/modules";`
    );
  } else {
    updated = updated.replace(
      /import\s+\{([^}]+)\}\s+from\s+["']@\/lib\/rbac\/modules["'];?/,
      (m, names) => {
        const set = new Set(names.split(",").map((s) => s.trim()).filter(Boolean));
        set.add("MODULES");
        return `import { ${Array.from(set).sort().join(", ")} } from "@/lib/rbac/modules";`;
      }
    );
  }

  fs.writeFileSync(file, updated);
  console.log(`✓ ${targetRel} (${inserted} handler${inserted > 1 ? "s" : ""})`);
  return true;
}

let total = 0;
for (const t of TARGETS) {
  if (processFile(t)) total += 1;
}
console.log(`\n${total}/${TARGETS.length} fichier(s) patché(s).`);
