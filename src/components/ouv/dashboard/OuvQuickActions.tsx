"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Wallet, Palmtree, ClipboardList, AlertTriangle, Users } from "lucide-react";
import type { OuvDashboard } from "@/hooks/useOuvDashboard";

interface Props {
  leavesRemaining: number;
  newMissionsCount: number;
  teamCount: number;
  chiefFullName: string | null;
}

// 5 cards d'actions rapides empilées (hauteur 76px chacune, tap target XXL).
// Mirror direct des .ouv-card-action du prototype : Paie, Congés, Missions, HSE, Équipe.
// La card Missions affiche un badge rouge si une mission est en attente d'acceptation.
export function OuvQuickActions({ leavesRemaining, newMissionsCount, teamCount, chiefFullName }: Props) {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const actions: Array<{
    href: string;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconFg: string;
    badge?: { count: number; tone: "danger" | "warning" };
  }> = [
    {
      href: "/ouv/paie",
      label: "Ma paie",
      sublabel: "Bulletins + primes + avances",
      icon: Wallet,
      iconBg: "bg-purple-50",
      iconFg: "text-purple-600",
    },
    {
      href: "/ouv/conges",
      label: "Demander congé",
      sublabel: `${Math.round(leavesRemaining)} jours disponibles`,
      icon: Palmtree,
      iconBg: "bg-emerald-50",
      iconFg: "text-emerald-600",
    },
    {
      href: "/ouv/missions",
      label: "Mes ordres de mission",
      sublabel:
        newMissionsCount > 0
          ? `${newMissionsCount} nouvelle${newMissionsCount > 1 ? "s" : ""} mission${newMissionsCount > 1 ? "s" : ""}`
          : "Aucune nouvelle mission",
      icon: ClipboardList,
      iconBg: "bg-blue-50",
      iconFg: "text-blue-700",
      badge:
        newMissionsCount > 0
          ? { count: newMissionsCount, tone: "danger" }
          : undefined,
    },
    {
      href: "/ouv/hse",
      label: "Signaler incident",
      sublabel: "Accident · anomalie · danger",
      icon: AlertTriangle,
      iconBg: "bg-rose-50",
      iconFg: "text-rose-600",
    },
    {
      href: "/ouv/equipe",
      label: "Mon équipe",
      sublabel:
        teamCount > 0
          ? `${teamCount} ouvrier${teamCount > 1 ? "s" : ""}${chiefFullName ? ` · ${chiefFullName} chef` : ""}`
          : "Pas d'équipe affectée",
      icon: Users,
      iconBg: "bg-amber-50",
      iconFg: "text-amber-700",
    },
  ];

  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">Mes actions</h3>
      <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={`/${tenantSlug}${a.href}`}
              className="flex h-[76px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 transition-colors active:border-purple-300 active:bg-purple-50/50"
            >
              <span className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl ${a.iconBg} ${a.iconFg}`}>
                <Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold leading-tight text-slate-900">{a.label}</p>
                <p className="truncate text-[12.5px] text-slate-500">{a.sublabel}</p>
              </div>
              {a.badge ? (
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${
                    a.badge.tone === "danger" ? "bg-rose-600" : "bg-amber-500"
                  }`}
                >
                  {a.badge.count}
                </span>
              ) : (
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" strokeWidth={2} />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Utilitaire de typage exporté pour usage éventuel
export type _DashboardKpis = OuvDashboard["kpis"];
