"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { AuthModal, type AuthTab, type SignupPick } from "@/components/auth/AuthModal";

export function LandingHeader() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");
  const [authPick, setAuthPick] = useState<SignupPick>("company");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Auto-ouverture de la modale via ?login=1 (utilisé par les anciens liens
  // /admin/login et /cand/login qui redirigent vers / maintenant).
  useEffect(() => {
    if (searchParams.get("login") === "1") {
      setAuthTab("login");
      setAuthOpen(true);
      // Nettoie l'URL pour ne pas re-déclencher au rechargement.
      const params = new URLSearchParams(searchParams.toString());
      params.delete("login");
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  function open(tab: AuthTab, pick: SignupPick = "company") {
    setAuthTab(tab);
    setAuthPick(pick);
    setAuthOpen(true);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="text-base font-bold text-ink">T-ERP</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#modules" className="text-sm text-ink-2 hover:text-primary">Modules</a>
            <a href="#profils" className="text-sm text-ink-2 hover:text-primary">Profils</a>
            <a href="#stack" className="text-sm text-ink-2 hover:text-primary">Stack</a>
            <a href="#comparaison" className="text-sm text-ink-2 hover:text-primary">Comparaison</a>
            <a href="#faq" className="text-sm text-ink-2 hover:text-primary">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => open("login")}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-alt"
            >
              Connexion
            </button>
            <a
              href="#demo"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-brand hover:bg-primary-600"
            >
              Demander une démo
            </a>
          </div>
        </div>
      </header>

      <AuthModal
        open={authOpen}
        defaultTab={authTab}
        defaultPick={authPick}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
