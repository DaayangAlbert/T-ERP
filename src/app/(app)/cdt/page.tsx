"use client";

import Link from "next/link";
import { HardHat, Users, ClipboardList, ShieldCheck, AlertTriangle, ArrowRight, Calendar, AlertOctagon, Info } from "lucide-react";
import { clsx } from "clsx";
import { useCdtDashboard } from "@/hooks/useCdtDashboard";

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDayLong(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function CdtDashboardPage() {
  const { data, isLoading } = useCdtDashboard();
  const now = new Date();

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-3">
        <div className="h-16 animate-pulse rounded-xl bg-primary-100" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      {/* Bandeau sticky violet */}
      <div className="sticky top-0 z-20 -mx-3 -mt-3 mb-1 bg-gradient-to-r from-primary-600 to-primary-700 px-3 py-3 text-white shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-90">
              <HardHat className="h-3 w-3" />
              <span className="truncate">{data.site.name} · Conducteur travaux</span>
            </div>
            <div className="mt-0.5 text-[15px] font-bold">{data.site.code}</div>
          </div>
          <span className="rounded-full bg-white/20 px-2 py-1 text-[10.5px] font-semibold">
            ● En ligne
          </span>
        </div>
      </div>

      {/* Salutation */}
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Bonjour Samuel</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {fmtDayLong(now)} · {fmtTime(now)} · {data.weather} · phase{" "}
          <span className="font-semibold text-primary-700">{data.activePhase.label} {data.activePhase.progress}%</span>
        </p>
      </header>

      {/* KPIs techniques */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users className="h-4 w-4 text-primary-600" />} label="Équipes au travail" value={`${data.kpis.teamsAtWork}/${data.kpis.teamsTotal}`} hint="Présence chantier" />
        <Kpi icon={<ClipboardList className="h-4 w-4 text-emerald-600" />} label="Tâches du jour" value={String(data.kpis.tasksToday)} hint={`${data.kpis.tasksActive} actives`} />
        <Kpi icon={<ShieldCheck className="h-4 w-4 text-amber-600" />} label="Contrôles à faire" value={String(data.kpis.qcTodo)} hint="Auto-contrôles" alert={data.kpis.qcTodo > 0} />
        <Kpi icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} label="Réserves ouvertes" value={String(data.kpis.openReserves)} hint="NC BCT" alert={data.kpis.openReserves > 0} />
      </div>

      {/* CTA plan du jour */}
      {data.planTodayPending && (
        <Link
          href="/cdt/plan"
          className="block rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white shadow-lg transition hover:shadow-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">📋 Plan du jour à valider</div>
              <div className="mt-0.5 text-[12.5px] opacity-90">
                {data.planTeamsToAssign} équipes à affecter · revue avec J. KAMGA à 7h45
              </div>
            </div>
            <span className="grid h-13 min-w-[120px] place-items-center rounded-md bg-white px-3 text-[13px] font-bold text-primary-700" style={{ minHeight: 52 }}>
              Préparer →
            </span>
          </div>
        </Link>
      )}

      {/* Alertes techniques */}
      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Alertes techniques</h2>
        <ul className="space-y-1.5">
          {data.alerts.map((a) => (
            <li key={a.key}>
              <Link
                href={a.link}
                className={clsx(
                  "flex items-start gap-3 rounded-xl border bg-white p-3 transition hover:bg-surface-alt",
                  "min-h-[68px]",
                  a.level === "critical" && "border-rose-200 bg-rose-50",
                  a.level === "warning" && "border-amber-200 bg-amber-50",
                  a.level === "info" && "border-blue-200 bg-blue-50"
                )}
              >
                {a.level === "critical" && <AlertOctagon className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-700" />}
                {a.level === "warning" && <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />}
                {a.level === "info" && <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />}
                <div className="min-w-0 flex-1">
                  <div className={clsx(
                    "text-[13px] font-semibold",
                    a.level === "critical" && "text-rose-800",
                    a.level === "warning" && "text-amber-800",
                    a.level === "info" && "text-blue-800",
                  )}>{a.title}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-3">{a.detail}</div>
                </div>
                <ArrowRight className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-ink-3" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Phase active */}
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Phase active</h2>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <div className="text-[15px] font-bold text-ink">{data.activePhase.label}</div>
          <div className="font-mono text-[16px] font-bold text-emerald-600">{data.activePhase.progress}%</div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-emerald-500" style={{ width: `${data.activePhase.progress}%` }} />
        </div>
        {data.activePhase.nextMilestone && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[12px]">
            <Calendar className="h-3.5 w-3.5 text-amber-700" />
            <span className="font-medium text-amber-800">
              Prochain jalon {data.activePhase.nextMilestone.code} dans {data.activePhase.nextMilestone.daysToNext} jours
            </span>
            <span className="ml-auto text-[11px] text-amber-700">{data.activePhase.nextMilestone.designation}</span>
          </div>
        )}
      </section>

      {/* Sous-traitants présents */}
      {data.subcontractorsOnSite.length > 0 && (
        <section className="rounded-xl border border-line bg-white p-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Sous-traitants présents</h2>
          <ul className="mt-2 space-y-1.5">
            {data.subcontractorsOnSite.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 rounded-md bg-surface-alt px-3 py-2.5">
                <HardHat className="h-4 w-4 flex-shrink-0 text-primary-600" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink truncate">{s.name}</div>
                  <div className="text-[11px] text-ink-3">Chef : {s.supervisor}</div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  {s.workerCount} ouvriers
                </span>
              </li>
            ))}
          </ul>
        </section>
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
