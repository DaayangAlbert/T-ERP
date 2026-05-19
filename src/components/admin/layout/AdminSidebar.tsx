"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Building2,
  Receipt,
  Settings,
  Activity,
  ShieldCheck,
  LogOut,
  type LucideIcon,
} from "lucide-react";

interface Entry {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ENTRIES: Entry[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/billing", label: "Facturation", icon: Receipt },
  { href: "/admin/platform", label: "Plateforme", icon: Settings },
  { href: "/admin/monitoring", label: "Monitoring", icon: Activity },
  { href: "/admin/audit", label: "Audit & sécurité", icon: ShieldCheck },
];

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    // Auth unifiée : retour à la landing (modale de login accessible via bouton Connexion)
    window.location.href = "/";
  }
  return (
    <aside
      className="hidden w-60 shrink-0 flex-col border-r md:flex"
      style={{ background: "#0B1322", borderColor: "#1E293B" }}
    >
      <nav className="flex flex-1 flex-col gap-1 p-2">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-300/60">
          Console plateforme
        </p>
        {ENTRIES.map((e) => {
          const Icon = e.icon;
          const active =
            pathname === e.href ||
            (e.href !== "/admin" && pathname.startsWith(e.href));
          return (
            <Link
              key={e.href}
              href={e.href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-cyan-400/10 font-medium text-cyan-300"
                  : "text-white/75 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate">{e.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3" style={{ borderColor: "#1E293B" }}>
        <p className="truncate text-xs text-white/60">{adminName}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-2 inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200"
        >
          <LogOut className="h-3 w-3" /> Déconnexion
        </button>
      </div>
    </aside>
  );
}
