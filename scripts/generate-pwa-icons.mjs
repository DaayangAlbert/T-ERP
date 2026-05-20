/**
 * Génère les icônes PWA T-ERP à partir de la géométrie du logo (public/logo-terp.svg).
 *
 * Pas de dépendance externe : encodeur PNG minimal basé sur zlib natif.
 * Rendu en supersampling 4x puis downsample pour l'anti-aliasing (bords
 * arrondis + dégradé violet propres).
 *
 * Sorties (public/) :
 *   icons/icon-192.png            — purpose "any", fond transparent
 *   icons/icon-512.png            — purpose "any", fond transparent
 *   icons/maskable-192.png        — purpose "maskable", fond #2A1B3D, zone de sécurité 80%
 *   icons/maskable-512.png        — purpose "maskable", fond #2A1B3D
 *   apple-touch-icon.png          — 180x180, fond #2A1B3D (écran d'accueil iOS)
 *   icons/favicon-32.png          — favicon 32px
 *
 * Lancer :  node scripts/generate-pwa-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");
const ICONS_DIR = join(PUBLIC, "icons");

// --- Charte T-ERP ---
const GRAD_TOP = [0xc0, 0x84, 0xfc]; // #C084FC (haut-gauche)
const GRAD_BOT = [0xa8, 0x55, 0xf7]; // #A855F7 (bas-droite)
const BG_DARK = [0x2a, 0x1b, 0x3d]; // #2A1B3D

// Barres du logo (viewBox 0 0 64 64)
const BARS = [
  { x: 6, y: 14, w: 52, h: 11, r: 2 },
  { x: 14, y: 29, w: 36, h: 11, r: 2 },
  { x: 22, y: 44, w: 20, h: 11, r: 2 },
];
const VIEW = 64;

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function insideRoundRect(px, py, { x, y, w, h, r }) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const rx0 = x + r, rx1 = x + w - r, ry0 = y + r, ry1 = y + h - r;
  let cx = px, cy = py, corner = false;
  if (px < rx0 && py < ry0) { cx = rx0; cy = ry0; corner = true; }
  else if (px > rx1 && py < ry0) { cx = rx1; cy = ry0; corner = true; }
  else if (px < rx0 && py > ry1) { cx = rx0; cy = ry1; corner = true; }
  else if (px > rx1 && py > ry1) { cx = rx1; cy = ry1; corner = true; }
  if (!corner) return true;
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Rend une icône RGBA.
 * @param {number} size  côté en px
 * @param {number[]|null} bg  couleur de fond [r,g,b] ou null (transparent)
 * @param {number} contentScale  fraction du canvas occupée par le logo 64u
 */
function renderIcon(size, bg, contentScale) {
  const ss = 4;
  const R = size * ss;
  const buf = Buffer.alloc(R * R * 4);

  const contentPx = contentScale * R;
  const offset = (R - contentPx) / 2;

  for (let ry = 0; ry < R; ry++) {
    for (let rx = 0; rx < R; rx++) {
      // coordonnées dans le viewBox 64u
      const vx = ((rx + 0.5 - offset) / contentPx) * VIEW;
      const vy = ((ry + 0.5 - offset) / contentPx) * VIEW;

      let r, g, b, a;
      let onBar = false;
      if (vx >= 0 && vx <= VIEW && vy >= 0 && vy <= VIEW) {
        for (const bar of BARS) {
          if (insideRoundRect(vx, vy, bar)) { onBar = true; break; }
        }
      }

      if (onBar) {
        const t = Math.min(1, Math.max(0, (vx / VIEW + vy / VIEW) / 2));
        r = lerp(GRAD_TOP[0], GRAD_BOT[0], t);
        g = lerp(GRAD_TOP[1], GRAD_BOT[1], t);
        b = lerp(GRAD_TOP[2], GRAD_BOT[2], t);
        a = 255;
      } else if (bg) {
        [r, g, b] = bg;
        a = 255;
      } else {
        r = g = b = 0; a = 0;
      }

      const i = (ry * R + rx) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
    }
  }

  // Downsample R -> size (moyenne premultipliée pour des bords corrects)
  const out = Buffer.alloc(size * size * 4);
  for (let sy = 0; sy < size; sy++) {
    for (let sx = 0; sx < size; sx++) {
      let sr = 0, sg = 0, sb = 0, sa = 0;
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const i = (((sy * ss + dy) * R) + (sx * ss + dx)) * 4;
          const a = buf[i + 3];
          sr += buf[i] * a;
          sg += buf[i + 1] * a;
          sb += buf[i + 2] * a;
          sa += a;
        }
      }
      const o = (sy * size + sx) * 4;
      const n = ss * ss;
      out[o + 3] = Math.round(sa / n);
      if (sa > 0) {
        out[o] = Math.round(sr / sa);
        out[o + 1] = Math.round(sg / sa);
        out[o + 2] = Math.round(sb / sa);
      }
    }
  }
  return out;
}

// --- Encodeur PNG minimal ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(rgba, width, height) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // scanlines avec byte de filtre 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function save(path, size, bg, contentScale) {
  const rgba = renderIcon(size, bg, contentScale);
  const png = encodePNG(rgba, size, size);
  writeFileSync(path, png);
  console.log(`  ✓ ${path.replace(PUBLIC, "public")} (${size}px, ${png.length} o)`);
}

mkdirSync(ICONS_DIR, { recursive: true });
console.log("Génération des icônes PWA T-ERP…");
// "any" — transparent, le logo occupe presque tout le cadre
save(join(ICONS_DIR, "icon-192.png"), 192, null, 1);
save(join(ICONS_DIR, "icon-512.png"), 512, null, 1);
// "maskable" — fond plein, logo dans la zone de sécurité (80%)
save(join(ICONS_DIR, "maskable-192.png"), 192, BG_DARK, 0.8);
save(join(ICONS_DIR, "maskable-512.png"), 512, BG_DARK, 0.8);
// iOS — fond plein, marge confortable (coins arrondis appliqués par iOS)
save(join(PUBLIC, "apple-touch-icon.png"), 180, BG_DARK, 0.72);
// favicon
save(join(ICONS_DIR, "favicon-32.png"), 32, null, 1);
console.log("Terminé.");
