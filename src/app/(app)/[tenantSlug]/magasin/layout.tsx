"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { useAuth } from "@/hooks/useAuth";
import { WarehouseProvider } from "@/contexts/WarehouseContext";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { ReadOnlyBanner } from "@/components/rbac/ReadOnlyBanner";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// WAREHOUSE = FULL · SITE_MANAGER = SCOPE · DG / DAF / LOGISTICS / WORKS_DIRECTOR / TECH_DIRECTOR = READ.
export default function MagLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const authorized = user ? canAccess(user.role as Role, MODULES.MAG) : null;

  // Service worker partagé avec le CC
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[MAG] SW registration failed:", err));
    }
  }, []);

  useEffect(() => {
    if (user && !authorized) router.replace("/dashboard");
  }, [user, authorized, router]);

  if (user && !authorized) return null;

  return (
    <WarehouseProvider>
      <ReadOnlyBanner module={MODULES.MAG} />
      <div data-rh-screen data-mag-screen className="rh-page">
        {children}
      </div>
    </WarehouseProvider>
  );
}
