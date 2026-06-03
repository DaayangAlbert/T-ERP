"use client";

import { useState } from "react";
import { HardHat, Star, Phone, Camera, FileText, Plus, Users, CheckCircle2, X, Save } from "lucide-react";
import { clsx } from "clsx";
import { useRecordAttendance, useSubcontractors, type ActiveSubcontractor } from "@/hooks/useCdtSubcontractors";
import { PageHelp } from "@/components/help/PageHelp";
import { CdtSoustraitantsTutorial } from "@/components/help/tutorials/CdtSoustraitantsTutorial";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function CdtSoustraitantsPage() {
  const { data, isLoading } = useSubcontractors();
  const [attendanceTarget, setAttendanceTarget] = useState<ActiveSubcontractor | null>(null);

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-3">
        <div className="h-20 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Sous-traitants</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {data.active.length} actif · {data.upcoming.length} en démarrage prochain ·{" "}
            <span className="font-mono font-semibold text-ink">{fmt(data.totalEngagedAmount)} FCFA</span> engagés
          </p>
        </div>
        <PageHelp title="Aide — Sous-traitants CDT"><CdtSoustraitantsTutorial /></PageHelp>
      </header>

      {/* Cards actifs */}
      {data.active.map((s) => (
        <article key={s.id} className="rounded-xl border-l-[4px] border-l-emerald-500 border border-line bg-white p-3">
          <header className="flex items-start gap-3">
            <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
              <HardHat className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-bold text-ink truncate">{s.name}</h3>
              <p className="text-[11.5px] text-ink-3">{s.contractLabel}</p>
              <div className="mt-0.5 flex items-center gap-1 text-[11px]">
                <Star className="h-3 w-3 text-amber-500" />
                <span className="font-semibold text-ink">{s.qualityRating}/5</span>
                <span className="text-ink-3">· prestation en cours</span>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">Actif</span>
          </header>

          <div className="my-3 border-t border-line" />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Présents" value={`${s.workerCount}/${s.headcountTarget}`} />
            <Stat label="Démarrage" value={fmtDate(s.startedAt)} />
            <Stat label="Fin" value={fmtDate(s.endDate)} />
            <Stat label="Avancement" value={`${s.progress}%`} />
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-emerald-500" style={{ width: `${s.progress}%` }} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button type="button" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[12px] font-semibold text-ink hover:bg-surface-alt">
              <Camera className="h-3.5 w-3.5" /> Photo qualité
            </button>
            <button type="button" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[12px] font-semibold text-ink hover:bg-surface-alt">
              <Star className="h-3.5 w-3.5" /> Évaluer
            </button>
            <button type="button" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[12px] font-semibold text-ink hover:bg-surface-alt">
              <Phone className="h-3.5 w-3.5" /> Contact
            </button>
          </div>

          {/* Pointage présence */}
          <div className="mt-3 rounded-md border border-line bg-surface-alt p-2.5">
            <h4 className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Pointage présence · aujourd&apos;hui</h4>
            <ul className="mt-1.5 space-y-1">
              <li className="flex items-center gap-2.5 rounded-md bg-white px-2.5 py-2">
                <Users className="h-4 w-4 flex-shrink-0 text-primary-600" />
                <span className="flex-1 text-[12px] text-ink"><b>{s.supervisor}</b> chef équipe arrivé 07:18</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </li>
              <li className="flex items-center gap-2.5 rounded-md bg-white px-2.5 py-2">
                <Users className="h-4 w-4 flex-shrink-0 text-primary-600" />
                <span className="flex-1 text-[12px] text-ink">{s.workerCount - 1} ouvriers présents</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setAttendanceTarget(s)}
              className="mt-2 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600"
            >
              <FileText className="h-4 w-4" /> Émettre bon de présence journalier
            </button>
          </div>
        </article>
      ))}

      {/* Cards à venir */}
      {data.upcoming.map((u) => (
        <article key={u.id} className="rounded-xl border-l-[4px] border-l-blue-500 border border-line bg-white p-3">
          <header className="flex items-start gap-3">
            <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-blue-500 text-white">
              <HardHat className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-bold text-ink truncate">{u.name}</h3>
              <p className="text-[11.5px] text-ink-3">{u.contractLabel}</p>
              <p className="mt-0.5 text-[11px] text-ink-3">Démarrage prévu {fmtDate(u.startsAt)} · {u.durationDays} jours · {fmt(u.totalAmount)} FCFA</p>
            </div>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10.5px] font-bold text-blue-800">À venir</span>
          </header>
        </article>
      ))}

      {attendanceTarget && <AttendanceDialog item={attendanceTarget} onClose={() => setAttendanceTarget(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-alt p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className="font-mono text-[13px] font-bold text-ink">{value}</div>
    </div>
  );
}

function AttendanceDialog({ item, onClose }: { item: ActiveSubcontractor; onClose: () => void }) {
  const [workerCount, setWorkerCount] = useState(item.workerCount);
  const [supervisor, setSupervisor] = useState(item.supervisor);
  const [notes, setNotes] = useState(item.activityNotes ?? "");
  const record = useRecordAttendance();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Bon de présence — {item.name}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded text-ink-3 hover:bg-surface-alt"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-2.5">
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Chef équipe sous-traitant</div>
            <input type="text" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]" />
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Nombre d&apos;ouvriers présents</div>
            <input type="number" min={0} max={50} value={workerCount} onChange={(e) => setWorkerCount(Number(e.target.value) || 0)} className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 font-mono text-[16px]" />
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Notes activité du jour</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-[13px]" placeholder="ex. Pose étanchéité zone Z2 — avancement 28%" />
          </label>
          <button
            type="button"
            disabled={record.isPending || !supervisor.trim() || workerCount < 1}
            onClick={() => record.mutate({ subcontractorId: item.subcontractorId, workerCount, supervisorOnSite: supervisor, activityNotes: notes }, { onSuccess: onClose })}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-[14px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {record.isPending ? "Enregistrement..." : "Émettre bon présence + sync"}
          </button>
          <p className="text-[11px] text-ink-3">PDF signé chef sous-traitant → utilisé pour facturation mensuelle.</p>
        </div>
      </div>
    </div>
  );
}
