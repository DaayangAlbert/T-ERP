"use client";

import { useState } from "react";
import { Crown, UserCheck, AlertTriangle, UserMinus } from "lucide-react";
import { useSuccessionPlan } from "@/hooks/useHr";
import { SuccessionStatus } from "@prisma/client";
import { clsx } from "clsx";

const STATUS_BADGE: Record<SuccessionStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  IDENTIFIED: { label: "Successeur identifié", cls: "bg-success/10 text-success", icon: <UserCheck className="h-3 w-3" /> },
  AT_RISK: { label: "À risque", cls: "bg-warning/10 text-warning", icon: <AlertTriangle className="h-3 w-3" /> },
  NONE: { label: "Non prévu", cls: "bg-danger/10 text-danger", icon: <UserMinus className="h-3 w-3" /> },
  READY_NOW: { label: "Prêt maintenant", cls: "bg-primary-100 text-primary-700", icon: <Crown className="h-3 w-3" /> },
};

export function SuccessionOrgChart() {
  const { data, isLoading } = useSuccessionPlan();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const counts = {
    IDENTIFIED: data.items.filter((p) => p.status === "IDENTIFIED").length,
    AT_RISK: data.items.filter((p) => p.status === "AT_RISK").length,
    NONE: data.items.filter((p) => p.status === "NONE").length,
    READY_NOW: data.items.filter((p) => p.status === "READY_NOW").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Successeurs identifiés" value={counts.IDENTIFIED} cls="border-success/30 bg-success/5 text-success" />
        <Stat label="Prêts maintenant" value={counts.READY_NOW} cls="border-primary-200 bg-primary-50 text-primary-700" />
        <Stat label="Postes à risque" value={counts.AT_RISK} cls="border-warning/30 bg-warning/5 text-warning" />
        <Stat label="Postes non couverts" value={counts.NONE} cls="border-danger/30 bg-danger/5 text-danger" />
      </div>

      <ul className="space-y-2">
        {data.items.map((p) => {
          const badge = STATUS_BADGE[p.status];
          const expanded = expandedId === p.id;
          return (
            <li key={p.id} className="rounded-xl border border-line bg-white shadow-card">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : p.id)}
                className="flex w-full items-start gap-3 p-4 text-left hover:bg-surface-alt"
              >
                <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 font-semibold">
                  {p.incumbent.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-primary-700">
                    {p.positionTitle}
                  </div>
                  <div className="mt-0.5 text-[14px] font-semibold text-ink">{p.incumbent.name}</div>
                  <div className="text-[11.5px] text-ink-3">
                    Ancienneté {p.incumbent.seniority} an{p.incumbent.seniority > 1 ? "s" : ""}
                  </div>
                </div>
                <span className={clsx("inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold", badge.cls)}>
                  {badge.icon} {badge.label}
                </span>
              </button>
              {expanded && (
                <div className="border-t border-line bg-surface-alt p-4 text-[12.5px]">
                  {p.successor ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Successeur identifié</div>
                      <div className="mt-1 font-medium text-ink">{p.successor.name}</div>
                      {p.successor.position && <div className="text-[11.5px] text-ink-3">{p.successor.position}</div>}
                      {p.readyInMonths !== null && p.readyInMonths !== undefined && (
                        <div className="mt-1 text-[12px] text-ink-2">
                          Prêt dans <strong>{p.readyInMonths}</strong> mois
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-ink-3">
                      Aucun successeur identifié.{" "}
                      <button type="button" className="text-primary-700 hover:underline">
                        Définir un successeur
                      </button>
                    </div>
                  )}
                  {p.notes && (
                    <p className="mt-3 rounded-md border border-line bg-white px-3 py-2 italic text-ink-2">
                      « {p.notes} »
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={clsx("rounded-lg border p-3 shadow-card", cls)}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 font-mono text-[20px] font-bold">{value}</div>
    </div>
  );
}
