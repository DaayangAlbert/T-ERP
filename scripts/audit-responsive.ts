/**
 * Audit responsive automatisé — protocole RH (PROMPT 0).
 *
 * Lance Playwright/Chromium sur 7 tailles, login Sandrine, va sur la route
 * cible et détecte les débordements horizontaux.
 *
 * Usage :
 *   pnpm exec tsx scripts/audit-responsive.ts /rh
 *   pnpm exec tsx scripts/audit-responsive.ts /rh/personnel
 *
 * Variable d'env :
 *   BASE_URL=http://localhost:5000 (par défaut, alignée sur le dev T-ERP)
 *   AUDIT_EMAIL=sandrine@batimcam.cm (par défaut)
 *   AUDIT_PASSWORD=Demo2026!
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const SIZES = [
  { w: 1920, h: 1080, name: "desktop-1920" },
  { w: 1440, h: 900, name: "laptop-1440" },
  { w: 1280, h: 800, name: "desktop-1280" },
  { w: 1024, h: 768, name: "tablet-1024" },
  { w: 768, h: 1024, name: "tablet-768" },
  { w: 414, h: 896, name: "mobile-414" },
  { w: 375, h: 667, name: "mobile-375" },
];

const route = process.argv[2] || "/rh";
const baseUrl = process.env.BASE_URL || "http://localhost:5000";
const email = process.env.AUDIT_EMAIL || "sandrine@batimcam.cm";
const password = process.env.AUDIT_PASSWORD || "Demo2026!";

const screensDir = path.resolve(process.cwd(), ".audit-screens");
mkdirSync(screensDir, { recursive: true });

// Fallback : si le download Chromium Playwright a échoué (cas réseau Cameroun),
// on tente d'utiliser Edge système (présent par défaut sur Windows 10/11).
const EDGE_PATH = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

(async () => {
  const launchOptions: Parameters<typeof chromium.launch>[0] = {};
  if (existsSync(EDGE_PATH)) {
    launchOptions.executablePath = EDGE_PATH;
    launchOptions.channel = undefined;
    console.log("ℹ Utilisation Edge système (Chromium Playwright indisponible)");
  }
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login direct via l'API (le formulaire login est dans une modale, plus simple ainsi)
  const loginResp = await page.request.post(`${baseUrl}/api/auth/login`, {
    data: { email, password },
    headers: { "Content-Type": "application/json" },
  });
  if (!loginResp.ok()) {
    console.error(`❌ Login API a échoué (${loginResp.status()})`);
    await browser.close();
    process.exit(1);
  }

  let problems = 0;
  for (const size of SIZES) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.goto(`${baseUrl}${route}`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - window.innerWidth;
    });
    const status = overflow <= 1 ? "✅" : "❌";
    console.log(`${status} ${size.name.padEnd(15)} overflow=${overflow}px`);
    if (overflow > 1) problems++;
    await page
      .screenshot({
        path: path.join(screensDir, `audit-${size.name}.png`),
        fullPage: false,
      })
      .catch(() => {});
  }

  await browser.close();

  if (problems > 0) {
    console.error(`\n❌ ${problems} taille(s) avec débordement. Corriger avant commit.`);
    process.exit(1);
  } else {
    console.log("\n✅ Toutes les tailles OK.");
  }
})();
