/**
 * Balayage responsive multi-routes (temporaire, volet PWA/responsive).
 *
 * - Login optionnel via /api/auth/login (champ `identifier`).
 * - Pour chaque chemin complet fourni, mesure le débordement horizontal sur
 *   plusieurs tailles et capture une screenshot des combos en échec.
 *
 * Usage :
 *   IDENT=albert@batimcam.cm PWD=Demo2026! PATHS="/batimcam/dashboard,/batimcam/dashboard/dg" node scripts/audit-sweep.mjs
 *   PATHS="/" node scripts/audit-sweep.mjs            (public, sans login)
 */
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const ALL_SIZES = [
  { w: 1440, h: 900, name: "laptop-1440" },
  { w: 1024, h: 768, name: "tablet-1024" },
  { w: 768, h: 1024, name: "tablet-768" },
  { w: 414, h: 896, name: "mobile-414" },
  { w: 375, h: 667, name: "mobile-375" },
];
// SIZES="375,768" pour limiter aux largeurs voulues (accélère le balayage).
const wanted = (process.env.SIZES || "").split(",").map((s) => s.trim()).filter(Boolean);
const SIZES = wanted.length
  ? ALL_SIZES.filter((s) => wanted.some((w) => s.name.includes(w)))
  : ALL_SIZES;

const base = process.env.BASE_URL || "http://localhost:5000";
const ident = process.env.IDENT || "";
const pwd = process.env.PWD || "Demo2026!";
const paths = (process.env.PATHS || "/").split(",").map((s) => s.trim()).filter(Boolean);

const EDGE_PATH = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const screensDir = path.resolve(process.cwd(), ".audit-screens");
mkdirSync(screensDir, { recursive: true });

(async () => {
  const launchOptions = {};
  if (existsSync(EDGE_PATH)) launchOptions.executablePath = EDGE_PATH;
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext();
  const page = await context.newPage();

  if (ident) {
    const r = await page.request.post(`${base}/api/auth/login`, {
      data: { identifier: ident, password: pwd },
      headers: { "Content-Type": "application/json" },
    });
    if (!r.ok()) {
      console.error(`Login échec (${r.status()}) pour ${ident}`);
      await browser.close();
      process.exit(1);
    }
    console.log(`Connecté: ${ident}`);
  }

  let totalProblems = 0;
  for (const p of paths) {
    console.log(`\n=== ${p} ===`);
    for (const size of SIZES) {
      await page.setViewportSize({ width: size.w, height: size.h });
      let resp;
      try {
        resp = await page.goto(`${base}${p}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      } catch (e) {
        console.log(`  ⚠  ${size.name.padEnd(13)} navigation échouée: ${String(e.message).split("\n")[0]}`);
        continue;
      }
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
      const finalUrl = page.url().replace(base, "");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      const status = overflow <= 1 ? "OK " : "❌ ";
      console.log(
        `  ${status} ${size.name.padEnd(13)} overflow=${String(overflow).padStart(4)}px  [${resp?.status()}] ${finalUrl !== p ? "→ " + finalUrl : ""}`
      );
      if (overflow > 1) {
        totalProblems++;
        const safe = p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
        await page
          .screenshot({ path: path.join(screensDir, `${safe}-${size.name}.png`), fullPage: false })
          .catch(() => {});
      }
    }
  }

  await browser.close();
  console.log(`\n${totalProblems === 0 ? "✅ Aucun débordement." : `❌ ${totalProblems} combo(s) en débordement.`}`);
})();
