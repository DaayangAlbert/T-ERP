"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { useAuth } from "@/hooks/useAuth";
import { CcSiteProvider } from "@/contexts/CcSiteContext";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { ReadOnlyBanner } from "@/components/rbac/ReadOnlyBanner";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// SITE_MANAGER / WORKS_DIRECTOR = FULL · DG / DAF / TECH_DIRECTOR / WORKS_MANAGER / SG = READ.
export default function CcLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const authorized = user ? canAccess(user.role as Role, MODULES.CC) : null;

  // Service worker registration (PWA offline-first)
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/chef-chantier" })
        .catch((err) => console.warn("[CC] SW registration failed:", err));
    }
  }, []);

  useEffect(() => {
    if (user && !authorized) router.replace("/dashboard");
  }, [user, authorized, router]);

  if (user && !authorized) return null;

  return (
    <CcSiteProvider>
      <ReadOnlyBanner module={MODULES.CC} />
      <div data-rh-screen data-cc-screen className="rh-page">
        {children}
      </div>
    </CcSiteProvider>
  );
}
