import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware T-ERP — Multi-tenant par sous-domaine
 *
 * Résolution :
 *   - app.terp.cm           → portail public (pas de tenant)
 *   - admin.terp.cm         → super-admin SaaS
 *   - <slug>.terp.cm        → tenant identifié par slug
 *   - localhost / *.terp.local → développement
 *
 * En dev sur localhost, deux raccourcis pour simuler les sous-domaines
 * sans toucher /etc/hosts :
 *   - ?tenant=batimcam dans l'URL → set le cookie terp_dev_tenant=batimcam
 *   - ?tenant=admin → cookie terp_dev_tenant=admin (super-admin)
 *   - ?tenant=  (vide) → clear cookie
 *
 * Le slug résolu est injecté en header x-tenant-slug pour les API routes.
 */

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "terp.cm";
const PUBLIC_SUBDOMAINS = ["app", "www", ""];
const ADMIN_SUBDOMAINS = ["admin"];
const DEV_TENANT_COOKIE = "terp_dev_tenant";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;
  const isLocalhost =
    hostname.startsWith("localhost") || hostname.includes(".localhost");

  // Extraire le sous-domaine depuis l'URL
  let subdomain = "";

  if (hostname.includes(APP_DOMAIN)) {
    subdomain = hostname.replace(`.${APP_DOMAIN}`, "").split(":")[0];
  } else if (hostname.includes("terp.local")) {
    subdomain = hostname.replace(".terp.local", "").split(":")[0];
  } else if (isLocalhost) {
    subdomain = "";
  }

  // Normaliser : si l'extraction a renvoyé le hostname brut, c'est qu'il n'y avait pas de sous-domaine
  if (subdomain === hostname.split(":")[0]) subdomain = "";

  // === Dev shortcut : ?tenant=... + cookie ===
  // Permet de tester batimcam.terp.local sans toucher /etc/hosts.
  let devTenantOverride: string | null = null;
  let setCookieValue: string | null = null;
  let clearCookie = false;

  if (isLocalhost) {
    const tenantQuery = request.nextUrl.searchParams.get("tenant");
    if (tenantQuery !== null) {
      // Explicit override via query string — also persist in a cookie.
      if (tenantQuery === "") {
        clearCookie = true;
      } else {
        setCookieValue = tenantQuery;
        devTenantOverride = tenantQuery;
      }
    } else {
      // Fall back to cookie
      const cookie = request.cookies.get(DEV_TENANT_COOKIE)?.value;
      if (cookie) devTenantOverride = cookie;
    }
    if (devTenantOverride) subdomain = devTenantOverride;
  }

  const response = NextResponse.next();

  if (setCookieValue) {
    response.cookies.set(DEV_TENANT_COOKIE, setCookieValue, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24h
    });
  }
  if (clearCookie) {
    response.cookies.delete(DEV_TENANT_COOKIE);
  }

  // === Cas 1 : portail public ===
  if (PUBLIC_SUBDOMAINS.includes(subdomain)) {
    response.headers.set("x-tenant-slug", "");
    response.headers.set("x-route-type", "public");

    // Sur le portail prod (app.terp.cm), /dashboard n'a pas de sens — rediriger vers /.
    // Sur localhost en dev, laisser le layout (app) gérer l'auth pour permettre le flow de test.
    if (!isLocalhost && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // === Cas 2 : super-admin SaaS ===
  if (ADMIN_SUBDOMAINS.includes(subdomain)) {
    response.headers.set("x-tenant-slug", "");
    response.headers.set("x-route-type", "admin");
    return response;
  }

  // === Cas 3 : tenant identifié ===
  response.headers.set("x-tenant-slug", subdomain);
  response.headers.set("x-route-type", "tenant");

  return response;
}

export const config = {
  matcher: [
    // Exclure assets statiques et API publique
    "/((?!_next/static|_next/image|favicon.ico|images|api/public).*)",
  ],
};
