"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, BellRing, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface Alert {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  details: string | null;
  link: string | null;
}

const SEVERITY_STYLES = {
  CRITICAL: { bar: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-800", Icon: AlertTriangle },
  HIGH: { bar: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-800", Icon: AlertTriangle },
  MEDIUM: { bar: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-800", Icon: AlertCircle },
  LOW: { bar: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-800", Icon: Info },
} as const;

export function RhAlertsList({ items }: { items: Alert[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-4 text-center text-[12.5px] text-ink-3">
        Aucune alerte RH active.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-white overflow-hidden">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <BellRing className="h-4 w-4 text-primary-600" />
        <h3 className="text-[13px] font-semibold text-ink">Alertes RH</h3>
        <span className="ml-auto rounded-full bg-rose-100 px-2 text-[10.5px] font-semibold text-rose-800">
          {items.length}
        </span>
      </header>
      <ul className="divide-y divide-line">
        {items.map((a) => {
          const style = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.LOW;
          const Icon = style.Icon;
          const Inner = (
            <div className={clsx("flex items-start gap-3 px-3 py-2.5 transition", a.link && "hover:bg-surface-alt cursor-pointer")}>
              <span className={clsx("mt-0.5 h-full w-1 flex-shrink-0 rounded-full", style.bar)} style={{ minHeight: "32px" }} />
              <Icon className={clsx("mt-0.5 h-4 w-4 flex-shrink-0", style.text)} />
              <div className="min-w-0 flex-1">
                <div className={clsx("text-[12.5px] font-semibold", style.text)}>{a.title}</div>
                {a.details && <div className="mt-0.5 text-[11.5px] text-ink-3">{a.details}</div>}
              </div>
              {a.link && <ChevronRight className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-ink-3" />}
            </div>
          );
          return (
            <li key={a.id}>
              {a.link ? <Link href={a.link}>{Inner}</Link> : Inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
