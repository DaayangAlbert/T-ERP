"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

interface Props {
  fullName: string;
  email: string;
  initials: string;
  onMenuClick?: () => void;
}

export function CandidateHeader({ fullName, email, initials, onMenuClick }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/cand/auth/logout", { method: "POST" });
    router.push("/cand/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-[#1F1230] bg-sidebar-bg text-white">
      <button
        type="button"
        onClick={onMenuClick}
        className="grid h-9 w-9 place-items-center mx-2 rounded text-white/70 hover:bg-white/10 md:hidden"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link
        href="/cand/dashboard"
        className="flex h-full min-w-0 items-center gap-2.5 border-r border-[#1F1230] px-3 md:min-w-[220px] md:px-4"
      >
        <Logo className="h-7 w-7 flex-shrink-0" />
        <div className="leading-tight">
          <div className="text-sm font-bold">T-ERP</div>
          <div className="text-[10px] uppercase tracking-wide text-white/60">
            Espace candidat
          </div>
        </div>
      </Link>

      <div className="ml-auto flex items-center gap-2 px-2">
        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="text-sm font-medium text-white">{fullName}</span>
          <span className="text-[11px] text-white/65">{email}</span>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-xs font-semibold text-white shadow-brand">
          {initials}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="grid h-9 w-9 place-items-center rounded text-white/70 hover:bg-white/10"
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
