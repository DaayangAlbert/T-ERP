"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { CcSiteProvider } from "@/contexts/CcSiteContext";

const ALLOWED_ROLES = ["SITE_MANAGER", "WORKS_DIRECTOR", "TECH_DIRECTOR", "DG", "SUPER_ADMIN"];

export default function CcLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  // Service worker registration (PWA offline-first)
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/chef-chantier" })
        .catch((err) => console.warn("[CC] SW registration failed:", err));
    }
  }, []);

  useEffect(() => {
    if (user && !ALLOWED_ROLES.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user && !ALLOWED_ROLES.includes(user.role)) return null;

  return (
    <CcSiteProvider>
      <div data-rh-screen data-cc-screen className="rh-page">
        {children}
      </div>
    </CcSiteProvider>
  );
}
