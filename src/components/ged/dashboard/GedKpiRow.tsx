"use client";

import { FileText, ClipboardCheck, Tags, AlertTriangle, Mail } from "lucide-react";
import Link from "next/link";
import type { GedDashboardResponse } from "@/hooks/useGedDashboard";
import { useTenantHref } from "@/hooks/useTenantHref";

interface Props {
  kpis: GedDashboardResponse["kpis"];
}

export function GedKpiRow({ kpis }: Props) {
  const indexationOk = kpis.indexationRate >= kpis.indexationTarget;
  const tenantHref = useTenantHref();

  const cards = [
    {
      label: "Documents actifs",
      value: kpis.activeDocuments.toLocaleString("fr-FR"),
      sub: undefined,
      icon: FileText,
      tone: "violet" as const,
      href: undefined as string | undefined,
    },
    {
      label: "À valider",
      value: kpis.pendingValidation.toString(),
      sub: kpis.pendingValidation > 0 ? "workflows en cours" : "aucun",
      icon: ClipboardCheck,
      tone: kpis.pendingValidation > 5 ? ("amber" as const) : ("slate" as const),
      href: undefined,
    },
    {
      label: "Taux indexation",
      value: `${kpis.indexationRate} %`,
      sub: `cible ${kpis.indexationTarget} %`,
      icon: Tags,
      tone: indexationOk ? ("emerald" as const) : ("amber" as const),
      href: undefined,
    },
    {
      label: "Courriers en attente",
      value: kpis.correspondencesPending.toString(),
      sub:
        kpis.correspondencesArchivedYtd > 0
          ? `${kpis.correspondencesArchivedYtd} archivé(s) YTD`
          : "aucun archivé YTD",
      icon: Mail,
      tone: kpis.correspondencesPending >= 5 ? ("amber" as const) : ("blue" as const),
      href: tenantHref("/secretaire-general/courriers"),
    },
    {
      label: "Alertes conformité",
      value: kpis.complianceAlerts.toString(),
      sub: kpis.criticalAlertsCount > 0 ? `dont ${kpis.criticalAlertsCount} critique(s)` : undefined,
      icon: AlertTriangle,
      tone: kpis.criticalAlertsCount > 0 ? ("rose" as const) : kpis.complianceAlerts > 0 ? ("amber" as const) : ("slate" as const),
      href: undefined,
    },
  ];

  const toneClasses: Record<string, string> = {
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        const inner = (
          <>
            <div className={`grid h-10 w-10 place-items-center rounded-lg border ${toneClasses[c.tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-bold leading-none tracking-tight text-ink">{c.value}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">{c.label}</div>
              {c.sub && <div className="text-[11px] text-ink-3/80">{c.sub}</div>}
            </div>
          </>
        );
        return c.href ? (
          <Link
            key={c.label}
            href={c.href}
            className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 transition hover:border-violet-300 hover:shadow-sm"
          >
            {inner}
          </Link>
        ) : (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
