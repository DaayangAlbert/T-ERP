"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertOctagon, Check, X, Download, FileText, Shield, Award, FileBarChart, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useGedAudit, useDecideAccessRequest } from "@/hooks/useGedAudit";
import { useAuth } from "@/hooks/useAuth";
import { AnomalyDetailDrawer } from "@/components/ged/audit/AnomalyDetailDrawer";
import { ComplianceReportDialog } from "@/components/ged/audit/ComplianceReportDialog";
import { Iso9001ReadinessChecklist } from "@/components/ged/audit/Iso9001ReadinessChecklist";

const ACTION_LABEL: Record<string, string> = {
  CONSULTATION: "Consultation",
  DOWNLOAD: "Téléchargement",
  IMPORT: "Import",
  MODIFICATION: "Modification",
  DELETION: "Suppression",
  VALIDATION_WORKFLOW: "Validation workflow",
  DIFFUSION: "Diffusion",
  ACCESS_REQUEST: "Demande d'accès",
  ANOMALY: "Anomalie",
};

const ACTION_FILTERS = [
  { value: "", label: "Toutes actions" },
  { value: "CONSULTATION", label: "Consultations" },
  { value: "DOWNLOAD", label: "Téléchargements" },
  { value: "IMPORT", label: "Imports" },
  { value: "MODIFICATION", label: "Modifications" },
  { value: "DELETION", label: "Suppressions" },
  { value: "VALIDATION_WORKFLOW", label: "Validations" },
  { value: "DIFFUSION", label: "Diffusions" },
  { value: "ACCESS_REQUEST", label: "Demandes d'accès" },
];

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function GedAuditPage() {
  const { user } = useAuth();
  const canResolve = user?.role === "ARCHIVIST" || user?.role === "TENANT_ADMIN";
  const [action, setAction] = useState("");
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGedAudit({ action, anomaly: anomalyOnly, page });
  const decide = useDecideAccessRequest();
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [openAnomalyId, setOpenAnomalyId] = useState<string | null>(null);
  const [showComplianceReport, setShowComplianceReport] = useState(false);
  const [showIso9001, setShowIso9001] = useState(false);

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Audit et conformité
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Traçabilité tous accès · politique SYSCOHADA · droit camerounais · audit ISO 9001.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <a
            href="/api/ged/audit/export"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink hover:bg-surface-alt"
          >
            <Download className="h-3.5 w-3.5" /> Export journal
          </a>
          <button
            type="button"
            onClick={() => setShowIso9001(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink hover:bg-surface-alt"
          >
            <Award className="h-3.5 w-3.5" /> ISO 9001
          </button>
          <button
            type="button"
            onClick={() => setShowComplianceReport(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700"
          >
            <FileBarChart className="h-3.5 w-3.5" /> Rapport conformité
          </button>
        </div>
      </header>

      {/* KPIs conformité */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div
            className={clsx(
              "text-[20px] font-bold leading-none",
              data.kpis.complianceScore >= data.kpis.complianceTarget ? "text-emerald-700" : "text-amber-700"
            )}
          >
            {data.kpis.complianceScore} %
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">Score conformité</div>
          <div className="text-[10.5px] text-ink-3">
            Cible ISO 9001 ≥ {data.kpis.complianceTarget} %
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div
            className={clsx(
              "text-[20px] font-bold leading-none",
              data.kpis.pendingAccessRequests > 0 ? "text-amber-700" : "text-ink"
            )}
          >
            {data.kpis.pendingAccessRequests}
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">Demandes d&apos;accès</div>
          <div className="text-[10.5px] text-ink-3">En attente</div>
        </div>
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div
            className={clsx(
              "text-[20px] font-bold leading-none",
              data.kpis.activeAnomalies > 0 ? "text-rose-700" : "text-ink"
            )}
          >
            {data.kpis.activeAnomalies}
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">Anomalies actives</div>
        </div>
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div className="text-[20px] font-bold leading-none text-ink">{fmt(data.kpis.ytdEvents)}</div>
          <div className="mt-1 text-[11.5px] text-ink-2">Événements journal YTD</div>
        </div>
      </div>

      {/* Alertes conformité actives */}
      {data.alerts.length > 0 && (
        <section>
          <h2 className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
            <AlertOctagon className="h-4 w-4 text-rose-600" /> Alertes conformité actives
          </h2>
          <div className="flex flex-col gap-1.5">
            {data.alerts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setOpenAnomalyId(a.id)}
                className="flex w-full items-center gap-2 rounded-lg border border-rose-200 border-l-[4px] border-l-rose-500 bg-rose-50/60 px-3 py-2.5 text-left transition hover:bg-rose-50 sm:gap-3"
              >
                <AlertOctagon className="h-4 w-4 flex-shrink-0 text-rose-700" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">{a.title}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {a.details} · {a.actorName} ·{" "}
                    {format(new Date(a.createdAt), "dd MMM HH:mm", { locale: fr })}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-rose-700" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Demandes d'accès */}
      {data.accessRequests.length > 0 && (
        <section>
          <h2 className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
            <Shield className="h-4 w-4 text-amber-600" /> Demandes d&apos;accès confidentiels en attente
          </h2>
          <div className="rounded-xl border border-line bg-white">
            {data.accessRequests.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 border-b border-line p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-ink">
                    {r.requester} <span className="text-[10.5px] font-normal text-ink-3">({r.requesterRole})</span>
                  </div>
                  <div className="text-[11.5px] text-ink-2">
                    Demande : <span className="font-mono">{r.documentRef ?? "—"}</span> · {r.documentName}
                  </div>
                  <div className="text-[11px] italic text-ink-3">« {r.reason} »</div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => decide.mutate({ id: r.id, action: "approve" })}
                    className="rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11.5px] font-semibold text-emerald-700"
                  >
                    <Check className="mr-1 inline h-3 w-3" /> Approuver (7 j)
                  </button>
                  <button
                    onClick={() => setDenyingId(r.id)}
                    className="rounded border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11.5px] font-semibold text-rose-700"
                  >
                    <X className="mr-1 inline h-3 w-3" /> Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filtres journal */}
      <div className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-2">
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line-2 bg-white px-2 text-[12.5px]"
        >
          {ACTION_FILTERS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 px-2 text-[12.5px]">
          <input
            type="checkbox"
            checked={anomalyOnly}
            onChange={(e) => {
              setAnomalyOnly(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 accent-rose-500"
          />
          Afficher uniquement les anomalies
        </label>
      </div>

      {/* Tableau journal */}
      <section className="rounded-xl border border-line bg-white">
        <header className="border-b border-line px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-ink">Journal d&apos;activité documentaire</h2>
        </header>
        {data.journal.length === 0 ? (
          <p className="p-4 text-[12px] text-ink-3">Aucun événement enregistré.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[12.5px]">
                <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Utilisateur</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                    <th className="px-3 py-2 text-left font-medium">Cible</th>
                    <th className="px-3 py-2 text-left font-medium">IP</th>
                    <th className="px-3 py-2 text-left font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.journal.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => e.anomaly && setOpenAnomalyId(e.id)}
                      className={clsx(
                        "border-t border-line",
                        e.anomaly && "cursor-pointer bg-rose-50/30 hover:bg-rose-100/40",
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-2">
                        {format(new Date(e.createdAt), "dd/MM HH:mm:ss", { locale: fr })}
                      </td>
                      <td className="px-3 py-2 text-ink-2">{e.actorName}</td>
                      <td className="px-3 py-2 font-medium text-ink">
                        {ACTION_LABEL[e.action] ?? e.action}
                      </td>
                      <td className="px-3 py-2 text-ink-2">{e.documentName ?? e.spaceName ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-3">{e.ipAddress ?? "—"}</td>
                      <td className="px-3 py-2">
                        {e.anomaly ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-semibold text-rose-700">
                            Anomalie
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 p-3 md:hidden">
              {data.journal.map((e) => (
                <div
                  key={e.id}
                  className={clsx(
                    "rounded-lg border border-line p-3 text-[12px]",
                    e.anomaly && "border-rose-200 bg-rose-50/30"
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <div className="font-mono text-[11px] text-ink-3">
                      {format(new Date(e.createdAt), "dd/MM HH:mm", { locale: fr })}
                    </div>
                    {e.anomaly && (
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                        Anomalie
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-ink">{ACTION_LABEL[e.action] ?? e.action}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {e.actorName} → {e.documentName ?? e.spaceName ?? "—"}
                  </div>
                </div>
              ))}
            </div>
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[12px]">
                <span className="text-ink-3">
                  Page {data.pagination.page} / {data.pagination.totalPages} · {data.pagination.total} événements
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded border border-line-2 px-2 py-1 disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <button
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded border border-line-2 px-2 py-1 disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Drawer anomalie */}
      <AnomalyDetailDrawer
        anomalyId={openAnomalyId}
        readOnly={!canResolve}
        onClose={() => setOpenAnomalyId(null)}
      />

      {/* Dialogs */}
      {showComplianceReport && <ComplianceReportDialog onClose={() => setShowComplianceReport(false)} />}
      {showIso9001 && <Iso9001ReadinessChecklist onClose={() => setShowIso9001(false)} />}

      {/* Modale refus */}
      {denyingId && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setDenyingId(null)} aria-hidden />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl border border-line bg-white shadow-2xl">
              <header className="border-b border-line px-4 py-3">
                <h3 className="text-[14px] font-semibold text-ink">Refuser l&apos;accès</h3>
              </header>
              <div className="p-4">
                <label className="block text-[11px] font-medium text-ink-2">
                  Motif (obligatoire)
                </label>
                <textarea
                  rows={4}
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  placeholder="Ex: confidentialité, accès non justifié…"
                  className="mt-1 w-full rounded-md border border-line-2 bg-white p-2 text-[12.5px]"
                />
              </div>
              <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">
                <button
                  onClick={() => setDenyingId(null)}
                  className="rounded border border-line-2 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-2"
                >
                  Annuler
                </button>
                <button
                  disabled={!denyReason.trim()}
                  onClick={async () => {
                    await decide.mutateAsync({ id: denyingId, action: "deny", reason: denyReason });
                    setDenyingId(null);
                    setDenyReason("");
                  }}
                  className="rounded bg-rose-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Refuser
                </button>
              </footer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
