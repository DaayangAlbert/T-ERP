/**
 * Copie les assets statiques dans .next/standalone après un build Next.js
 * `output: "standalone"`.
 *
 * Pourquoi : le build standalone produit un serveur autonome dans
 * .next/standalone/server.js MAIS n'y copie PAS `public/` ni `.next/static/`.
 * Sans ces fichiers, le serveur sert le HTML (avec les nouveaux hash de chunks)
 * mais renvoie 404 sur /_next/static/* → page cassée ("Refused to apply style /
 * execute script", MIME text/html).
 *
 * Ce script s'exécute en `postbuild` (donc après chaque `pnpm build`) pour que
 * le déploiement ne casse jamais, même sans passer par deploy/deploy.sh.
 * Cross-platform (fs.cpSync), idempotent. No-op si .next/standalone absent
 * (build non-standalone).
 */
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

if (!fs.existsSync(standaloneDir)) {
  // Pas un build standalone — rien à faire.
  process.exit(0);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`[postbuild] copié ${path.relative(root, src)} → ${path.relative(root, dest)}`);
}

copyDir(path.join(root, "public"), path.join(standaloneDir, "public"));
copyDir(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));

console.log("[postbuild] assets standalone synchronisés.");
