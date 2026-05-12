"use client";

import Link from "next/link";
import { AlertOctagon, AlertTriangle, Info, ChevronRight } from "lucide-react";
import type { GedDashboardResponse } from "@/hooks/useGedDashboard";

interface Props {
  alerts: GedDashboardResponse["alerts"];
}

const SEVERITY_STYLE = {
  critical: {
    icon: AlertOctagon,
    container: "border-rose-200 bg-rose-50",
    iconClass: "text-rose-600",
    badge: "bg-rose-100 text-rose-700",
    label: "Critique",
  },
  warning: {
    icon: AlertTriangle,
    container: "border-amber-200 bg-amber-50",
    iconClass: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    label: "Attention",
  },
  info: {
    icon: Info,
    container: "border-blue-200 bg-blue-50",
    iconClass: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    label: "Info",
  },
} as const;

export function DocumentaryAlertsList({ alerts }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-ink">Alertes documentaires</h2>
        <span className="text-[11.5px] text-ink-3">
          {alerts.length} alerte{alerts.length > 1 ? "s" : ""} hiérarchisée{alerts.length > 1 ? "s" : ""}
        </span>
      </header>
      {alerts.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">
          Aucune alerte documentaire active.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {alerts.map((a) => {
            const style = SEVERITY_STYLE[a.severity];
            const Icon = style.icon;
            const Wrapper = a.link ? Link : "div";
            const wrapperProps = a.link ? { href: a.link } : {};
            return (
              <li key={a.id}>
                <Wrapper
                  {...(wrapperProps as { href: string })}
                  className={`flex items-center gap-3 px-4 py-2.5 ${a.link ? "hover:bg-surface-alt" : ""}`}
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.container}`}>
                    <Icon className={`h-4 w-4 ${style.iconClass}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-ink">{a.title}</span>
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{a.detail}</p>
                  </div>
                  {a.link && <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />}
                </Wrapper>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
