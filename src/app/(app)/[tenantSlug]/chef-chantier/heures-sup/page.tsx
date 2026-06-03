"use client";

import { useState } from "react";
import { Check, Clock, Pencil, X, AlertTriangle, MapPin, Camera } from "lucide-react";
import { clsx } from "clsx";
import {
  useOvertimePending,
  useValidateOvertime,
  type OvertimeRow,
  OVERTIME_TYPE_LABEL,
} from "@/hooks/useCcOvertime";
import { PageHelp } from "@/components/help/PageHelp";
import { CcHeuresSupTutorial } from "@/components/help/tutorials/CcHeuresSupTutorial";

const TYPE_BADGE: Record<string, string> = {
  evening_125: "bg-amber-100 text-amber-800",
  night_150: "bg-indigo-100 text-indigo-800",
  sunday_200: "bg-rose-100 text-rose-800",
};

function formatDateFr(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function OvertimeValidationPage() {
  const [period, setPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [tab, setTab] = useState<"pending" | "validated">("pending");
  const [editing, setEditing] = useState<OvertimeRow | null>(null);
  const [rejecting, setRejecting] = useState<OvertimeRow | null>(null);

  const { data, isLoading } = useOvertimePending(period);
  const validate = useValidateOvertime();

  const list = tab === "pending" ? data?.pending ?? [] : data?.validated ?? [];

  const handleApprove = async (row: OvertimeRow) => {
    if (!confirm(`Valider ${row.overtimeHours}h supplémentaires pour ${row.user.fullName} le ${formatDateFr(row.date)} ?`)) {
      return;
    }
    await validate.mutateAsync({ id: row.id, payload: { action: "APPROVE" } });
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-end justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="text-sm text-slate-500">Validation</div>
          <h1 className="text-2xl font-bold text-slate-900">Heures supplémentaires</h1>
          <p className="mt-1 text-sm text-slate-600">
            Valide les heures sup déclarées par les ouvriers via pointage autonome.
            Après validation, elles seront automatiquement remontées en paie.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <PageHelp title="Aide — Heures sup"><CcHeuresSupTutorial /></PageHelp>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="En attente"
          value={String(data?.totals.pending.count ?? 0)}
          subtitle={`${data?.totals.pending.hours ?? 0}h cumulées`}
          tone="amber"
        />
        <KpiCard
          title="Soir (+25 %)"
          value={`${data?.totals.pending.hours125 ?? 0}h`}
          subtitle="18h-22h"
          tone="amber"
        />
        <KpiCard
          title="Nuit (+50 %)"
          value={`${data?.totals.pending.hours150 ?? 0}h`}
          subtitle="22h-6h"
          tone="indigo"
        />
        <KpiCard
          title="Dim/férié (+100 %)"
          value={`${data?.totals.pending.hours200 ?? 0}h`}
          subtitle="Validées en paie"
          tone="rose"
        />
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <TabButton active={tab === "pending"} onClick={() => setTab("pending")}>
          À valider ({data?.totals.pending.count ?? 0})
        </TabButton>
        <TabButton active={tab === "validated"} onClick={() => setTab("validated")}>
          Déjà validées ({data?.totals.validated.count ?? 0})
        </TabButton>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          Chargement…
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          {tab === "pending"
            ? "Aucune heure supplémentaire en attente sur cette période."
            : "Aucune heure supplémentaire validée sur cette période."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Ouvrier</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Heures</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Chantier</th>
                <th className="px-4 py-3 text-left">Pointage</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                          {row.user.fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-900">{row.user.fullName}</div>
                        <div className="text-xs text-slate-500">{row.user.matricule ?? "—"} · {row.user.position ?? ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatDateFr(row.date)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.overtimeHours}h</td>
                  <td className="px-4 py-3">
                    {row.overtimeType ? (
                      <span className={clsx("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", TYPE_BADGE[row.overtimeType])}>
                        {OVERTIME_TYPE_LABEL[row.overtimeType]}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {row.site ? `${row.site.code} — ${row.site.name}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatTime(row.arrivalTime)} → {formatTime(row.departureTime)}</span>
                      {row.outOfGeofence && (
                        <span title="Hors géofence">
                          <MapPin className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                      {(row.entrySelfieUrl || row.exitSelfieUrl) && (
                        <span title="Selfie pris">
                          <Camera className="h-3.5 w-3.5 text-slate-400" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {tab === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleApprove(row)}
                          disabled={validate.isPending}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" /> Valider
                        </button>
                        <button
                          onClick={() => setEditing(row)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </button>
                        <button
                          onClick={() => setRejecting(row)}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <X className="h-3.5 w-3.5" /> Rejeter
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                        <Check className="h-3.5 w-3.5" /> Validé
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ModifyDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (overtimeHours, overtimeType, reason) => {
            await validate.mutateAsync({
              id: editing.id,
              payload: { action: "MODIFY", overtimeHours, overtimeType, reason },
            });
            setEditing(null);
          }}
        />
      )}

      {rejecting && (
        <RejectDialog
          row={rejecting}
          onClose={() => setRejecting(null)}
          onSubmit={async (reason) => {
            await validate.mutateAsync({
              id: rejecting.id,
              payload: { action: "REJECT", reason },
            });
            setRejecting(null);
          }}
        />
      )}
    </div>
  );
}

function KpiCard({ title, value, subtitle, tone }: { title: string; value: string; subtitle: string; tone: "amber" | "indigo" | "rose" }) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50",
    indigo: "border-indigo-200 bg-indigo-50",
    rose: "border-rose-200 bg-rose-50",
  }[tone];
  return (
    <div className={clsx("rounded-lg border p-4", toneClass)}>
      <div className="text-xs uppercase text-slate-600">{title}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
        active ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700",
      )}
    >
      {children}
    </button>
  );
}

function ModifyDialog({
  row,
  onClose,
  onSubmit,
}: {
  row: OvertimeRow;
  onClose: () => void;
  onSubmit: (h: number, t: "evening_125" | "night_150" | "sunday_200", reason: string) => Promise<void>;
}) {
  const [hours, setHours] = useState(row.overtimeHours);
  const [type, setType] = useState<"evening_125" | "night_150" | "sunday_200">(
    (row.overtimeType as "evening_125" | "night_150" | "sunday_200") ?? "evening_125",
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900">Modifier les heures supplémentaires</h2>
        <p className="mt-1 text-sm text-slate-600">
          {row.user.fullName} · {formatDateFr(row.date)}
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">Heures supplémentaires</label>
            <input
              type="number"
              min={0}
              max={16}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "evening_125" | "night_150" | "sunday_200")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="evening_125">Soir (18h-22h) · +25 %</option>
              <option value="night_150">Nuit (22h-6h) · +50 %</option>
              <option value="sunday_200">Dimanche/férié · +100 %</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Justification *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex : Bétonnage prolongé jusqu'à 21h confirmé par CDT"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={async () => {
              if (reason.trim().length < 5) {
                alert("Justification d'au moins 5 caractères requise");
                return;
              }
              setSubmitting(true);
              try {
                await onSubmit(hours, type, reason.trim());
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Modifier & Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectDialog({
  row,
  onClose,
  onSubmit,
}: {
  row: OvertimeRow;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <h2 className="text-lg font-bold text-slate-900">Rejeter ces heures supplémentaires</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {row.user.fullName} · {formatDateFr(row.date)} · {row.overtimeHours}h
        </p>
        <p className="mt-3 rounded-md bg-rose-50 p-3 text-xs text-rose-700">
          Le pointage sera marqué contesté et les heures supplémentaires mises à zéro pour la paie.
          L'ouvrier en sera notifié.
        </p>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-700">Motif du rejet *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex : Bétonnage planifié terminé à 18h — pas de motif d'heures sup"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={4}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={async () => {
              if (reason.trim().length < 5) {
                alert("Motif d'au moins 5 caractères requis");
                return;
              }
              setSubmitting(true);
              try {
                await onSubmit(reason.trim());
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {submitting ? "Rejet…" : "Confirmer le rejet"}
          </button>
        </div>
      </div>
    </div>
  );
}
