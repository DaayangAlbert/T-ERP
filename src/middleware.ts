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
 * Le tenant slug est injecté en header x-tenant-slug pour les API routes.
 */

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "terp.cm";
const PUBLIC_SUBDOMAINS = ["app", "www", ""];
const ADMIN_SUBDOMAINS = ["admin"];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Extraire le sous-domaine
  let subdomain = "";

  if (hostname.includes(APP_DOMAIN)) {
    subdomain = hostname.replace(`.${APP_DOMAIN}`, "").split(":")[0];
  } else if (hostname.includes("terp.local")) {
    subdomain = hostname.replace(".terp.local", "").split(":")[0];
  } else if (hostname.startsWith("localhost")) {
    // Dev sans sous-domaine : pas de tenant
    subdomain = "";
  }

  // Normaliser
  if (subdomain === hostname.split(":")[0]) subdomain = ""; // pas de sous-domaine extrait

  const response = NextResponse.next();

  // Cas 1 : portail public
  if (PUBLIC_SUBDOMAINS.includes(subdomain)) {
    response.headers.set("x-tenant-slug", "");
    response.headers.set("x-route-type", "public");

    // Rediriger vers (public) si on est sur une route app/admin
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Cas 2 : super-admin SaaS
  if (ADMIN_SUBDOMAINS.includes(subdomain)) {
    response.headers.set("x-tenant-slug", "");
    response.headers.set("x-route-type", "admin");
    return response;
  }

  // Cas 3 : tenant identifié
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
