"use client";

import Link from "next/link";
import { AlertOctagon, AlertTriangle, Info, Gavel, Landmark, Banknote, Scale, Mail, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type { SgDashboardResponse } from "@/hooks/useSgDashboard";

interface Props {
  alerts: SgDashboardResponse["alerts"];
}

const SEVERITY_STYLES = {
  critical: {
    border: "border-rose-300 border-l-rose-500",
    bg: "bg-rose-50/60",
    iconColor: "text-rose-600",
    badgeBg: "bg-rose-100 text-rose-700",
    label: "Critique",
  },
  warning: {
    border: "border-amber-300 border-l-amber-500",
    bg: "bg-amber-50/60",
    iconColor: "text-amber-600",
    badgeBg: "bg-amber-100 text-amber-700",
    label: "Attention",
  },
  info: {
    border: "border-blue-300 border-l-blue-500",
    bg: "bg-blue-50/60",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-100 text-blue-700",
    label: "Info",
  },
} as const;

const ICONS = { AlertOctagon, AlertTriangle, Info, Gavel, Landmark, Banknote, Scale, Mail };

export function PriorityAlertsList({ alerts }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-ink">Alertes prioritaires</h2>
        <span className="text-[11.5px] text-ink-3">
          {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
        </span>
      </header>
      {alerts.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">
          Aucune alerte prioritaire active.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {alerts.map((a) => {
            const style = SEVERITY_STYLES[a.severity];
            const Icon = ICONS[a.icon] ?? AlertTriangle;
            return (
              <li
                key={a.id}
                className={clsx("flex items-start gap-3 border-l-[4px] px-4 py-3 sm:items-center", style.border, style.bg)}
              >
                <Icon className={clsx("mt-0.5 h-4 w-4 shrink-0 sm:h-5 sm:w-5 sm:mt-0", style.iconColor)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-ink">{a.title}</span>
                    <span className={clsx("rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold", style.badgeBg)}>
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">{a.detail}</p>
                </div>
                {a.cta && (
                  <Link
                    href={a.cta.href}
                    className="shrink-0 inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11.5px] font-semibold text-ink hover:bg-surface-alt"
                  >
                    {a.cta.label} <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
