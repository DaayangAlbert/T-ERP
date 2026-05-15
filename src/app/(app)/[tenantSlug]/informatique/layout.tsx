"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { useAuth } from "@/hooks/useAuth";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { ReadOnlyBanner } from "@/components/rbac/ReadOnlyBanner";

// Autorisation pilotée par la matrice centralisée (access-matrix.ts).
// TENANT_ADMIN = FULL · SUPER_ADMIN = READ (audit plateforme).
export default function ItLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const authorized = user ? canAccess(user.role as Role, MODULES.IT) : null;

  useEffect(() => {
    if (user && !authorized) router.replace("/dashboard");
  }, [user, authorized, router]);

  if (user && !authorized) return null;

  return (
    <>
      <ReadOnlyBanner module={MODULES.IT} />
      <div data-rh-screen data-it-screen className="rh-page">
        {children}
      </div>
    </>
  );
}
