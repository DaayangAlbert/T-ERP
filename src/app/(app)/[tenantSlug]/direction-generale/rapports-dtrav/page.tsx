"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Download, AlertOctagon, X } from "lucide-react";
import { clsx } from "clsx";

interface ListItem {
  id: string;
  period: string;
  periodLabel: string | null;
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";
  author: string;
  revenueProducedXAF: string;
  marginPercent: number;
  receivablesXAF: string;
  cdtCount: number;
  submittedAt: string | null;
}

interface ReportDetail {
  id: string;
  period: string;
  periodLabel: string | null;
  author: { name: string };
  revenueProducedXAF: string;
  revenueDeliveredXAF: string;
  marginPercent: number;
  sitesDelivered: number;
  receivablesXAF: string;
  overdueReceivablesXAF: string;
  dso: number;
  decompteIssuedCount: number;
  decompteIssuedXAF: string;
  amendmentsCount: number;
  penaltiesAppliedXAF: string;
  litigationsOpen: number;
  cdtCount: number;
  cdtReportsValidated: number;
  cdtUnderperforming: number;
  workforceTotal: number;
  workforceOvertimeHours: number;
  workforceCostXAF: string;
  executiveSummary: string | null;
  productionAnalysis: string | null;
  collectionsAnalysis: string | null;
  contractualSituation: string | null;
  cdtPerformance: string | null;
  workforceAnalysis: string | null;
  majorIssues: string | null;
  arbitragesRequested: string | null;
  nextMonthStrategy: string | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function fmtMonth(iso: string) {
  const s = new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmtFCFA(n: string | number): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}

type StatusTab = "SUBMITTED" | "VALIDATED" | "REJECTED";

export default function DgDtravReportsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [statusTab, setStatusTab] = useState<StatusTab>("SUBMITTED");

  const { data, isLoading } = useQuery({
    queryKey: ["dg", "dtrav-reports", statusTab],
    queryFn: () => getJson<{ items: ListItem[] }>(`/api/dtrav/monthly-reports?status=${statusTab}`),
  });

  const tabLabel: Record<StatusTab, string> = {
    SUBMITTED: "À valider",
    VALIDATED: "Validés",
    REJECTED: "Refusés",
  };
  const emptyLabel: Record<StatusTab, string> = {
    SUBMITTED: "Aucun rapport en attente",
    VALIDATED: "Aucun rapport validé pour l'instant",
    REJECTED: "Aucun rapport refusé",
  };

  return (
    <div className="space-y-4">
      <header className="border-b border-line pb-2.5">
        <h1 className="text-[20px] font-bold text-ink">Rapports mensuels DTrav</h1>
        <p className="text-[12.5px] text-ink-3">Synthèses production / recouvrement / CDT du Directeur de Travaux</p>
      </header>

      <div className="flex gap-1 border-b border-line">
        {(["SUBMITTED", "VALIDATED", "REJECTED"] as StatusTab[]).map((t) => {
          const active = statusTab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setStatusTab(t)}
              className={clsx(
                "border-b-2 px-3 py-2 text-[12.5px] font-semibold transition",
                active
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {tabLabel[t]}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : (data?.items ?? []).length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-4 py-16 text-center">
          <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-500" />
          <p className="text-[13.5px] font-semibold text-ink">{emptyLabel[statusTab]}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data!.items.map((r) => (
            <Card key={r.id} item={r} onOpen={() => setSelected(r.id)} />
          ))}
        </div>
      )}

      {selected && (
        <ReviewModal
          reportId={selected}
          readOnly={statusTab !== "SUBMITTED"}
          onClose={() => { setSelected(null); setRejecting(false); }}
          rejecting={rejecting}
          setRejecting={setRejecting}
        />
      )}
    </div>
  );
}

function Card({ item, onOpen }: { item: ListItem; onOpen: () => void }) {
  const ageDays = item.submittedAt ? Math.floor((Date.now() - new Date(item.submittedAt).getTime()) / 86_400_000) : null;
  const statusPill =
    item.status === "VALIDATED"
      ? { label: "Validé", cls: "bg-emerald-100 text-emerald-800" }
      : item.status === "REJECTED"
        ? { label: "Refusé", cls: "bg-rose-100 text-rose-700" }
        : item.status === "DRAFT"
          ? { label: "Brouillon", cls: "bg-slate-200 text-slate-700" }
          : { label: "À valider", cls: "bg-sky-100 text-sky-800" };
  return (
    <article className="rounded-xl border border-line bg-white p-3.5 shadow-card">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-bold text-ink">{item.periodLabel ?? fmtMonth(item.period)}</h3>
          <p className="text-[11px] text-ink-3">Auteur : {item.author}</p>
        </div>
        <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold", statusPill.cls)}>
          {statusPill.label}
        </span>
      </header>

      <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
        <Kv label="CA produit" value={fmtFCFA(item.revenueProducedXAF)} />
        <Kv label="Marge" value={`${item.marginPercent.toFixed(1)} %`} />
        <Kv label="Encours" value={fmtFCFA(item.receivablesXAF)} />
      </div>

      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-ink-3">
        <span>{item.cdtCount} CDT</span>
        {ageDays !== null && <span className={clsx("ml-auto", ageDays > 5 ? "font-semibold text-amber-700" : "")}>Soumis il y a {ageDays} j</span>}
      </div>

      <button onClick={onOpen} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700">
        Examiner & décider
      </button>
    </article>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-surface-alt/40 px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className="text-[12px] font-bold text-ink">{value}</div>
    </div>
  );
}

function ReviewModal({ reportId, readOnly = false, onClose, rejecting, setRejecting }: { reportId: string; readOnly?: boolean; onClose: () => void; rejecting: boolean; setRejecting: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const { data: report, isLoading } = useQuery({
    queryKey: ["dg", "dtrav-report", reportId],
    queryFn: () => getJson<ReportDetail>(`/api/dtrav/monthly-reports/${reportId}`),
  });
  const validate = useMutation({
    mutationFn: () => getJson(`/api/dtrav/monthly-reports/${reportId}/validate`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dg"] }); onClose(); },
  });
  const reject = useMutation({
    mutationFn: () => getJson(`/api/dtrav/monthly-reports/${reportId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dg"] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Examen rapport mensuel DTrav</h2>
            {report && <p className="text-[12px] text-ink-3">Auteur : {report.author.name} · {report.periodLabel ?? fmtMonth(report.period)}</p>}
          </div>
          <div className="flex items-center gap-1">
            {report && (
              <a href={`/api/dtrav/monthly-reports/${reportId}/pdf`} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 text-[12px] hover:bg-surface-alt">
                <Download className="h-3 w-3" /> PDF
              </a>
            )}
            <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-surface-alt">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {isLoading || !report ? (
            <div className="h-64 animate-pulse rounded-md bg-surface-alt" />
          ) : (
            <>
              <Section title="KPI mensuels">
                <div className="grid grid-cols-4 gap-2 text-[12px]">
                  <KvBig label="CA produit" value={fmtFCFA(report.revenueProducedXAF)} />
                  <KvBig label="CA livré" value={fmtFCFA(report.revenueDeliveredXAF)} />
                  <KvBig label="Marge" value={`${report.marginPercent.toFixed(1)} %`} />
                  <KvBig label="Encours client" value={fmtFCFA(report.receivablesXAF)} />
                  <KvBig label="Créances en retard" value={fmtFCFA(report.overdueReceivablesXAF)} alert={Number(report.overdueReceivablesXAF) > 0} />
                  <KvBig label="DSO" value={`${report.dso} j`} alert={report.dso > 60} />
                  <KvBig label="Pénalités" value={fmtFCFA(report.penaltiesAppliedXAF)} alert={Number(report.penaltiesAppliedXAF) > 0} />
                  <KvBig label="Litiges" value={String(report.litigationsOpen)} alert={report.litigationsOpen > 0} />
                </div>
              </Section>

              <Narrative title="Synthèse direction" text={report.executiveSummary} />
              <Narrative title="Production" text={report.productionAnalysis} />
              <Narrative title="Recouvrement" text={report.collectionsAnalysis} />
              <Narrative title="Situation contractuelle" text={report.contractualSituation} />
              <Narrative title="Performance CDT" text={report.cdtPerformance} />
              <Narrative title="Effectifs & coûts MO" text={report.workforceAnalysis} />
              <Narrative title="Difficultés majeures" text={report.majorIssues} />
              <Narrative title="Arbitrages demandés au DG" text={report.arbitragesRequested} highlight />
              <Narrative title="Plan stratégique mois suivant" text={report.nextMonthStrategy} />
            </>
          )}
        </div>

        <div className="border-t border-line p-4">
          {readOnly ? (
            <div className="flex items-center justify-end gap-2">
              <button onClick={onClose} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">
                Fermer
              </button>
            </div>
          ) : !rejecting ? (
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setRejecting(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-100">
                <XCircle className="h-4 w-4" /> Refuser
              </button>
              <button onClick={() => validate.mutate()} disabled={validate.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                <CheckCircle2 className="h-4 w-4" /> {validate.isPending ? "Validation..." : "Valider"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink-2">Motif du refus <span className="text-rose-600">*</span></span>
                <textarea required rows={3} minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-line bg-white p-2 text-[12.5px]" />
              </label>
              {reject.error && <p className="text-[11.5px] text-rose-700">{(reject.error as Error).message}</p>}
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setRejecting(false)} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">Annuler</button>
                <button onClick={() => reject.mutate()} disabled={reason.length < 5 || reject.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-[12.5px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                  <XCircle className="h-4 w-4" /> Confirmer le refus
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface-alt/30 p-3">
      <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-violet-700">{title}</h3>
      {children}
    </section>
  );
}

function KvBig({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={clsx("rounded bg-white px-2 py-1.5", alert && "bg-rose-50")}>
      <div className="text-[9px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className={clsx("text-[11.5px] font-bold", alert ? "text-rose-700" : "text-ink")}>{value}</div>
    </div>
  );
}

function Narrative({ title, text, highlight }: { title: string; text: string | null; highlight?: boolean }) {
  if (!text || !text.trim()) {
    return <Section title={title}><p className="text-[12px] italic text-ink-3">— Non renseigné —</p></Section>;
  }
  return (
    <section className={clsx("rounded-lg border p-3", highlight ? "border-amber-300 bg-amber-50" : "border-line bg-surface-alt/30")}>
      <div className={clsx("mb-1 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide", highlight ? "text-amber-800" : "text-violet-700")}>
        {highlight && <AlertOctagon className="h-3 w-3" />}
        {title}
      </div>
      {text.split(/\n+/).map((line, i) => line.trim() ? <p key={i} className="text-[12px] leading-snug text-ink-2">{line.trim()}</p> : null)}
    </section>
  );
}
