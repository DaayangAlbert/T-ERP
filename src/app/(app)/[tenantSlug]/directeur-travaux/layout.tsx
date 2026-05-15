"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { useAuth } from "@/hooks/useAuth";
import { ChantierProvider } from "@/contexts/ChantierContext";
import { SiteSwitcher } from "@/components/dtrav/SiteSwitcher";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { ReadOnlyBanner } from "@/components/rbac/ReadOnlyBanner";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// WORKS_DIRECTOR = FULL · DG / DAF / TECH_DIRECTOR / SG / WORKS_MANAGER = READ.
export default function DtravLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const authorized = user ? canAccess(user.role as Role, MODULES.DTRAV) : null;

  useEffect(() => {
    if (user && !authorized) router.replace("/dashboard");
  }, [user, authorized, router]);

  if (user && !authorized) return null;

  return (
    <ChantierProvider>
      <ReadOnlyBanner module={MODULES.DTRAV} />
      <div data-rh-screen data-dtrav-screen className="rh-page">
        <SiteSwitcher />
        {children}
      </div>
    </ChantierProvider>
  );
}
