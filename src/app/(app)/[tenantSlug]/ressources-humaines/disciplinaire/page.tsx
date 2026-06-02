"use client";

import { useState } from "react";
import { Shield, ShieldAlert, Users2, History, Gavel, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useDisciplinary, type DisciplinaryCase } from "@/hooks/useRhDisciplinary";
import { PageHelp } from "@/components/help/PageHelp";
import { RhDisciplinaireTutorial } from "@/components/help/tutorials/RhDisciplinaireTutorial";

type Tab = "active" | "history" | "negotiated" | "collective";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "active", label: "Procédures actives", icon: <Shield className="h-3.5 w-3.5" /> },
  { key: "history", label: "Historique sanctions", icon: <History className="h-3.5 w-3.5" /> },
  { key: "negotiated", label: "Départs négociés", icon: <Users2 className="h-3.5 w-3.5" /> },
  { key: "collective", label: "Conflits collectifs", icon: <Gavel className="h-3.5 w-3.5" /> },
];

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function severityClasses(s: string): string {
  if (s === "CRITICAL") return "bg-rose-100 text-rose-800";
  if (s === "MAJOR") return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
}

function stageClasses(s: string): string {
  if (s === "CLOSED") return "bg-emerald-100 text-emerald-800";
  if (s === "SANCTION_DECIDED") return "bg-primary-100 text-primary-800";
  if (s === "APPEALED") return "bg-amber-100 text-amber-800";
  return "bg-surface-alt text-ink-3";
}

export default function DisciplinairePage() {
  const [tab, setTab] = useState<Tab>("active");
  const { data, isLoading } = useDisciplinary(tab === "collective" ? "active" : tab);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Procédures disciplinaires et conflits sociaux</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Données sensibles · accès RH uniquement · journalisé en audit.
          </p>
        </div>
        <PageHelp title="Aide — Disciplinaire & conflits"><RhDisciplinaireTutorial /></PageHelp>
      </header>

      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Shield className="h-4 w-4 text-primary-600" />} label="Procédures en cours" value={String(data?.summary.activeCases ?? 0)} hint="Toutes étapes confondues" />
        <Kpi icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} label="Avertissements 12 m" value={String(data?.summary.warningsLast12m ?? 0)} hint="Premier niveau" />
        <Kpi icon={<Gavel className="h-4 w-4 text-rose-600" />} label="Conseils de discipline" value={String(data?.summary.disciplinaryCouncils ?? 0)} hint="Fautes lourdes" alert={(data?.summary.disciplinaryCouncils ?? 0) > 0} />
        <Kpi icon={<Users2 className="h-4 w-4 text-blue-600" />} label="Départs négociés en cours" value={String(data?.summary.negotiatedDepartures ?? 0)} hint="Procédure amiable" />
      </div>

      <div className="-mx-3 overflow-x-auto px-3">
        <div className="inline-flex gap-1 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition",
                tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
              )}
            >
              {t.icon}
              {t.label}
              {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      ) : tab === "collective" ? (
        <CollectivePlaceholder />
      ) : (
        <CasesList items={data.items} />
      )}
    </div>
  );
}

function Kpi({ icon, label, value, hint, alert }: { icon: React.ReactNode; label: string; value: string; hint: string; alert?: boolean }) {
  return (
    <div className={clsx("rounded-xl border bg-white p-3 shadow-card min-w-0", alert ? "border-rose-200 bg-rose-50" : "border-line")}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className={clsx("mt-1 font-mono text-[18px] font-bold sm:text-[20px]", alert ? "text-rose-700" : "text-ink")}>{value}</div>
      <div className="mt-0.5 truncate text-[11px] text-ink-3">{hint}</div>
    </div>
  );
}

function CasesList({ items }: { items: DisciplinaryCase[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
        Aucune procédure à afficher.
      </div>
    );
  }
  return (
    <>
      {/* Desktop : table */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Employé</th>
              <th className="px-3 py-2 text-left">Motif</th>
              <th className="px-3 py-2 text-left">Gravité</th>
              <th className="px-3 py-2 text-left">Étape</th>
              <th className="px-3 py-2 text-left">Sanction</th>
              <th className="px-3 py-2 text-left">Ouverte le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((c) => (
              <tr key={c.id} className={clsx("hover:bg-surface-alt/40", c.severity === "CRITICAL" && "bg-rose-50/40")}>
                <td className="px-3 py-2 font-medium text-ink">{c.employeeName}</td>
                <td className="px-3 py-2 text-[12px] text-ink max-w-[280px]">
                  <div>{c.reason}</div>
                  <div className="mt-0.5 text-[10.5px] italic text-ink-3 truncate">{c.facts}</div>
                </td>
                <td className="px-3 py-2">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", severityClasses(c.severity))}>
                    {c.severityLabel}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", stageClasses(c.stage))}>
                    {c.stageLabel}
                  </span>
                </td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{c.sanctionLabel ?? "—"}</td>
                <td className="px-3 py-2 text-[11.5px] text-ink-3">{fmtDate(c.openedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile : cards */}
      <ul className="space-y-2 md:hidden">
        {items.map((c) => (
          <li key={c.id} className={clsx("rounded-xl border p-3", c.severity === "CRITICAL" ? "border-rose-200 bg-rose-50" : "border-line bg-white")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink">{c.employeeName}</div>
                <div className="text-[12px] text-ink">{c.reason}</div>
                <div className="mt-1 text-[11px] italic text-ink-3">{c.facts}</div>
              </div>
              <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0", severityClasses(c.severity))}>
                {c.severityLabel}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className={clsx("rounded px-1.5 py-0.5 font-semibold", stageClasses(c.stage))}>
                {c.stageLabel}
              </span>
              {c.sanctionLabel && (
                <span className="rounded bg-surface-alt px-1.5 py-0.5 text-ink-3">{c.sanctionLabel}</span>
              )}
              <span className="ml-auto text-ink-3">Ouverte {fmtDate(c.openedAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function CollectivePlaceholder() {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <Gavel className="h-5 w-5 text-amber-600" />
        <div>
          <h3 className="text-[13.5px] font-semibold text-ink">Conflits collectifs</h3>
          <p className="mt-1 text-[12px] text-ink-3">
            Aucun conflit collectif actif (grèves, négociation salariale, accord d&apos;entreprise).
            Le suivi des négociations et préavis est journalisé ici en cas de tension sociale.
          </p>
        </div>
      </div>
    </div>
  );
}
