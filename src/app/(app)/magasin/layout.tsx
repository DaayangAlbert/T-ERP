"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { WarehouseProvider } from "@/contexts/WarehouseContext";

const ALLOWED_ROLES = ["WAREHOUSE", "SITE_MANAGER", "WORKS_DIRECTOR", "TECH_DIRECTOR", "DG", "SUPER_ADMIN"];

export default function MagLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  // Service worker partagé avec le CC
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[MAG] SW registration failed:", err));
    }
  }, []);

  useEffect(() => {
    if (user && !ALLOWED_ROLES.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user && !ALLOWED_ROLES.includes(user.role)) return null;

  return (
    <WarehouseProvider>
      <div data-rh-screen data-mag-screen className="rh-page">
        {children}
      </div>
    </WarehouseProvider>
  );
}
