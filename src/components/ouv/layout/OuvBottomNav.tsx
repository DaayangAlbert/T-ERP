"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Home, Clock, Wallet, ClipboardList, User } from "lucide-react";
import { clsx } from "clsx";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/ouv/dashboard", label: "Accueil", icon: Home },
  { href: "/ouv/pointage", label: "Pointer", icon: Clock },
  { href: "/ouv/paie", label: "Paie", icon: Wallet },
  { href: "/ouv/missions", label: "Missions", icon: ClipboardList },
  { href: "/ouv/profil", label: "Profil", icon: User },
];

// Bottom nav fixe — 5 tabs comme dans screen-ouv-dashboard du prototype.
// Hauteur 68px (tap target XXL), respecte la safe area iOS notch.
// Visible mobile/tablette, masquée sur desktop ≥ 1024px (la sidebar prend le relais).
export function OuvBottomNav() {
  const params = useParams<{ tenantSlug: string }>();
  const pathname = usePathname();
  const tenantSlug = params?.tenantSlug ?? "";

  return (
    <nav
      className="ouv-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      {NAV_ITEMS.map((item) => {
        const fullHref = `/${tenantSlug}${item.href}`;
        const isActive = pathname?.startsWith(fullHref) ?? false;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={fullHref}
            className={clsx(
              "flex h-[68px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              isActive ? "text-purple-600" : "text-slate-500"
            )}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className={clsx("h-[22px] w-[22px]", isActive && "stroke-purple-600")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
