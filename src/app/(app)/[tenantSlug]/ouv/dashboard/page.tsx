"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Construction, Clock, Wallet, ClipboardList, Shield, Users, UserCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Page placeholder : la version complète (mirror `screen-ouv-dashboard` du
// prototype avec bouton héros de pointage, mini-KPIs, bandeau d'affectation,
// liste actions rapides, etc.) sera livrée dans le prompt 1.1.

export default function OuvDashboardPlaceholder() {
  const { user } = useAuth();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const initials = user ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}` : "??";

  return (
    <main className="page mx-auto w-full max-w-screen-sm px-3 pt-3">
      {/* Bandeau identité (placeholder) */}
      <header className="rounded-xl bg-gradient-to-br from-purple-700 via-purple-600 to-fuchsia-500 px-4 py-4 text-white shadow">
        <div className="flex items-center gap-3">
          <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-white/15 text-base font-semibold">
            {initials.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] opacity-80">Bonjour</p>
            <p className="truncate text-lg font-semibold">
              {user ? `${user.firstName} ${user.lastName}` : "Ouvrier"}
            </p>
            <p className="text-[12px] opacity-90">
              {user?.position ?? "Ouvrier BTP"}
            </p>
          </div>
        </div>
      </header>

      {/* Notice bootstrap Bloc 0 */}
      <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <Construction className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Bootstrap Bloc 0 Ouvrier activé.</p>
            <p className="mt-1 text-[12.5px]">
              Les 8 fonctions (Dashboard, Pointage, Paie, Congés, Missions, HSE,
              Équipe, EPI/Profil) seront livrées dans les prompts 1.1 à 1.8 en
              respectant le prototype <code>screen-ouv-*</code>.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation provisoire vers les 8 fonctions */}
      <nav className="mt-4 grid grid-cols-2 gap-2.5">
        {[
          { href: "/ouv/pointage", label: "Pointer", icon: Clock, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { href: "/ouv/paie", label: "Ma paie", icon: Wallet, color: "text-purple-600 bg-purple-50 border-purple-100" },
          { href: "/ouv/conges", label: "Mes congés", icon: ClipboardList, color: "text-amber-700 bg-amber-50 border-amber-100" },
          { href: "/ouv/missions", label: "Missions", icon: ClipboardList, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { href: "/ouv/hse", label: "HSE", icon: Shield, color: "text-rose-600 bg-rose-50 border-rose-100" },
          { href: "/ouv/equipe", label: "Mon équipe", icon: Users, color: "text-teal-600 bg-teal-50 border-teal-100" },
          { href: "/ouv/outils", label: "EPI / outils", icon: Construction, color: "text-orange-600 bg-orange-50 border-orange-100" },
          { href: "/ouv/profil", label: "Mon profil", icon: UserCircle, color: "text-slate-700 bg-slate-100 border-slate-200" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={`/${tenantSlug}${item.href}`}
              className={`flex h-[76px] flex-col items-start justify-center gap-1 rounded-xl border px-3 text-sm font-semibold ${item.color}`}
            >
              <Icon className="h-6 w-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
