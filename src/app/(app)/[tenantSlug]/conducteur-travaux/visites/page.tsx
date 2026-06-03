"use client";

import { useState } from "react";
import { Plus, X, Save, FileText, AlertOctagon, CheckCircle2, Briefcase } from "lucide-react";
import { clsx } from "clsx";
import type { VisitorType } from "@prisma/client";
import { useCreateVisit, useReportVisit, useVisits, type RecentVisit, type UpcomingVisit } from "@/hooks/useCdtVisits";
import { PageHelp } from "@/components/help/PageHelp";
import { CdtVisitesTutorial } from "@/components/help/tutorials/CdtVisitesTutorial";

const VISITOR_LABEL: Record<VisitorType, string> = {
  BCT: "BCT",
  GEOMETER: "Géomètre",
  MOA: "Maître d'ouvrage",
  INSURANCE: "Assurance",
  BANK: "Banque",
  CONSULTANT: "Consultant",
  OTHER: "Autre",
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function fmtTime(s: string): string {
  return new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function countdownLabel(hours: number): string {
  if (hours <= 0) return "Maintenant";
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}j`;
}

export default function CdtVisitesPage() {
  const { data, isLoading } = useVisits();
  const [showSchedule, setShowSchedule] = useState(false);
  const [reportTarget, setReportTarget] = useState<UpcomingVisit | RecentVisit | null>(null);

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-3">
        <div className="h-12 animate-pulse rounded-xl bg-surface-alt" />
        {[1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-surface-alt" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Visites externes</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">BCT · géomètres · MOA · banques · assurances.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSchedule(true)}
            className="inline-flex h-12 items-center gap-2 rounded-md bg-primary-500 px-4 text-[13px] font-semibold text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" /> Programmer visite
          </button>
          <PageHelp title="Aide — Visites externes"><CdtVisitesTutorial /></PageHelp>
        </div>
      </header>

      {/* Visites à venir */}
      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">À venir</h2>
        {data.upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
            Aucune visite programmée.
          </div>
        ) : (
          <ul className="space-y-2">
            {data.upcoming.map((v) => (
              <article key={v.id} className="rounded-xl border border-line bg-white p-3">
                <header className="flex items-start gap-3">
                  <div className="grid h-[60px] w-[60px] flex-shrink-0 place-items-center rounded-md bg-primary-500 text-white">
                    <div className="text-[18px] font-bold leading-none">{fmtDate(v.scheduledAt).split(" ")[0]}</div>
                    <div className="text-[9.5px] uppercase">{fmtDate(v.scheduledAt).split(" ")[1]}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10.5px] text-ink-3">
                      <Briefcase className="h-3 w-3" />
                      {VISITOR_LABEL[v.visitorType]} · {v.organization}
                    </div>
                    <h3 className="text-[14px] font-bold text-ink">{v.visitorName}</h3>
                    <p className="text-[12px] text-ink">{v.purpose}</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">à {fmtTime(v.scheduledAt)}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                    {countdownLabel(v.hoursUntil)}
                  </span>
                </header>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-2 text-[12px] font-semibold text-ink hover:bg-surface-alt">
                    Préparer
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTarget(v)}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary-500 px-2 text-[12px] font-semibold text-white hover:bg-primary-600"
                  >
                    <FileText className="h-3.5 w-3.5" /> Rédiger CR
                  </button>
                </div>
              </article>
            ))}
          </ul>
        )}
      </section>

      {/* Visites récentes */}
      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Récentes</h2>
        {data.recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
            Aucune visite récente.
          </div>
        ) : (
          <ul className="space-y-2">
            {data.recent.map((v) => (
              <article key={v.id} className={clsx(
                "rounded-xl border bg-white p-3",
                v.reservations > 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"
              )}>
                <header className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] text-ink-3">{VISITOR_LABEL[v.visitorType]} · {v.organization}</div>
                    <h3 className="text-[13px] font-bold text-ink">{v.visitorName}</h3>
                    <p className="text-[11.5px] text-ink-3">{v.purpose} · {fmtDate(v.scheduledAt)}</p>
                  </div>
                  {v.reservations > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                      <AlertOctagon className="h-3 w-3" /> {v.reservations} réserve{v.reservations > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> 0 réserve
                    </span>
                  )}
                </header>
                {v.reportContent && (
                  <p className="mt-2 text-[11.5px] italic text-ink-2">« {v.reportContent} »</p>
                )}
              </article>
            ))}
          </ul>
        )}
      </section>

      {showSchedule && <ScheduleDialog onClose={() => setShowSchedule(false)} />}
      {reportTarget && <ReportDialog visit={reportTarget} onClose={() => setReportTarget(null)} />}
    </div>
  );
}

function ScheduleDialog({ onClose }: { onClose: () => void }) {
  const [visitorType, setVisitorType] = useState<VisitorType>("BCT");
  const [visitorName, setVisitorName] = useState("");
  const [organization, setOrganization] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d.toISOString().slice(0, 16);
  });
  const [purpose, setPurpose] = useState("");
  const create = useCreateVisit();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Programmer une visite</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded text-ink-3 hover:bg-surface-alt"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-2.5">
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Type de visiteur</div>
            <select value={visitorType} onChange={(e) => setVisitorType(e.target.value as VisitorType)} className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]">
              {(Object.keys(VISITOR_LABEL) as VisitorType[]).map((k) => (
                <option key={k} value={k}>{VISITOR_LABEL[k]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Nom du visiteur</div>
            <input type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]" placeholder="ex. B. NJONGA" />
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Organisation</div>
            <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]" placeholder="ex. TopoCAM" />
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Date et heure</div>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]" />
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Objet de la visite</div>
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-[13px]" placeholder="ex. Implantation pile 4" />
          </label>
          <button
            type="button"
            disabled={create.isPending || !visitorName.trim() || !organization.trim() || !purpose.trim()}
            onClick={() => create.mutate({ visitorType, visitorName, organization, scheduledAt, purpose }, { onSuccess: onClose })}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-primary-500 px-3 text-[14px] font-bold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {create.isPending ? "Programmation..." : "Programmer + notif J-1"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportDialog({ visit, onClose }: { visit: UpcomingVisit | RecentVisit; onClose: () => void }) {
  const [content, setContent] = useState("reportContent" in visit ? visit.reportContent ?? "" : "");
  const [reservations, setReservations] = useState("reservations" in visit ? visit.reservations : 0);
  const report = useReportVisit();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Compte-rendu visite — {visit.visitorName}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded text-ink-3 hover:bg-surface-alt"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-2.5">
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Compte-rendu (observations, points abordés)</div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-[13px]" placeholder="ex. Réserve sur recouvrement aciers Z3. À lever sous 7 jours." />
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Nombre de réserves émises</div>
            <input type="number" min={0} max={20} value={reservations} onChange={(e) => setReservations(Number(e.target.value) || 0)} className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 font-mono text-[16px]" />
          </label>
          <button
            type="button"
            disabled={report.isPending || !content.trim()}
            onClick={() => report.mutate({ id: visit.id, reportContent: content, reservations }, { onSuccess: onClose })}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-[14px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {report.isPending ? "Diffusion..." : "Enregistrer + diffuser DTrav/DT"}
          </button>
        </div>
      </div>
    </div>
  );
}
