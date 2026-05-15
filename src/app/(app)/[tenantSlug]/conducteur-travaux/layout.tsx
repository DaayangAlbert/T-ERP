"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { useAuth } from "@/hooks/useAuth";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { ReadOnlyBanner } from "@/components/rbac/ReadOnlyBanner";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// WORKS_MANAGER = FULL · WORKS_DIRECTOR / DG / DAF / TECH_DIRECTOR / SG / SITE_MANAGER = READ.
export default function CdtLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const authorized = user ? canAccess(user.role as Role, MODULES.CDT) : null;

  useEffect(() => {
    if (user && !authorized) router.replace("/dashboard");
  }, [user, authorized, router]);

  if (user && !authorized) return null;

  return (
    <>
      <ReadOnlyBanner module={MODULES.CDT} />
      <div data-cdt-screen data-rh-screen className="rh-page">
        {children}
      </div>
    </>
  );
}
