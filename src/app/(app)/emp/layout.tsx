"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { useAuth } from "@/hooks/useAuth";
import { EmployeeProvider } from "@/contexts/EmployeeContext";

// Espace EMP : exclusivement EMPLOYEE et WORKER.
// Les autres profils (DG, DAF, RH, etc.) ne consultent PAS l'espace personnel
// d'un autre utilisateur, ce serait une fuite RGPD/sociale.
const ALLOWED_ROLES = ["EMPLOYEE", "WORKER"];

export default function EmpLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  // Service worker dédié /emp (cache offline bulletins + congés + profil)
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-emp.js", { scope: "/emp" })
        .catch((err) => console.warn("[EMP] SW registration failed:", err));
    }
  }, []);

  useEffect(() => {
    if (user && !ALLOWED_ROLES.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user && !ALLOWED_ROLES.includes(user.role)) return null;

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
