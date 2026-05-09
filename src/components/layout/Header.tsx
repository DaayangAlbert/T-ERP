"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/stores/ui-store";
import { clsx } from "clsx";

export function Header() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { toggleMobileSidebar } = useUiStore();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center bg-sidebar-bg text-white border-b border-[#1F1230]">
      {/* Burger mobile */}
      <button
        onClick={toggleMobileSidebar}
        className="md:hidden grid h-9 w-9 place-items-center mx-2 rounded text-white/70 hover:bg-white/8"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Brand */}
      <div className="flex h-full min-w-[220px] items-center gap-2.5 border-r border-[#1F1230] px-4 flex-shrink-0">
        <Logo className="h-7 w-7 flex-shrink-0" />
        <span className="text-sm font-bold text-white whitespace-nowrap flex-shrink-0">T-ERP</span>
        {tenant && (
          <button
            className="ml-2 flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-[12px] hover:bg-white/15 max-w-[200px]"
            title={tenant.name}
          >
            <span
              className="grid h-5 w-5 flex-shrink-0 place-items-center rounded text-[10px] font-bold text-white"
              style={{ background: tenant.primaryColor || "#0B5FFF" }}
            >
              {tenant.name[0]}
            </span>
            <span className="truncate max-w-[140px]">{tenant.name}</span>
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Notifications */}
      <div className="ml-auto flex items-center gap-1 px-2">
        <button
          className="relative grid h-9 w-9 place-items-center rounded text-white/70 hover:bg-white/8"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
      </div>

      {/* Profil utilisateur */}
      {user && (
        <button
          onClick={() => setProfileOpen(true)}
          className="flex h-full items-center gap-2 border-l border-[#1F1230] px-3 hover:bg-white/8"
        >
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-[11px] font-semibold text-white">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <span className="hidden sm:block text-sm">{user.firstName} {user.lastName}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </header>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-label="T-ERP">
      <defs>
        <linearGradient id="terp-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect fill="url(#terp-logo)" x="6" y="14" width="52" height="11" rx="2" />
      <rect fill="url(#terp-logo)" x="14" y="29" width="36" height="11" rx="2" />
      <rect fill="url(#terp-logo)" x="22" y="44" width="20" height="11" rx="2" />
    </svg>
  );
}
