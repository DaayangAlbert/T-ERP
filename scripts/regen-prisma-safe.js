// Régénère le client Prisma sur Windows malgré le verrou EPERM du dev server.
// Génère vers un dossier temp puis copie tout SAUF le .dll.node (verrouillé).
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const tmpOut = path.join(root, ".prisma-tmpgen");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const tmpSchema = path.join(root, "prisma", ".schema.tmp.prisma");

const schema = fs.readFileSync(schemaPath, "utf8");
const outForward = tmpOut.replace(/\\/g, "/");
const patched = schema.replace(
  /generator client \{[^}]*\}/,
  `generator client {\n  provider = "prisma-client-js"\n  output = "${outForward}"\n}`
);
fs.writeFileSync(tmpSchema, patched);

try {
  execSync(`npx prisma generate --schema "${tmpSchema}"`, { cwd: root, stdio: "inherit" });

  const targets = [
    path.join(root, "node_modules", ".prisma", "client"),
    path.join(root, "node_modules", ".pnpm", "@prisma+client@5.22.0_prisma@5.22.0", "node_modules", ".prisma", "client"),
  ];
  const files = fs.readdirSync(tmpOut).filter((f) => !f.endsWith(".dll.node"));
  let copied = 0;
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    for (const f of files) {
      try {
        fs.copyFileSync(path.join(tmpOut, f), path.join(target, f));
        copied++;
      } catch (e) {
        console.warn("skip", f, e.code);
      }
    }
  }
  console.log(`Copied ${copied} files (excluding *.dll.node) to client dirs.`);
} finally {
  fs.rmSync(tmpSchema, { force: true });
  fs.rmSync(tmpOut, { recursive: true, force: true });
}
