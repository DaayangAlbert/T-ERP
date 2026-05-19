"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, FileText, CheckCircle2, Clock, AlertOctagon, Pencil, Trash2, Download } from "lucide-react";
import { clsx } from "clsx";
import {
  useWeeklyReports,
  useCreateWeeklyReport,
  useDeleteWeeklyReport,
  type WeeklyReportStatus,
} from "@/hooks/useCdtWeeklyReports";

const STATUS_LABEL: Record<WeeklyReportStatus, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

const STATUS_CLS: Record<WeeklyReportStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-sky-100 text-sky-800",
  VALIDATED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

function fmtRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} → ${e.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
}

function getDefaultWeek() {
  // Lundi de la semaine en cours
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

export default function CdtWeeklyReportsPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string }>();
  const [filter, setFilter] = useState<WeeklyReportStatus | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useWeeklyReports({ status: filter || undefined });
  const create = useCreateWeeklyReport();
  const del = useDeleteWeeklyReport();

  const items = data?.items ?? [];

  const handleCreate = (weekStart: string, weekEnd: string) => {
    create.mutate(
      { weekStart, weekEnd },
      {
        onSuccess: (res) => {
          router.push(`/${params.tenantSlug}/conducteur-travaux/rapports/${res.id}`);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <header className="border-b border-line pb-2.5">
        <h1 className="text-[20px] font-bold text-ink">Rapports hebdomadaires</h1>
        <p className="text-[12.5px] text-ink-3">
          Consolidation hebdo des chantiers · soumission DTrav · export PDF
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as WeeklyReportStatus | "")}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-[11.5px] text-ink-3">
          {items.length} rapport{items.length > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[13px] font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" /> Nouveau rapport
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : items.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-4 py-16 text-center">
          <FileText className="mb-2 h-10 w-10 text-ink-3" />
          <p className="text-[13.5px] font-semibold text-ink">Aucun rapport hebdomadaire</p>
          <p className="mt-1 text-[12px] text-ink-3">
            Démarrez un nouveau rapport pour consolider la semaine.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Semaine</th>
                <th className="py-2 text-left">Statut</th>
                <th className="py-2 text-right">Chantiers</th>
                <th className="py-2 text-left">Soumis</th>
                <th className="py-2 text-left">Validé par</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2.5 pl-3">
                    <div className="font-semibold text-ink">{r.weekLabel ?? fmtRange(r.weekStart, r.weekEnd)}</div>
                    <div className="text-[10.5px] text-ink-3">{fmtRange(r.weekStart, r.weekEnd)}</div>
                  </td>
                  <td className="py-2.5">
                    <span className={clsx("inline-block rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_CLS[r.status])}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.status === "REJECTED" && r.rejectionReason && (
                      <div className="mt-0.5 flex items-start gap-1 text-[10.5px] text-rose-700">
                        <AlertOctagon className="mt-0.5 h-2.5 w-2.5 flex-shrink-0" />
                        <span className="line-clamp-1">{r.rejectionReason}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{r.sitesCount}</td>
                  <td className="py-2.5 text-[11.5px] text-ink-3">
                    {r.submittedAt ? (
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(r.submittedAt).toLocaleDateString("fr-FR")}</span>
                    ) : "—"}
                  </td>
                  <td className="py-2.5 text-[11.5px]">
                    {r.validatedBy ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />{r.validatedBy}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/${params.tenantSlug}/conducteur-travaux/rapports/${r.id}`)}
                        className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-white"
                        title="Ouvrir"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {(r.status === "SUBMITTED" || r.status === "VALIDATED") && (
                        <a
                          href={`/api/cdt/weekly-reports/${r.id}/pdf`}
                          target="_blank"
                          rel="noopener"
                          className="grid h-7 w-7 place-items-center rounded text-violet-700 hover:bg-violet-50"
                          title="PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {r.status === "DRAFT" && (
                        <button
                          onClick={() => {
                            if (confirm("Supprimer ce brouillon ?")) del.mutate(r.id);
                          }}
                          className="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          pending={create.isPending}
          error={create.error}
        />
      )}
    </div>
  );
}

function CreateModal({
  onClose,
  onSubmit,
  pending,
  error,
}: {
  onClose: () => void;
  onSubmit: (start: string, end: string) => void;
  pending: boolean;
  error: Error | null;
}) {
  const def = getDefaultWeek();
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">Nouveau rapport hebdomadaire</h2>
          <p className="mt-1 text-[12px] text-ink-3">
            Définissez la période couverte. Vous ajouterez les chantiers ensuite.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(start, end);
          }}
          className="space-y-3 p-4"
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-ink-2">Lundi</span>
              <input
                type="date"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-ink-2">Dimanche</span>
              <input
                type="date"
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
              />
            </label>
          </div>

          {error && (
            <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">{error.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-9 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {pending ? "Création..." : "Créer le brouillon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
