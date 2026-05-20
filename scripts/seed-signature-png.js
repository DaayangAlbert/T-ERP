/**
 * Génère un PNG de signature de DÉMO (tracé manuscrit) et le pose sur le
 * compte d'un utilisateur (UserSignature.signatureUrl).
 *
 * Usage : node scripts/seed-signature-png.js <email>
 * Exemple : node scripts/seed-signature-png.js albert@batimcam.cm
 *
 * Écrit le fichier dans UPLOAD_ROOT/signatures/<userId>-signature.png
 * (UPLOAD_ROOT par défaut /var/www/terp/uploads en prod, sinon cwd/uploads).
 * Sert l'URL /uploads/signatures/<userId>-signature.png (via nginx).
 *
 * Utile pour tester le rendu PDF sans avoir une vraie signature scannée.
 * En prod réelle, chaque cadre uploade son propre PNG via /profil.
 */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ───────── Mini encodeur PNG (RGBA) ─────────
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function makePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ───────── Dessine une signature manuscrite ─────────
function drawSignature() {
  const W = 260, H = 90;
  const rgba = Buffer.alloc(W * H * 4, 0); // transparent
  const ink = [25, 35, 95]; // bleu encre
  const setPx = (x, y, a = 255) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    rgba[i] = ink[0]; rgba[i + 1] = ink[1]; rgba[i + 2] = ink[2]; rgba[i + 3] = a;
  };
  const stroke = (x, y) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) setPx(x + dx, y + dy); };

  // Courbe cursive (combinaison de sinus) sur la largeur
  for (let t = 0; t <= 1; t += 0.0008) {
    const x = 18 + t * (W - 40);
    const y = H / 2 + Math.sin(t * Math.PI * 5) * 20 - Math.sin(t * Math.PI * 2) * 8 - t * 6;
    stroke(x, y);
  }
  // Boucle initiale (paraphe)
  for (let a = 0; a <= Math.PI * 2; a += 0.02) {
    stroke(34 + Math.cos(a) * 12, 40 + Math.sin(a) * 14);
  }
  // Trait de soulignement
  for (let x = 18; x < W - 22; x++) setPx(x, H - 16, 200);

  return makePng(W, H, rgba);
}

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/seed-signature-png.js <email>");
    process.exit(1);
  }
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!user) {
    console.error(`❌ User introuvable : ${email}`);
    process.exit(2);
  }

  const uploadRoot = process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "uploads");
  const dir = path.join(uploadRoot, "signatures");
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${user.id}-signature.png`;
  const filePath = path.join(dir, fileName);
  const publicUrl = `/uploads/signatures/${fileName}`;

  fs.writeFileSync(filePath, drawSignature());

  await prisma.userSignature.upsert({
    where: { userId: user.id },
    update: { signatureUrl: publicUrl, uploadedAt: new Date() },
    create: { userId: user.id, signatureUrl: publicUrl, uploadedAt: new Date() },
  });

  console.log(`✓ Signature PNG de démo générée pour ${user.firstName} ${user.lastName}`);
  console.log(`  Fichier : ${filePath}`);
  console.log(`  URL     : ${publicUrl}`);
  console.log(`\n  → Re-télécharge le PDF du rapport DT validé : la signature doit apparaître.`);

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
