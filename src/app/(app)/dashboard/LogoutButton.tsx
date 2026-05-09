"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";

export default function LogoutButton() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const setTenant = useTenantStore((s) => s.setTenant);
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    logout();
    setTenant(null);
    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="h-10 rounded-md border border-line-2 bg-white px-4 text-sm font-medium text-ink-2 transition hover:border-primary-300 hover:text-primary-700 disabled:opacity-60"
    >
      {loading ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
