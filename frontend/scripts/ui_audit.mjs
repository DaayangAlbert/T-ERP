import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, request } from "playwright";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const REPORT_ROOT = path.join(WORKSPACE_ROOT, "artifacts", "responsive-check", "reports");

const BASE_URL = process.env.UI_AUDIT_BASE_URL || "http://127.0.0.1:4174";
const LOGIN_EMAIL = process.env.UI_AUDIT_EMAIL || "admin@demo.local";
const LOGIN_PASSWORD = process.env.UI_AUDIT_PASSWORD || "DemoPass123!";

const ROUTES = [
  { key: "dashboard", path: "/app" },
  { key: "users", path: "/app/users" },
  { key: "projects", path: "/app/projects" },
  { key: "finance", path: "/app/finance" },
  { key: "inventory", path: "/app/inventory" },
  { key: "procurement", path: "/app/procurement" },
];

const SCENARIOS = [
  { key: "desktop-light", width: 1440, height: 900, isMobile: false, theme: "light" },
  { key: "desktop-dark", width: 1440, height: 900, isMobile: false, theme: "dark" },
  { key: "mobile-light", width: 390, height: 844, isMobile: true, theme: "light" },
  { key: "mobile-dark", width: 390, height: 844, isMobile: true, theme: "dark" },
];

function toPosixPath(value) {
  return value.replaceAll("\\", "/");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function stabilizePageForFullPageScreenshot(page) {
  return page.evaluate(() => {
    const stabilizedElements = [];

    for (const node of document.querySelectorAll("body *")) {
      if (!(node instanceof HTMLElement)) continue;

      const style = getComputedStyle(node);
      const isViewportAnchored = style.position === "fixed" || style.position === "sticky";
      const isHiddenOverlay =
        node.getAttribute("aria-hidden") === "true" ||
        node.hasAttribute("inert") ||
        style.pointerEvents === "none" ||
        Number(style.opacity) <= 0.01;

      if (isHiddenOverlay && style.position === "fixed") {
        node.dataset.uiAuditOriginalDisplay = node.style.display;
        node.style.setProperty("display", "none", "important");
        stabilizedElements.push({
          tag: node.tagName.toLowerCase(),
          mode: "hidden-fixed-overlay",
          text: (node.innerText || "").trim().slice(0, 80),
        });
        continue;
      }

      if (!isViewportAnchored) continue;

      node.dataset.uiAuditOriginalPosition = node.style.position;
      node.dataset.uiAuditOriginalTop = node.style.top;
      node.dataset.uiAuditOriginalRight = node.style.right;
      node.dataset.uiAuditOriginalBottom = node.style.bottom;
      node.dataset.uiAuditOriginalLeft = node.style.left;
      node.dataset.uiAuditOriginalTransform = node.style.transform;
      node.style.setProperty("position", "static", "important");
      node.style.setProperty("inset", "auto", "important");
      node.style.setProperty("top", "auto", "important");
      node.style.setProperty("right", "auto", "important");
      node.style.setProperty("bottom", "auto", "important");
      node.style.setProperty("left", "auto", "important");
      node.style.setProperty("transform", "none", "important");

      stabilizedElements.push({
        tag: node.tagName.toLowerCase(),
        mode: `${style.position}-to-static`,
        text: (node.innerText || "").trim().slice(0, 80),
      });
    }

    let styleNode = document.getElementById("ui-audit-stable-screenshot-style");
    if (!styleNode) {
      styleNode = document.createElement("style");
      styleNode.id = "ui-audit-stable-screenshot-style";
      document.head.appendChild(styleNode);
    }
    styleNode.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
    `;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    return stabilizedElements.slice(0, 50);
  });
}

async function login() {
  const api = await request.newContext({ baseURL: BASE_URL });
  const response = await api.post("/api/v1/auth/login", {
    data: {
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Login failed (${response.status()}): ${text}`);
  }

  const session = await response.json();
  await api.dispose();
  return session;
}

async function collectScenarioAudit(browser, session, route, scenario, outputDir) {
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: scenario.height },
    isMobile: scenario.isMobile,
    colorScheme: scenario.theme === "dark" ? "dark" : "light",
  });

  const page = await context.newPage();
  await page.addInitScript(
    ({ sessionData, theme }) => {
      const user = sessionData.user || {};
      sessionStorage.setItem("accessToken", sessionData.access_token || "");
      sessionStorage.setItem("refreshToken", sessionData.refresh_token || "");
      sessionStorage.setItem("authUser", JSON.stringify(user));
      if (user.company_id != null) {
        sessionStorage.setItem("tenantId", String(user.company_id));
      }
      localStorage.setItem("preferredTheme", theme);
    },
    { sessionData: session, theme: scenario.theme }
  );

  const url = `${BASE_URL}${route.path}`;
  const startedAt = Date.now();
  let evaluation;
  let error = null;

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(1500);

    evaluation = await page.evaluate(() => {
      const root = document.scrollingElement || document.documentElement;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;

      const offenders = [];
      for (const node of document.querySelectorAll("body *")) {
        if (!(node instanceof HTMLElement)) continue;
        const rect = node.getBoundingClientRect();
        const overflowX = Math.round(rect.right - viewportWidth);
        if (overflowX > 8) {
          offenders.push({
            tag: node.tagName.toLowerCase(),
            className: node.className,
            text: (node.innerText || "").trim().slice(0, 90),
            overflowX,
          });
        }
        if (offenders.length >= 12) break;
      }

      function parseColor(colorValue) {
        const match = colorValue.match(/rgba?\(([^)]+)\)/);
        if (!match) return null;
        const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
        return {
          r: parts[0] ?? 0,
          g: parts[1] ?? 0,
          b: parts[2] ?? 0,
          a: Number.isFinite(parts[3]) ? parts[3] : 1,
        };
      }

      function blendOver(foreground, background) {
        const alpha = Math.max(0, Math.min(1, foreground.a));
        const backgroundAlpha = Math.max(0, Math.min(1, background.a));
        const outputAlpha = alpha + backgroundAlpha * (1 - alpha);

        if (outputAlpha <= 0) {
          return { r: 255, g: 255, b: 255, a: 1 };
        }

        return {
          r: Math.round((foreground.r * alpha + background.r * backgroundAlpha * (1 - alpha)) / outputAlpha),
          g: Math.round((foreground.g * alpha + background.g * backgroundAlpha * (1 - alpha)) / outputAlpha),
          b: Math.round((foreground.b * alpha + background.b * backgroundAlpha * (1 - alpha)) / outputAlpha),
          a: outputAlpha,
        };
      }

      function luminance(channel) {
        const s = channel / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      }

      function contrastRatio(foreground, background) {
        const resolvedForeground = foreground.a < 1 ? blendOver(foreground, background) : foreground;
        const l1 = 0.2126 * luminance(resolvedForeground.r) + 0.7152 * luminance(resolvedForeground.g) + 0.0722 * luminance(resolvedForeground.b);
        const l2 = 0.2126 * luminance(background.r) + 0.7152 * luminance(background.g) + 0.0722 * luminance(background.b);
        const light = Math.max(l1, l2);
        const dark = Math.min(l1, l2);
        return (light + 0.05) / (dark + 0.05);
      }

      function getRootBackgroundColor() {
        const fallback = document.documentElement.classList.contains("theme-dark")
          ? { r: 2, g: 6, b: 23, a: 1 }
          : { r: 248, g: 250, b: 252, a: 1 };
        const rootColor = parseColor(getComputedStyle(document.documentElement).backgroundColor);
        const bodyColor = parseColor(getComputedStyle(document.body).backgroundColor);
        const rootBackground = rootColor && rootColor.a > 0 ? blendOver(rootColor, fallback) : fallback;
        return bodyColor && bodyColor.a > 0 ? blendOver(bodyColor, rootBackground) : rootBackground;
      }

      function findBackgroundColor(element) {
        const stack = [];
        let cursor = element;
        while (cursor && cursor instanceof HTMLElement) {
          stack.push(cursor);
          cursor = cursor.parentElement;
        }

        let background = getRootBackgroundColor();
        for (const item of stack.reverse()) {
          const style = getComputedStyle(item);
          const color = parseColor(style.backgroundColor);
          if (color && color.a > 0) {
            background = blendOver(color, background);
          }
        }

        if (background.a < 1) {
          return blendOver(background, getRootBackgroundColor());
        }

        return background;
      }

      const viewportAnchoredElements = [];
      for (const node of document.querySelectorAll("body *")) {
        if (!(node instanceof HTMLElement)) continue;
        const style = getComputedStyle(node);
        if (style.position !== "fixed" && style.position !== "sticky") continue;
        if (node.getAttribute("aria-hidden") === "true" || style.display === "none" || style.visibility === "hidden") continue;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) continue;
        viewportAnchoredElements.push({
          tag: node.tagName.toLowerCase(),
          className: node.className,
          position: style.position,
          text: (node.innerText || "").trim().slice(0, 90),
          rect: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        });
        if (viewportAnchoredElements.length >= 12) break;
      }

      const contrastIssues = [];
      const candidates = Array.from(document.querySelectorAll("p,span,small,label,a,button,li,h1,h2,h3,h4,h5,h6"));
      for (const node of candidates) {
        if (!(node instanceof HTMLElement)) continue;
        const text = (node.innerText || "").trim();
        if (!text || text.length < 3) continue;

        const style = getComputedStyle(node);
        if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < 0.5) continue;

        const foreground = parseColor(style.color);
        if (!foreground) continue;
        const background = findBackgroundColor(node);
        const ratio = contrastRatio(foreground, background);

        if (ratio < 4.5) {
          contrastIssues.push({
            text: text.slice(0, 80),
            className: node.className,
            ratio: Number(ratio.toFixed(2)),
            color: style.color,
            background: `rgb(${background.r}, ${background.g}, ${background.b})`,
          });
        }

        if (contrastIssues.length >= 12) break;
      }

      return {
        title: document.title,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        scroll: {
          width: root.scrollWidth,
          clientWidth: root.clientWidth,
          height: root.scrollHeight,
          clientHeight: root.clientHeight,
          horizontalOverflow: root.scrollWidth > root.clientWidth + 4,
        },
        shell: {
          mobileMenuButton: !!document.querySelector('[aria-label="Ouvrir le menu"], [aria-label="Open menu"]'),
          mainExists: !!document.querySelector("main"),
        },
        sampleContent: document.querySelector("main")?.innerText?.trim()?.slice(0, 220) || null,
        themeClasses: document.documentElement.className,
        offenders,
        viewportAnchoredElements,
        contrastIssues,
      };
    });
  } catch (caught) {
    error = String(caught);
  }

  const screenshotName = `${route.key}-${scenario.key}.png`;
  const screenshotPath = path.join(outputDir, screenshotName);
  const stabilizedScreenshotElements = await stabilizePageForFullPageScreenshot(page);
  await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled", caret: "hide" });

  await context.close();

  return {
    scenario: scenario.key,
    route: route.path,
    url,
    durationMs: Date.now() - startedAt,
    screenshot: toPosixPath(path.relative(WORKSPACE_ROOT, screenshotPath)),
    screenshotStabilized: stabilizedScreenshotElements.length > 0,
    stabilizedScreenshotElements,
    error,
    ...evaluation,
  };
}

async function main() {
  await ensureDir(REPORT_ROOT);

  console.log(`UI audit base URL: ${BASE_URL}`);
  console.log(`Routes: ${ROUTES.map((entry) => entry.path).join(", ")}`);

  const session = await login();
  const browser = await chromium.launch({ headless: true });

  const summary = [];

  for (const route of ROUTES) {
    const routeOutputDir = path.join(REPORT_ROOT, route.key);
    await ensureDir(routeOutputDir);

    const scenarios = [];
    for (const scenario of SCENARIOS) {
      const report = await collectScenarioAudit(browser, session, route, scenario, routeOutputDir);
      scenarios.push(report);
      const status = report.error ? "ERROR" : "OK";
      console.log(`[${status}] ${route.path} :: ${scenario.key} (${report.durationMs}ms)`);
    }

    const routeJson = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      route: route.path,
      scenarios,
    };

    const reportPath = path.join(REPORT_ROOT, `${route.key}.json`);
    await fs.writeFile(reportPath, `${JSON.stringify(routeJson, null, 2)}\n`, "utf8");

    summary.push({
      route: route.path,
      report: toPosixPath(path.relative(WORKSPACE_ROOT, reportPath)),
      errors: scenarios.filter((entry) => entry.error).length,
      overflowScenarios: scenarios.filter((entry) => entry.scroll?.horizontalOverflow).length,
      contrastIssueScenarios: scenarios.filter((entry) => (entry.contrastIssues || []).length > 0).length,
      viewportAnchoredScenarios: scenarios.filter((entry) => (entry.viewportAnchoredElements || []).length > 0).length,
      stabilizedScreenshotScenarios: scenarios.filter((entry) => entry.screenshotStabilized).length,
    });
  }

  await browser.close();

  const summaryPath = path.join(REPORT_ROOT, "summary.json");
  await fs.writeFile(
    summaryPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, summary }, null, 2)}\n`,
    "utf8"
  );

  console.log(`Saved summary: ${toPosixPath(path.relative(WORKSPACE_ROOT, summaryPath))}`);

  const hasBlockingError = summary.some((row) => row.errors > 0 || row.overflowScenarios > 0);
  if (hasBlockingError) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
