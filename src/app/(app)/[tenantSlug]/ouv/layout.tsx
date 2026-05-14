"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { useAuth } from "@/hooks/useAuth";
import { OuvBottomNav } from "@/components/ouv/layout/OuvBottomNav";

// Espace OUV : exclusivement WORKER (ouvriers de base BTP).
// Mobile-first 414px · PWA installable · offline-first · tap targets XXL
// 60-72px (mains gantées). Les chefs d'équipe (teamLeader: true) ont aussi
// accès, ils voient un onglet supplémentaire dans /ouv/equipe (fn 1.7).
const ALLOWED_ROLES = ["WORKER"];

export default function OuvLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

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
        className="ouv-shell min-h-[100dvh] bg-[#FAFAF7] pb-[88px] lg:pb-0"
      >
        {children}
        <OuvBottomNav />
      </div>
    </>
  );
}
