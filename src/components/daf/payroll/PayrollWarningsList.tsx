"use client";

import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

interface Warning {
  severity: "OK" | "WARNING" | "INFO";
  type: string;
  message: string;
  count?: number;
}

const SEV_CONFIG: Record<Warning["severity"], { icon: React.ReactNode; cls: string; bar: string }> = {
  OK: { icon: <CheckCircle2 className="h-4 w-4" />, cls: "border-success/30 bg-success/5 text-success", bar: "bg-success" },
  WARNING: { icon: <AlertTriangle className="h-4 w-4" />, cls: "border-warning/30 bg-warning/5 text-warning", bar: "bg-warning" },
  INFO: { icon: <Info className="h-4 w-4" />, cls: "border-info/30 bg-info/5 text-info", bar: "bg-info" },
};

export function PayrollWarningsList({ warnings }: { warnings: Warning[] }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Points d'attention avant validation N2
      </h3>
      {warnings.length === 0 ? (
        <p className="text-[12.5px] text-ink-3">Aucune alerte. Cycle prêt à valider.</p>
      ) : (
        <ul className="space-y-2">
          {warnings.map((w, i) => {
            const cfg = SEV_CONFIG[w.severity];
            return (
              <li
                key={i}
                className={clsx("flex items-start gap-3 overflow-hidden rounded-lg border-l-4 p-3", cfg.cls)}
                style={{ borderLeftColor: undefined }}
              >
                <span className="mt-0.5">{cfg.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider opacity-80">
                    {w.type.replace(/_/g, " ")}
                    {w.count != null && ` · ${w.count}`}
                  </div>
                  <p className="mt-0.5 text-[13px] text-ink-2">{w.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
