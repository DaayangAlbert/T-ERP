"use client";

import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-base font-bold text-ink">T-ERP</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#modules" className="text-sm text-ink-2 hover:text-primary">Modules</a>
          <a href="#tarifs" className="text-sm text-ink-2 hover:text-primary">Tarifs</a>
          <a href="#comparaison" className="text-sm text-ink-2 hover:text-primary">Comparaison</a>
          <a href="#faq" className="text-sm text-ink-2 hover:text-primary">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/cand/login"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-alt"
          >
            Connexion
          </Link>
          <a
            href="#demo"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-brand hover:bg-primary-600"
          >
            Demander une démo
          </a>
        </div>
      </div>
    </header>
  );
}
