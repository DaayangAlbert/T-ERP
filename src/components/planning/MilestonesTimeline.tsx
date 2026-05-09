"use client";

import { useState } from "react";
import { Square, Diamond, Circle, Building2, Calendar, Banknote, Briefcase } from "lucide-react";
import { useMilestones } from "@/hooks/usePlanning";
import { formatDate } from "@/lib/format";
import { MilestoneType, MilestoneStatus } from "@prisma/client";
import { clsx } from "clsx";

const TYPE_LABEL: Record<MilestoneType, string> = {
  SITE_START: "Lancement chantier",
  SITE_DELIVERY: "Réception chantier",
  MILESTONE: "Jalon majeur",
  FINANCIAL: "Échéance fiscale",
  COMMERCIAL: "Échéance commerciale",
  INTERNAL: "Événement interne",
};

const TYPE_ICON: Record<MilestoneType, React.ReactNode> = {
  SITE_START: <Building2 className="h-3 w-3" />,
  SITE_DELIVERY: <Square className="h-3 w-3" />,
  MILESTONE: <Diamond className="h-3 w-3" />,
  FINANCIAL: <Banknote className="h-3 w-3" />,
  COMMERCIAL: <Briefcase className="h-3 w-3" />,
  INTERNAL: <Circle className="h-3 w-3" />,
};

const TYPE_COLOR: Record<MilestoneType, string> = {
  SITE_START: "bg-primary-500 text-white",
  SITE_DELIVERY: "bg-success text-white",
  MILESTONE: "bg-info text-white",
  FINANCIAL: "bg-warning text-white",
  COMMERCIAL: "bg-info/80 text-white",
  INTERNAL: "bg-ink-3 text-white",
};

const STATUS_BADGE: Record<MilestoneStatus, string> = {
  PLANNED: "bg-info/10 text-info",
  IN_PROGRESS: "bg-warning/10 text-warning",
  DONE: "bg-success/10 text-success",
  DELAYED: "bg-danger/10 text-danger",
  CANCELLED: "bg-ink-3/10 text-ink-3",
};

export function MilestonesTimeline() {
  const [filter, setFilter] = useState<string>("");
  const { data, isLoading } = useMilestones({ type: filter || undefined });

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  // Calcul plage 12 mois
  const now = Date.now();
  const minDate = now - 30 * 86_400_000;
  const maxDate = now + 365 * 86_400_000;
  const span = maxDate - minDate;

  const items = data.items.filter((m) => {
    const t = new Date(m.date).getTime();
    return t >= minDate && t <= maxDate;
  });

  const months = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(minDate);
    d.setMonth(d.getMonth() + i);
    return d;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <Calendar className="h-4 w-4 text-ink-3" />
        <span className="text-[12.5px] text-ink-3">Filtrer par type :</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 rounded-md border border-line bg-white px-2 text-[12px]"
        >
          <option value="">Tous</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="ml-auto text-[11px] text-ink-3">{items.length} jalon{items.length > 1 ? "s" : ""}</span>
      </div>

      {/* Frise horizontale */}
      <div className="rounded-xl border border-line bg-white p-4 shadow-card">
        <div className="relative h-32 overflow-x-auto">
          <div className="relative" style={{ minWidth: 1080 }}>
            {/* Axe + mois */}
            <div className="absolute left-0 right-0 top-1/2 h-px bg-line-2" />
            <div className="grid grid-cols-12 pt-12 text-[10.5px] text-ink-3">
              {months.slice(0, 12).map((m, i) => (
                <div key={i} className="text-center">
                  {m.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}
                </div>
              ))}
            </div>
            {/* Jalons */}
            {items.map((m) => {
              const t = new Date(m.date).getTime();
              const left = ((t - minDate) / span) * 100;
              const above = items.filter((x) => Math.abs(new Date(x.date).getTime() - t) < 5 * 86_400_000).indexOf(m) % 2 === 0;
              return (
                <div
                  key={m.id}
                  className="absolute top-1/2"
                  style={{ left: `${left}%`, transform: "translate(-50%, -50%)" }}
                  title={`${m.title} · ${formatDate(m.date)}`}
                >
                  <div className={clsx("grid h-6 w-6 place-items-center rounded-full shadow-card", TYPE_COLOR[m.type])}>
                    {TYPE_ICON[m.type]}
                  </div>
                  <div
                    className={clsx(
                      "absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[10px] shadow-sm border border-line",
                      above ? "bottom-full mb-2" : "top-full mt-2"
                    )}
                  >
                    {m.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Liste détaillée */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Date</th>
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Jalon</th>
              <th className="py-2 pr-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-t border-line hover:bg-surface-alt">
                <td className="py-2 pl-3 font-mono text-[11.5px]">{formatDate(m.date)}</td>
                <td className="py-2">
                  <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold", TYPE_COLOR[m.type])}>
                    {TYPE_ICON[m.type]} {TYPE_LABEL[m.type]}
                  </span>
                </td>
                <td className="py-2 text-ink">
                  {m.critical && <span className="mr-1 text-danger">●</span>}
                  {m.title}
                </td>
                <td className="py-2 pr-3 text-center">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_BADGE[m.status])}>
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
