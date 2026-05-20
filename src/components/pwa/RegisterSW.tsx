"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Zones métier qui gèrent leur propre service worker (scope dédié). On n'y
// enregistre PAS le SW global pour éviter les conflits de scope "/".
const ROLE_PWA_AREAS = /\/(ouv|employe|chef-chantier)(\/|$)/;

/**
 * Enregistre le service worker global (`/sw-app.js`) à la racine.
 * Composant sans rendu : monté une fois dans le layout racine.
 */
export function RegisterSW() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (ROLE_PWA_AREAS.test(pathname || "")) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw-app.js", { scope: "/" })
        .catch((err) => console.warn("[PWA] SW global non enregistré:", err));
    };

    // Attendre le load pour ne pas concurrencer le rendu initial.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, [pathname]);

  return null;
}
