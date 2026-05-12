"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  User,
  ClipboardList,
  CalendarClock,
  Sparkles,
  Search,
  type LucideIcon,
} from "lucide-react";

interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: { value: string; alert?: boolean };
}

interface NavSection {
  title: string;
  items: NavEntry[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Espace candidat",
    items: [
      { href: "/cand/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/cand/profil", label: "Mon profil · CV", icon: User },
      { href: "/cand/candidatures", label: "Mes candidatures", icon: ClipboardList },
      {
        href: "/cand/entretiens",
        label: "Mes entretiens",
        icon: CalendarClock,
      },
      { href: "/cand/offres", label: "Offres recommandées", icon: Sparkles },
    ],
  },
  {
    title: "Public",
    items: [{ href: "/", label: "Toutes les offres", icon: Search }],
  },
];

export function CandidateSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar-bg text-white/85 md:flex">
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-2">
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              {section.title}
            </p>
            {section.items.map((entry) => {
              const Icon = entry.icon;
              const active =
                pathname === entry.href ||
                (entry.href !== "/" && pathname.startsWith(`${entry.href}/`));
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/10 font-medium text-white"
                      : "text-white/75 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{entry.label}</span>
                  {entry.badge ? (
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        entry.badge.alert
                          ? "bg-amber-500 text-white"
                          : "bg-white/15 text-white",
                      )}
                    >
                      {entry.badge.value}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
