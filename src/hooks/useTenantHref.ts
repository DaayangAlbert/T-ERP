"use client";

import { useCallback } from "react";
import { useTenantStore } from "@/stores/tenant-store";

// Chemins qui ne sont jamais sous /{slug}/ (cohérent avec middleware).
const NON_TENANT_PREFIXES = ["/api", "/cand", "/recrutement", "/admin", "/login", "/_next"];

/**
 * Hook qui retourne une fonction `href(path)` préfixant le slug du tenant
 * pour rendre les liens internes path-based (/{slug}/dashboard...).
 * Si aucun tenant n'est encore chargé en mémoire, on retourne le path tel quel
 * — le middleware se chargera de rediriger vers /{slug}/{path} au premier hit.
 */
export function useTenantHref(): (path: string) => string {
  const slug = useTenantStore((s) => s.tenant?.slug ?? null);
  return useCallback(
    (path: string) => {
      if (path === "/" || path.startsWith("#") || /^[a-z]+:\/\//i.test(path)) return path;
      if (NON_TENANT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return path;
      if (!slug) return path;
      if (!path.startsWith("/")) return `/${slug}/${path}`;
      // Évite le double préfixage si déjà sous /{slug}/...
      if (path === `/${slug}` || path.startsWith(`/${slug}/`)) return path;
      return `/${slug}${path}`;
    },
    [slug]
  );
}
