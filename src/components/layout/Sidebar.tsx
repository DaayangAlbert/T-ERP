"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { ChevronLeft, ChevronDown, Eye } from "lucide-react";
import { clsx } from "clsx";
import { useUiStore } from "@/stores/ui-store";
import { useAuth } from "@/hooks/useAuth";
import { useTenantHref } from "@/hooks/useTenantHref";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { getSidebarSections, type NavSection } from "@/lib/rbac/sidebar-sections";

const COLLAPSED_STORAGE_KEY = "terp-sidebar-collapsed-sections";

/**
 * Sidebar pilotée par la matrice d'accès centrale.
 *
 * La composition (qui voit quelles sections) vit dans
 * `src/lib/rbac/sidebar-sections.ts`. Ici on ne fait que rendu et UX.
 *
 * Comportements responsive :
 *   < md (768)  → drawer mobile (260 px) en overlay, fermé par défaut
 *   md → xl-1   → toujours étendue (220 px) ou compacte (64 px) selon toggle
 *   xl+ (1280)  → respecte le toggle compact utilisateur
 */
export function Sidebar() {
  const pathname = usePathname();
  const tenantHref = useTenantHref();
  const { sidebarCompact, toggleSidebarCompact, mobileSidebarOpen, closeMobileSidebar } = useUiStore();
  const { user } = useAuth();

  const sections: NavSection[] = getSidebarSections(user?.role as Role | undefined);
  const badgeOverrides = useSidebarBadges();

  // SSR-safe: assume widescreen until client measures
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setWindowWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = windowWidth !== null && windowWidth < 768;
  const visualCompact = !isMobile && sidebarCompact;

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileSidebarOpen) closeMobileSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // État collapse par section (persisté en localStorage). Par défaut tout
  // est ouvert ; l'utilisateur peut replier des sections pour réduire la
  // hauteur de la sidebar.
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (raw) setCollapsedSections(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage may be unavailable in private mode
      }
      return next;
    });
  };

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
          "fixed inset-y-0 left-0 top-14 h-[calc(100vh-3.5rem)] w-[260px]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:sticky md:top-14 md:translate-x-0 md:h-[calc(100vh-3.5rem)]",
          sidebarCompact ? "md:w-16" : "md:w-[220px]"
        )}
        aria-label="Navigation principale"
      >
        {/* Toggle disponible dès md+ */}
        <div
          className={clsx(
            "hidden items-center border-b border-white/8 py-1.5 px-2.5 md:flex",
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

        {sections.map((section) => {
          // Collapsible activé uniquement quand le titre est visible
          // (mode non compact). En compact ou avant hydratation, la
          // section reste développée.
          const collapsible = !visualCompact && hydrated;
          const isCollapsed = collapsible && collapsedSections[section.title] === true;

          return (
          <div key={section.title}>
            {visualCompact ? (
              <div
                className="mt-2 border-t border-white/8 first:mt-0 first:border-t-0"
                aria-label={section.title}
              />
            ) : (
              <button
                type="button"
                onClick={() => collapsible && toggleSection(section.title)}
                disabled={!collapsible}
                aria-expanded={!isCollapsed}
                className={clsx(
                  "flex w-full items-center gap-1 px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[.1em] transition-colors",
                  section.readOnly ? "text-amber-300/70" : "text-white/45",
                  collapsible && "cursor-pointer hover:text-white/80",
                )}
              >
                {section.readOnly && <Eye className="h-3 w-3" aria-hidden />}
                <span className="flex-1 text-left">{section.title}</span>
                {collapsible && (
                  <ChevronDown
                    className={clsx(
                      "h-3 w-3 transition-transform duration-150",
                      isCollapsed && "-rotate-90",
                    )}
                    aria-hidden
                  />
                )}
              </button>
            )}
            {!isCollapsed && section.items.map((item) => {
              const href = tenantHref(item.href);
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const Icon = item.icon;
              const override = badgeOverrides[item.href];
              const effectiveBadge = override !== undefined ? override : item.badge;
              return (
                <Link
                  key={item.href}
                  href={href}
                  title={visualCompact ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "group relative flex items-center gap-2.5 px-4 py-1.5 text-[13px]",
                    "border-l-[3px] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-inset",
                    active
                      ? "border-primary-500 bg-white/8 font-medium text-white"
                      : "border-transparent text-white/78 hover:bg-white/8 hover:text-white",
                    visualCompact && "justify-center px-0 py-2.5",
                    section.readOnly && !active && "opacity-80"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 opacity-85" />
                  {!visualCompact && <span className="flex-1 truncate">{item.label}</span>}
                  {effectiveBadge && (
                    <span
                      className={clsx(
                        "rounded-full px-1.5 text-[10px] font-semibold",
                        visualCompact && "absolute right-2 top-1 px-1 text-[9px]",
                        effectiveBadge.alert
                          ? "bg-red-500 text-white"
                          : "bg-white/10 text-white/85"
                      )}
                    >
                      {effectiveBadge.value}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          );
        })}
      </aside>
    </>
  );
}
