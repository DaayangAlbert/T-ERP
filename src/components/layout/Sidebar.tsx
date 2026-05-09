"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUiStore } from "@/stores/ui-store";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  BarChart3,
  CheckCircle2,
  Building2,
  Calendar,
  Wallet,
  FileText,
  Users,
  ShoppingCart,
  Package,
  Settings,
  Shield,
  User,
  CreditCard,
  MessageSquare,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: { value: string; alert?: boolean };
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { label: "Rapports consolidés", href: "/rapports", icon: BarChart3 },
      { label: "Mes validations", href: "/validations", icon: CheckCircle2, badge: { value: "7", alert: true } },
    ],
  },
  {
    title: "Activité",
    items: [
      { label: "Chantiers", href: "/chantiers", icon: Building2, badge: { value: "23" } },
      { label: "Planning", href: "/planning", icon: Calendar },
      { label: "Finances", href: "/finances", icon: Wallet },
      { label: "Comptabilité", href: "/comptabilite", icon: FileText },
      { label: "Ressources humaines", href: "/rh", icon: Users },
      { label: "Achats", href: "/achats", icon: ShoppingCart },
      { label: "Stocks & matériel", href: "/stocks", icon: Package },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Configuration", href: "/configuration", icon: Settings },
      { label: "Sécurité & rôles", href: "/securite", icon: Shield },
    ],
  },
  {
    title: "Mon espace",
    items: [
      { label: "Mon profil", href: "/profil", icon: User },
      { label: "Ma paie", href: "/paie", icon: CreditCard },
      { label: "Messagerie", href: "/messagerie", icon: MessageSquare, badge: { value: "3" } },
    ],
  },
];

/**
 * Effective sidebar width:
 *   < md (768)  → mobile drawer (260px) overlaying content, hidden by default
 *   md to xl-1  → always compact (64px), no toggle
 *   xl+ (1280)  → respects sidebarCompact toggle
 */
export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCompact, toggleSidebarCompact, mobileSidebarOpen, closeMobileSidebar } = useUiStore();

  // SSR-safe: assume widescreen until client measures
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setWindowWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = windowWidth !== null && windowWidth < 768;
  const isWide = windowWidth === null || windowWidth >= 1280;
  const visualCompact = !isMobile && (!isWide || sidebarCompact);

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileSidebarOpen) closeMobileSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={clsx(
          "fixed inset-0 top-14 z-30 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeMobileSidebar}
        aria-hidden
      />

      <aside
        className={clsx(
          "z-40 overflow-y-auto overflow-x-hidden bg-sidebar-bg text-sidebar-text border-r border-[#1F1230]",
          "transition-[width,transform] duration-200",
          // Mobile: fixed drawer
          "fixed inset-y-0 left-0 top-14 h-[calc(100vh-3.5rem)] w-[260px]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          // md+ : sticky, never translated
          "md:sticky md:top-14 md:translate-x-0 md:h-[calc(100vh-3.5rem)]",
          // md to xl: always compact 64px
          "md:w-16",
          // xl+: respect toggle
          sidebarCompact ? "xl:w-16" : "xl:w-[220px]"
        )}
        aria-label="Navigation principale"
      >
        {/* Toggle (desktop only — useless on tablet auto-compact) */}
        <div
          className={clsx(
            "hidden items-center border-b border-white/8 py-1.5 px-2.5 xl:flex",
            sidebarCompact && "justify-center px-0"
          )}
        >
          <button
            onClick={toggleSidebarCompact}
            className="ml-auto grid h-7 w-7 place-items-center rounded text-white/50 hover:bg-white/8 hover:text-white"
            aria-label="Réduire/étendre"
          >
            <ChevronLeft
              className={clsx("h-4 w-4 transition-transform", sidebarCompact && "rotate-180")}
            />
          </button>
        </div>

        {NAV.map((section) => (
          <div key={section.title}>
            <div
              className={clsx(
                "px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45",
                visualCompact &&
                  "border-t border-white/8 mt-2 pt-2 text-transparent text-[0px] px-0 first:border-t-0 first:mt-0"
              )}
            >
              {section.title}
            </div>
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={visualCompact ? item.label : undefined}
                  className={clsx(
                    "group relative flex items-center gap-2.5 px-4 py-1.5 text-[13px]",
                    "border-l-[3px] transition-colors",
                    active
                      ? "border-primary-500 bg-white/8 font-medium text-white"
                      : "border-transparent text-white/78 hover:bg-white/8 hover:text-white",
                    visualCompact && "justify-center px-0 py-2.5"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 opacity-85" />
                  {!visualCompact && <span className="flex-1 truncate">{item.label}</span>}
                  {item.badge && (
                    <span
                      className={clsx(
                        "rounded-full px-1.5 text-[10px] font-semibold",
                        visualCompact && "absolute right-2 top-1 px-1 text-[9px]",
                        item.badge.alert
                          ? "bg-red-500 text-white"
                          : "bg-white/10 text-white/85"
                      )}
                    >
                      {item.badge.value}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </aside>
    </>
  );
}
