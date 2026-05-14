"use client";

import { useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import Head from "next/head";
import { Home, Clock, Wallet, ClipboardList, User } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/hooks/useAuth";

// Espace OUV : exclusivement WORKER (ouvriers de base BTP).
// Mobile-first 414px · PWA installable · offline-first · tap targets XXL
// 60-72px (mains gantées). Les chefs d'équipe (teamLeader: true) ont aussi
// accès, ils voient un onglet supplémentaire dans /ouv/equipe (fn 1.7).
const ALLOWED_ROLES = ["WORKER"];

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

export default function OuvLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  // Service worker offline-first (pointage, paie, missions, congés cache)
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-ouv.js", { scope: "/" })
        .catch((err) => console.warn("[OUV] SW registration failed:", err));
    }
  }, []);

  // RBAC : seuls les WORKER accèdent à /ouv
  useEffect(() => {
    if (user && !ALLOWED_ROLES.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user && !ALLOWED_ROLES.includes(user.role)) return null;

  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest-ouv.json" />
        <meta name="theme-color" content="#A855F7" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="T-ERP" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <div
        data-ouv-screen
        data-rh-screen
        className="ouv-shell min-h-[100dvh] bg-[#FAFAF7] pb-[88px]"
      >
        {children}
        <BottomNav tenantSlug={tenantSlug} pathname={pathname} />
      </div>
    </>
  );
}

function BottomNav({ tenantSlug, pathname }: { tenantSlug: string; pathname: string | null }) {
  return (
    <nav
      className="ouv-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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
              "flex h-[68px] flex-col items-center justify-center gap-1 text-[11px] font-medium",
              isActive ? "text-purple-600" : "text-slate-500"
            )}
            aria-label={item.label}
          >
            <Icon className={clsx("h-6 w-6", isActive && "stroke-purple-600")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
