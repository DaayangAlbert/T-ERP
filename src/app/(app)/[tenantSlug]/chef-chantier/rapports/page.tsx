"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Download,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Pencil,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useProgressReports,
  useCreateProgressReport,
  useDeleteProgressReport,
} from "@/hooks/useProgressReports";
import { useCcSite } from "@/contexts/CcSiteContext";
import { REPORT_TYPE_LABEL, REPORT_STATUS_LABEL } from "@/schemas/site-progress-report";
import { formatFCFA } from "@/lib/format";

const STATUS_TONES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-amber-100 text-amber-800",
  VALIDATED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  DRAFT: <Pencil className="h-3 w-3" />,
  SUBMITTED: <Clock className="h-3 w-3" />,
  VALIDATED: <CheckCircle2 className="h-3 w-3" />,
  REJECTED: <XCircle className="h-3 w-3" />,
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtPeriod(iso: string, type: string, label: string | null): string {
  if (label) return label;
  const d = new Date(iso);
  if (type === "MONTHLY") {
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  if (type === "WEEKLY") {
    return `Sem. ${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;
  }
  return d.toLocaleDateString("fr-FR");
}

export default function CcReportsPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const { site } = useCcSite();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useProgressReports({
    status: statusFilter || undefined,
    reportType: typeFilter || undefined,
  });

  const deleteMut = useDeleteProgressReport();

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-2.5">
        <div>
          <h1 className="text-[20px] font-bold text-ink">Rapports d&apos;avancement</h1>
          <p className="text-[12.5px] text-ink-3">
            Brouillon · soumission au DTrav · validation · export PDF
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[13px] font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Nouveau rapport
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <KpiCard label="Brouillons" value={data?.summary.drafts ?? 0} tone="slate" icon={<Pencil className="h-4 w-4" />} />
        <KpiCard label="Soumis" value={data?.summary.submitted ?? 0} tone="amber" icon={<Clock className="h-4 w-4" />} />
        <KpiCard label="Validés" value={data?.summary.validated ?? 0} tone="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
        <KpiCard label="Refusés" value={data?.summary.rejected ?? 0} tone="rose" icon={<XCircle className="h-4 w-4" />} />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous statuts</option>
          {Object.entries(REPORT_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous types</option>
          {Object.entries(REPORT_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="ml-auto text-[11.5px] text-ink-3">
          {items.length} rapport{items.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : items.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-4 py-16 text-center">
          <FileText className="mb-2 h-10 w-10 text-ink-3" />
          <p className="text-[13.5px] font-semibold text-ink">Aucun rapport pour le moment</p>
          <p className="mt-1 text-[12px] text-ink-3">Créez un brouillon pour démarrer.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[960px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Période</th>
                <th className="py-2 text-left">Type</th>
                <th className="py-2 text-left">Chantier</th>
                <th className="py-2 text-right">Avancement</th>
                <th className="py-2 text-right">Valeur produite</th>
                <th className="py-2 text-right">Effectif moy.</th>
                <th className="py-2 text-left">Statut</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3 font-medium text-ink">
                    {fmtPeriod(r.period, r.reportType, r.periodLabel)}
                  </td>
                  <td className="py-2 text-ink-2">{REPORT_TYPE_LABEL[r.reportType]}</td>
                  <td className="py-2">
                    <div className="font-mono text-[10.5px] text-ink-3">{r.site.code}</div>
                    <div className="truncate text-ink-2">{r.site.name}</div>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {r.physicalProgressPercent.toFixed(1)}%
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {formatFCFA(BigInt(r.valueProducedXAF))}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">{r.avgWorkforce}</td>
                  <td className="py-2">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                        STATUS_TONES[r.status],
                      )}
                    >
                      {STATUS_ICONS[r.status]} {REPORT_STATUS_LABEL[r.status]}
                    </span>
                    {r.status === "REJECTED" && r.rejectionReason && (
                      <p className="mt-0.5 line-clamp-1 max-w-[180px] text-[10.5px] italic text-rose-600" title={r.rejectionReason}>
                        {r.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/${tenantSlug}/chef-chantier/rapports/${r.id}/edit`}
                        className="inline-flex h-7 items-center gap-1 rounded border border-line bg-white px-2 text-[11.5px] hover:bg-surface-alt"
                        title={r.status === "DRAFT" || r.status === "REJECTED" ? "Modifier" : "Voir"}
                      >
                        <Pencil className="h-3 w-3" />
                        {r.status === "DRAFT" || r.status === "REJECTED" ? "Éditer" : "Voir"}
                      </Link>
                      <a
                        href={`/api/cc/progress-reports/${r.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 items-center gap-1 rounded border border-line bg-white px-2 text-[11.5px] hover:bg-surface-alt"
                        title="Télécharger le PDF"
                      >
                        <Download className="h-3 w-3" />
                        PDF
                      </a>
                      {r.status === "DRAFT" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Supprimer définitivement ce brouillon ?")) {
                              deleteMut.mutate(r.id);
                            }
                          }}
                          className="grid h-7 w-7 place-items-center rounded border border-line bg-white text-rose-600 hover:bg-rose-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" />
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
        <CreateReportModal
          defaultSiteId={site?.id ?? ""}
          defaultSiteLabel={site ? `${site.code} — ${site.name}` : ""}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => router.push(`/${tenantSlug}/chef-chantier/rapports/${id}/edit`)}
        />
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "slate" | "amber" | "emerald" | "rose";
  icon: React.ReactNode;
}) {
  const toneClasses = {
    slate: "bg-slate-50 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  }[tone];
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] uppercase tracking-wide text-ink-3">{label}</span>
        <span className={clsx("grid h-7 w-7 place-items-center rounded-full", toneClasses)}>{icon}</span>
      </div>
      <p className="mt-1 text-[22px] font-bold text-ink">{value}</p>
    </div>
  );
}

function CreateReportModal({
  defaultSiteId,
  defaultSiteLabel,
  onClose,
  onCreated,
}: {
  defaultSiteId: string;
  defaultSiteLabel: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [reportType, setReportType] = useState<"WEEKLY" | "MONTHLY" | "AD_HOC">("MONTHLY");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [period, setPeriod] = useState(today);
  const [periodLabel, setPeriodLabel] = useState("");
  const [progress, setProgress] = useState("0");
  const [previous, setPrevious] = useState("");
  const create = useCreateProgressReport();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultSiteId) {
      alert("Aucun chantier sélectionné");
      return;
    }
    const progressNum = Number(progress);
    if (!Number.isFinite(progressNum) || progressNum < 0 || progressNum > 100) {
      alert("Avancement entre 0 et 100");
      return;
    }
    create.mutate(
      {
        siteId: defaultSiteId,
        reportType,
        period: new Date(period).toISOString(),
        periodLabel: periodLabel.trim() || null,
        physicalProgressPercent: progressNum,
        previousProgressPercent: previous.trim() ? Number(previous) : null,
      },
      { onSuccess: (r) => onCreated(r.id) },
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">Nouveau rapport d&apos;avancement</h2>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded hover:bg-surface-alt"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold text-ink-2">Chantier</label>
            <input
              value={defaultSiteLabel || "Aucun chantier"}
              disabled
              className="h-9 w-full rounded-md border border-line bg-surface-alt px-2 text-[12.5px] text-ink-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-semibold text-ink-2">Type de rapport</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
            >
              <option value="MONTHLY">Mensuel</option>
              <option value="WEEKLY">Hebdomadaire</option>
              <option value="AD_HOC">Ad hoc</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink-2">Période</label>
              <input
                type="date"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink-2">
                Libellé (optionnel)
              </label>
              <input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="Mai 2026"
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink-2">
                % avancement physique
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                required
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink-2">
                % période précédente
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={previous}
                onChange={(e) => setPrevious(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
              />
            </div>
          </div>

          {create.error && (
            <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">
              {(create.error as Error).message}
            </p>
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
              disabled={create.isPending || !defaultSiteId}
              className="h-9 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {create.isPending ? "Création..." : "Créer le brouillon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
