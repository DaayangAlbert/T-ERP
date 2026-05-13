"use client";

import { useState } from "react";
import { Stethoscope, CalendarClock, AlertTriangle, ShieldCheck, AlertCircle, UserCog } from "lucide-react";
import { clsx } from "clsx";
import { useMedicalVisits, type MedicalVisit } from "@/hooks/useRhMedical";

type Tab = "due" | "calendar" | "fitness" | "doctor";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "due", label: "Échéances", icon: <CalendarClock className="h-3.5 w-3.5" /> },
  { key: "calendar", label: "Calendrier", icon: <Stethoscope className="h-3.5 w-3.5" /> },
  { key: "fitness", label: "Aptitudes", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: "doctor", label: "Médecin du travail", icon: <UserCog className="h-3.5 w-3.5" /> },
];

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClasses(s: string): string {
  if (s === "OVERDUE") return "bg-rose-100 text-rose-800";
  if (s === "SOON") return "bg-amber-100 text-amber-800";
  if (s === "COMPLETED") return "bg-emerald-100 text-emerald-800";
  return "bg-blue-100 text-blue-800";
}

function statusLabel(s: string): string {
  if (s === "OVERDUE") return "En retard";
  if (s === "SOON") return "Ce mois";
  if (s === "COMPLETED") return "Effectuée";
  return "À jour";
}

export default function MedicalPage() {
  const [tab, setTab] = useState<Tab>("due");
  const { data, isLoading } = useMedicalVisits("all");

  const overdue = data?.items.filter((v) => v.overdue) ?? [];
  const upcoming = data?.items.filter((v) => v.status === "SOON" || v.status === "OVERDUE" || v.status === "PLANNED") ?? [];

  return (
    <div className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Visites médicales et aptitudes</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">Médecine du travail · aptitudes · échéances obligatoires.</p>
      </header>

      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<CalendarClock className="h-4 w-4 text-primary-600" />} label="Prévues ce mois" value={String(data?.summary.scheduledThisMonth ?? 24)} hint="Visites obligatoires" />
        <Kpi icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} label="En retard" value={String(data?.summary.overdue ?? 5)} hint="À reprogrammer" alert={(data?.summary.overdue ?? 0) > 0} />
        <Kpi icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />} label="Aptes sans réserve" value={String(data?.summary.fitWithoutRestrictions ?? 462)} hint="Effectif total apte" />
        <Kpi icon={<AlertCircle className="h-4 w-4 text-amber-600" />} label="Avec restrictions" value={String(data?.summary.fitWithRestrictions ?? 18)} hint="Aménagements de poste" />
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
      ) : (
        <>
          {tab === "due" && <VisitsList items={[...overdue, ...upcoming.filter((u) => !overdue.includes(u))]} />}
          {tab === "calendar" && <VisitsList items={data.items.filter((v) => v.status !== "COMPLETED").slice(0, 30)} />}
          {tab === "fitness" && <VisitsList items={data.items.filter((v) => v.fitnessVerdict)} showVerdict />}
          {tab === "doctor" && <DoctorPanel />}
        </>
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

function VisitsList({ items, showVerdict }: { items: MedicalVisit[]; showVerdict?: boolean }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
        Aucune visite à afficher.
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
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Programmée</th>
              {showVerdict && <th className="px-3 py-2 text-left">Aptitude</th>}
              <th className="px-3 py-2 text-left">Médecin</th>
              <th className="px-3 py-2 text-left">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((v) => (
              <tr key={v.id} className={clsx("hover:bg-surface-alt/40", v.status === "OVERDUE" && "bg-rose-50/40")}>
                <td className="px-3 py-2 font-medium text-ink">{v.employeeName}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{v.typeLabel}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{fmtDate(v.scheduledAt)}</td>
                {showVerdict && (
                  <td className="px-3 py-2 text-[12px]">
                    {v.verdictLabel ?? "—"}
                    {v.restrictions && <div className="text-[10.5px] italic text-amber-700">« {v.restrictions} »</div>}
                  </td>
                )}
                <td className="px-3 py-2 text-[11.5px] text-ink-3">{v.doctor ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", statusClasses(v.status))}>
                    {statusLabel(v.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {items.map((v) => (
          <li key={v.id} className={clsx("rounded-xl border p-3", v.status === "OVERDUE" ? "border-rose-200 bg-rose-50" : "border-line bg-white")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink">{v.employeeName}</div>
                <div className="text-[11.5px] text-ink-3">{v.typeLabel} · {fmtDate(v.scheduledAt)}</div>
                {v.verdictLabel && (
                  <div className="mt-1 text-[11.5px] text-ink">
                    Aptitude : <span className="font-medium">{v.verdictLabel}</span>
                  </div>
                )}
                {v.restrictions && <div className="text-[11px] italic text-amber-700">« {v.restrictions} »</div>}
              </div>
              <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0", statusClasses(v.status))}>
                {statusLabel(v.status)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function DoctorPanel() {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-primary-500 text-[14px] font-bold text-white">
          NP
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-ink">Dr. NGOUFO Pierre</div>
          <div className="text-[12.5px] text-ink-3">Médecin du travail référent</div>
          <div className="mt-1 text-[11.5px] text-ink-3">Cabinet : Avenue Kennedy, Yaoundé · +237 6 77 12 88 90 · ngoufo.medtravail@batimcam.cm</div>
        </div>
      </div>
      <div className="my-3 border-t border-line" />
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label="Visites mensuelles" value="24" />
        <Stat label="Aptitudes prononcées 12m" value="487" />
        <Stat label="Restrictions actives" value="18" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface-alt p-2.5">
      <div className="text-[10.5px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className="font-mono text-[14px] font-bold text-ink">{value}</div>
    </div>
  );
}
