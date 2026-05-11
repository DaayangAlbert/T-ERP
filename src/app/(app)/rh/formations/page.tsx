"use client";

import { useState } from "react";
import { Calendar, GraduationCap, ShieldCheck, RefreshCw, Wallet, Activity, Users } from "lucide-react";
import { clsx } from "clsx";
import { useCertifications, useTrainings, type CertificationItem, type TrainingPlan } from "@/hooks/useRhTrainings";

type Tab = "plan" | "current" | "certifs" | "recycles";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "plan", label: "Plan annuel 2026", icon: <Calendar className="h-3.5 w-3.5" /> },
  { key: "current", label: "Formations en cours", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "certifs", label: "Certifications obligatoires", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: "recycles", label: "Recyclages à programmer", icon: <RefreshCw className="h-3.5 w-3.5" /> },
];

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(s: string): string {
  if (s === "COMPLETED") return "bg-emerald-100 text-emerald-800";
  if (s === "IN_PROGRESS" || s === "CONFIRMED") return "bg-amber-100 text-amber-800";
  if (s === "PLANNED") return "bg-blue-100 text-blue-800";
  return "bg-rose-100 text-rose-800";
}

function certStatusBadge(s: string): string {
  if (s === "VALID") return "bg-emerald-100 text-emerald-800";
  if (s === "RECYCLE_SOON") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

export default function FormationsPage() {
  const [tab, setTab] = useState<Tab>("plan");
  const { data: trainings, isLoading: loadingT } = useTrainings();
  const { data: certs, isLoading: loadingC } = useCertifications();

  const certsExpiring = certs?.items.filter((c) => c.status === "RECYCLE_SOON" || c.status === "EXPIRED") ?? [];

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Formations et certifications</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">Plan annuel, sessions en cours, certifications CACES et recyclages.</p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Wallet className="h-4 w-4 text-primary-600" />}
          label="Budget formation 2026"
          value={`${fmt(trainings?.summary.annualBudget ?? 18_000_000)} FCFA`}
          hint="Annuel"
        />
        <Kpi
          icon={<GraduationCap className="h-4 w-4 text-emerald-600" />}
          label="Dépensé YTD"
          value={`${fmt(trainings?.summary.spentYtd ?? 0)} FCFA`}
          hint={`${trainings?.summary.spentRate ?? 0} % du budget`}
        />
        <Kpi
          icon={<Users className="h-4 w-4 text-amber-600" />}
          label="Formations en cours"
          value={String(trainings?.summary.inProgress ?? 0)}
          hint="Sessions actives"
        />
        <Kpi
          icon={<RefreshCw className="h-4 w-4 text-rose-600" />}
          label="Certifications expirent 60 j"
          value={String(certs?.summary.recycleSoon ?? 0)}
          hint={`${certs?.summary.expired ?? 0} déjà expirées`}
          alert={(certs?.summary.recycleSoon ?? 0) > 0}
        />
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

      {tab === "plan" && (loadingT || !trainings ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      ) : (
        <PlanList items={trainings.items} />
      ))}

      {tab === "current" && (loadingT || !trainings ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      ) : (
        <PlanList items={trainings.items.filter((t) => t.status === "IN_PROGRESS" || t.status === "CONFIRMED")} />
      ))}

      {tab === "certifs" && (loadingC || !certs ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      ) : (
        <CertificationsList items={certs.items} />
      ))}

      {tab === "recycles" && (loadingC || !certs ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      ) : (
        <CertificationsList items={certsExpiring} highlightExpiry />
      ))}
    </div>
  );

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

  function PlanList({ items }: { items: TrainingPlan[] }) {
    if (items.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
          Aucune formation à afficher.
        </div>
      );
    }
    return (
      <>
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left">Réf</th>
                <th className="px-3 py-2 text-left">Titre</th>
                <th className="px-3 py-2 text-left">Catégorie</th>
                <th className="px-3 py-2 text-left">Période</th>
                <th className="px-3 py-2 text-right">Participants</th>
                <th className="px-3 py-2 text-right">Coût</th>
                <th className="px-3 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((t) => (
                <tr key={t.ref} className="hover:bg-surface-alt/40">
                  <td className="px-3 py-2 font-mono text-[11.5px] text-ink-3">{t.ref}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{t.title}</div>
                    <div className="text-[11px] text-ink-3">{t.provider}</div>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-ink-3">{t.category}</td>
                  <td className="px-3 py-2 text-[11.5px] text-ink-3">
                    {fmtDate(t.startDate)} → {fmtDate(t.endDate)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[12px]">{t.participants}</td>
                  <td className="px-3 py-2 text-right font-mono text-[12px]">{fmt(t.budget)}</td>
                  <td className="px-3 py-2">
                    <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", statusBadge(t.status))}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2 md:hidden">
          {items.map((t) => (
            <li key={t.ref} className="rounded-xl border border-line bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10.5px] text-ink-3">{t.ref}</div>
                  <div className="text-[13px] font-semibold text-ink">{t.title}</div>
                  <div className="text-[11.5px] text-ink-3">{t.provider}</div>
                </div>
                <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0", statusBadge(t.status))}>
                  {t.status}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                <Cell label="Participants" value={String(t.participants)} />
                <Cell label="Coût" value={`${fmt(t.budget)}`} />
                <Cell label="Catégorie" value={t.category} />
              </div>
              <div className="mt-1 text-right text-[10.5px] text-ink-3">
                {fmtDate(t.startDate)} → {fmtDate(t.endDate)}
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  }

  function CertificationsList({ items, highlightExpiry }: { items: CertificationItem[]; highlightExpiry?: boolean }) {
    if (items.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
          Aucune certification à afficher.
        </div>
      );
    }
    return (
      <>
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left">Employé</th>
                <th className="px-3 py-2 text-left">Certification</th>
                <th className="px-3 py-2 text-left">Émise par</th>
                <th className="px-3 py-2 text-left">Émise le</th>
                <th className="px-3 py-2 text-left">Expire le</th>
                <th className="px-3 py-2 text-right">J restants</th>
                <th className="px-3 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-surface-alt/40">
                  <td className="px-3 py-2 font-medium text-ink">{c.employeeName}</td>
                  <td className="px-3 py-2 text-[12px] text-ink">{c.type}</td>
                  <td className="px-3 py-2 text-[12px] text-ink-3">{c.issuedBy}</td>
                  <td className="px-3 py-2 text-[11.5px] text-ink-3">{fmtDate(c.issuedAt)}</td>
                  <td className="px-3 py-2 text-[11.5px] text-ink-3">{fmtDate(c.expiresAt)}</td>
                  <td className={clsx("px-3 py-2 text-right font-mono text-[12px] font-semibold", c.daysLeft <= 60 ? "text-rose-700" : "text-ink")}>
                    {c.daysLeft}
                  </td>
                  <td className="px-3 py-2">
                    <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", certStatusBadge(c.status))}>
                      {c.status === "VALID" ? "Valide" : c.status === "RECYCLE_SOON" ? "À recycler" : "Expirée"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2 md:hidden">
          {items.map((c) => (
            <li key={c.id} className={clsx("rounded-xl border bg-white p-3", highlightExpiry && c.daysLeft <= 60 ? "border-rose-200" : "border-line")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">{c.employeeName}</div>
                  <div className="text-[11.5px] text-ink-3">{c.type}</div>
                </div>
                <div className="text-right">
                  {highlightExpiry && c.daysLeft <= 60 && (
                    <div className={clsx("font-mono text-[16px] font-bold", c.daysLeft < 0 ? "text-rose-700" : "text-amber-700")}>
                      J {c.daysLeft >= 0 ? "-" : "+"}
                      {Math.abs(c.daysLeft)}
                    </div>
                  )}
                  <span className={clsx("inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold", certStatusBadge(c.status))}>
                    {c.status}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-ink-3">
                Émise le {fmtDate(c.issuedAt)} par {c.issuedBy} · expire le {fmtDate(c.expiresAt)}
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  }

  function Cell({ label, value }: { label: string; value: string }) {
    return (
      <div>
        <div className="text-[10px] uppercase text-ink-3">{label}</div>
        <div className="font-mono text-[11.5px] text-ink truncate">{value}</div>
      </div>
    );
  }
}
