import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware T-ERP — Multi-tenant par slug dans l'URL
 *
 * Architecture path-based : tous les écrans applicatifs sont sous
 *   /{tenantSlug}/{role}/{page}   (ex: /batimcam-sa/direction-generale/objectifs)
 *
 * Pour faciliter la migration depuis l'ancien schéma non-préfixé, ce middleware
 * rétrocompatibilise les liens existants qui pointent encore sans slug :
 *   /dashboard      → /{slug}/dashboard
 *   /direction-...  → /{slug}/direction-...
 *   etc.
 * Le slug est lu depuis le cookie terp_access (JWT non-vérifié — la validation
 * réelle reste faite par (app)/[tenantSlug]/layout.tsx qui re-lookup le tenant).
 *
 * Routes non-tenant (jamais préfixées) :
 *   /                 portail public landing
 *   /api/*            API (résolution tenant via cookie auth)
 *   /admin/*          super-admin SaaS
 *   /cand/*           espace candidat externe
 *   /recrutement/*    portail recrutement public d'un tenant
 *   /_next/*, assets statiques
 */

// Sous-routes connues de (app) — utilisées pour redirect les anciens liens
// non-préfixés vers leur version /{slug}/... pendant la migration.
const APP_ROUTES = new Set([
  "achats",
  "chantiers",
  "chef-chantier",
  "comptabilite",
  "comptable",
  "conducteur-travaux",
  "configuration",
  "dashboard",
  "directeur-travaux",
  "direction-financiere",
  "direction-generale",
  "direction-technique",
  "employe",
  "finances",
  "gestion-documentaire",
  "informatique",
  "logistique",
  "magasin",
  "messagerie",
  "paie",
  "planning",
  "profil",
  "rapports",
  "ressources-humaines",
  "secretaire-general",
  "securite",
  "stocks",
  "validations",
]);

// Chemins qui ne sont jamais sous /{slug}/ — passent direct.
const NON_TENANT_PREFIXES = ["/api", "/cand", "/recrutement", "/login", "/_next"];

// /admin/* est super-admin SaaS — distinct des routes /{slug}/admin (IT du tenant).
function isSuperAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

// Décodage base64url → JSON, sans vérification de signature.
// La vraie validation est faite côté server component (DB lookup).
function decodeJwtPayload(token: string): { tenantSlug?: string | null; sub?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function readTenantSlugFromCookie(req: NextRequest): string | null {
  const token = req.cookies.get("terp_access")?.value;
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.tenantSlug ?? null;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Bypass assets statiques + API + sous-systèmes hors-tenant.
  if (
    NON_TENANT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    isSuperAdminPath(pathname) ||
    pathname === "/" ||
    pathname.includes(".") // .ico, .png, .js, .map, etc.
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  // Cas A : ancien lien non-préfixé (/dashboard, /direction-generale/...).
  // → On redirect vers /{slug}/{path} en récupérant le slug du cookie auth.
  if (first && APP_ROUTES.has(first)) {
    const slug = readTenantSlugFromCookie(request);
    if (!slug) {
      // Pas de session : on laisse Next.js servir un 404 ; le layout (app)
      // renverra l'utilisateur vers "/" si besoin.
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Cas B : pathname commence par un slug (forme canonique).
  // On injecte le slug en header pour les API routes / Server Components.
  if (first) {
    const response = NextResponse.next();
    response.headers.set("x-tenant-slug", first);
    response.headers.set("x-route-type", "tenant");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclure assets statiques et API publique du matcher
    "/((?!_next/static|_next/image|favicon.ico|images|api/public).*)",
  ],
};
