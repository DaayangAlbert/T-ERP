"use client";

import { ChevronDown, Menu, Search } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/stores/ui-store";
import { Logo } from "./Logo";
import { TenantBadge } from "./TenantBadge";
import { NotificationsBell } from "./NotificationsBell";

interface Props {
  onProfileClick?: () => void;
  onTenantClick?: () => void;
}

export function Header({ onProfileClick, onTenantClick }: Props) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { toggleMobileSidebar } = useUiStore();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center bg-sidebar-bg text-white border-b border-[#1F1230]">
      <button
        onClick={toggleMobileSidebar}
        className="md:hidden grid h-9 w-9 place-items-center mx-2 rounded text-white/70 hover:bg-white/8"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex h-full min-w-0 md:min-w-[220px] items-center gap-2 md:gap-2.5 border-r border-[#1F1230] px-2 md:px-4 flex-shrink min-w-0">
        <Logo className="h-7 w-7 flex-shrink-0" />
        <span className="text-sm font-bold whitespace-nowrap flex-shrink-0">T-ERP</span>
        <TenantBadge tenant={tenant} onClick={onTenantClick} />
      </div>

      <div className="ml-4 hidden flex-1 max-w-[280px] items-center gap-2 rounded bg-white/8 px-3 py-1.5 text-[12px] text-white/65 lg:flex">
        <Search className="h-4 w-4" />
        <span>Rechercher dans T-ERP</span>
        <kbd className="ml-auto rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </div>

      <div className="ml-auto flex items-center gap-1 px-2">
        <NotificationsBell />
      </div>

      {user && (
        <button
          onClick={onProfileClick}
          className="flex h-full items-center gap-2 border-l border-[#1F1230] px-3 hover:bg-white/8"
          aria-label="Changer de profil"
        >
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-[11px] font-semibold text-white">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <span className="hidden text-sm sm:block">
            {user.firstName} {user.lastName}
          </span>
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </header>
  );
}
