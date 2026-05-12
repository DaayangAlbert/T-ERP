/**
 * Audit tap targets — protocole RH/MAG/CDT/EMP (PROMPT 0+).
 *
 * Charge la route, scrute les éléments interactifs (a, button, [role=button],
 * input/select) et signale ceux dont la zone effective de tap est < min.
 * Par défaut 48 px (mobile-first, viewport 375).
 *
 * Usage :
 *   pnpm exec tsx scripts/audit-tap-targets.ts /emp/dashboard --min=48
 *
 * Variables :
 *   BASE_URL=http://localhost:5000
 *   AUDIT_EMAIL=francois@batimcam.cm
 *   AUDIT_PASSWORD=Demo2026!
 */
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";

const route = process.argv[2] || "/emp/dashboard";
const minArg = process.argv.find((a) => a.startsWith("--min="));
const MIN = Number(minArg?.split("=")[1] ?? 48);
const baseUrl = process.env.BASE_URL || "http://localhost:5000";
const email = process.env.AUDIT_EMAIL || "francois@batimcam.cm";
const password = process.env.AUDIT_PASSWORD || "Demo2026!";

const EDGE_PATH = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

(async () => {
  const launchOptions: Parameters<typeof chromium.launch>[0] = {};
  if (existsSync(EDGE_PATH)) {
    launchOptions.executablePath = EDGE_PATH;
    launchOptions.channel = undefined;
  }
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  const loginResp = await page.request.post(`${baseUrl}/api/auth/login`, {
    data: { email, password },
    headers: { "Content-Type": "application/json" },
  });
  if (!loginResp.ok()) {
    console.error(`❌ Login API a échoué (${loginResp.status()})`);
    await browser.close();
    process.exit(1);
  }

  await page.goto(`${baseUrl}${route}`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  type Offender = { tag: string; text: string; w: number; h: number; selector: string };
  const offenders: Offender[] = await page.evaluate((min) => {
    // L'audit cible UNIQUEMENT le contenu du profil (data-*-screen, ex.
    // data-emp-screen / data-rh-screen / data-cc-screen / data-mag-screen).
    // L'app shell (Sidebar/Header) est volontairement exclu — il a sa propre
    // matrice de tap-targets gérée au niveau composant global.
    const SCOPE_SELECTORS = [
      "[data-emp-screen]",
      "[data-cc-screen]",
      "[data-mag-screen]",
      "[data-cdt-screen]",
      "[data-rh-screen]:not([data-cdt-screen]):not([data-mag-screen]):not([data-cc-screen]):not([data-emp-screen])",
    ];
    const scope = document.querySelector(SCOPE_SELECTORS.join(", ")) ?? document.body;

    const SELECTOR = 'a[href], button, [role="button"], input:not([type="hidden"]), select, [data-tap-target]';
    const out: Offender[] = [];
    scope.querySelectorAll(SELECTOR).forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Ignore les éléments cachés / invisibles
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) return;
      if (rect.width < min || rect.height < min) {
        out.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? "").trim().slice(0, 40),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          selector: (el.getAttribute("data-testid") ?? el.getAttribute("href") ?? el.getAttribute("aria-label") ?? "").slice(0, 60),
        });
      }
    });
    return out;
  }, MIN);

  if (offenders.length === 0) {
    console.log(`✅ Tap targets ≥ ${MIN} px sur ${route} (viewport 375).`);
    await browser.close();
    return;
  }

  console.log(`❌ ${offenders.length} élément(s) sous ${MIN} px sur ${route} :`);
  for (const o of offenders) {
    console.log(`  · <${o.tag}> ${o.w}×${o.h} — "${o.text}"${o.selector ? ` [${o.selector}]` : ""}`);
  }
  await browser.close();
  process.exit(1);
})();
