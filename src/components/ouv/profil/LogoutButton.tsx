"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, KeyRound } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";

interface Props {
  onChangePin: () => void;
}

// Section finale du profil : bouton "Changer mon PIN" + "Me déconnecter".
// La déconnexion appelle /api/auth/logout (existant) puis vide le store
// et redirige vers /ouv-login.
export function ProfileBottomActions({ onChangePin }: Props) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const setTenant = useTenantStore((s) => s.setTenant);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // best effort
    }
    logout();
    setTenant(null);
    router.push("/ouv-login");
    router.refresh();
  }

  return (
    <section className="mb-3.5 space-y-2.5">
      <button
        type="button"
        onClick={onChangePin}
        className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border-2 border-purple-200 bg-white text-[14px] font-bold text-purple-700 active:scale-[0.98]"
      >
        <KeyRound className="h-5 w-5" />
        Changer mon PIN
      </button>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border-2 border-rose-200 bg-white text-[14px] font-bold text-rose-600 active:scale-[0.98] disabled:opacity-60"
      >
        {loggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
        🚪 Me déconnecter
      </button>
    </section>
  );
}
