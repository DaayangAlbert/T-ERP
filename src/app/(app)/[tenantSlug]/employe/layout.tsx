"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { Role } from "@prisma/client";
import { useAuth } from "@/hooks/useAuth";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { getAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";

// Espace EMP : ouvert à tout rôle ayant un accès non-NONE à EMP dans la
// matrice (EMPLOYEE en FULL, et toutes les directions en OWN — pour leur
// PROPRE espace). La protection RGPD est faite côté API par guardEmp +
// guardEmpOwnership : personne ne consulte les données d'un autre user.
// Les ouvriers (WORKER) ont leur propre espace mobile-first /ouv.
function canAccessEmp(role: string | null | undefined): boolean {
  if (!role) return false;
  return getAccess(role as Role, MODULES.EMP).level !== "NONE";
}

export default function EmpLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  // Service worker dédié /emp (cache offline bulletins + congés + profil)
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-emp.js", { scope: "/employe" })
        .catch((err) => console.warn("[EMP] SW registration failed:", err));
    }
  }, []);

  useEffect(() => {
    if (user && !canAccessEmp(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user && !canAccessEmp(user.role)) return null;

  return (
    <EmployeeProvider>
      <Head>
        <link rel="manifest" href="/manifest-emp.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="T-ERP EMP" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <div data-rh-screen data-emp-screen className="rh-page">
        {children}
      </div>
    </EmployeeProvider>
  );
}
