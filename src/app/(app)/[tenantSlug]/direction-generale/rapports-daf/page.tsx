"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, FileText, AlertOctagon, X, Coins, Receipt, TrendingUp, ScrollText, CreditCard, Briefcase } from "lucide-react";
import { clsx } from "clsx";
import { SignatureConfirmModal } from "@/components/common/SignatureConfirmModal";

interface ListItem {
  id: string;
  period: string;
  periodLabel: string | null;
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";
  author: string;
  revenueMonthXAF: string;
  cashBalanceXAF: string;
  grossMarginPercent: number;
  overdueReceivablesXAF: string;
  dso: number;
  submittedAt: string | null;
  rejectionReason: string | null;
}

interface ReportDetail {
  id: string;
  periodLabel: string | null;
  period: string;
  status: ListItem["status"];
  author: { id: string; name: string; position: string | null };

  revenueMonthXAF: string;
  revenueYtdXAF: string;
  revenueBudgetMonthXAF: string;
  expensesMonthXAF: string;
  grossMarginXAF: string;
  grossMarginPercent: number;
  netMarginXAF: string;
  netMarginPercent: number;
  ebitdaXAF: string;
  ebitdaPercent: number;

  cashBalanceXAF: string;
  cashVariationXAF: string;
  creditLinesUsedXAF: string;
  creditLinesAvailableXAF: string;
  capacityAutofinancingXAF: string;

  accountsReceivableXAF: string;
  overdueReceivablesXAF: string;
  doubtfulReceivablesXAF: string;
  dso: number;

  accountsPayableXAF: string;
  overduePayablesXAF: string;
  dpo: number;

  workingCapitalNeedXAF: string;
  financialDebtLtXAF: string;
  financialDebtStXAF: string;
  gearingPercent: number;
  capexMonthXAF: string;

  payrollMassMonthXAF: string;
  payrollHeadcount: number;
  payrollVsRevenuePercent: number;

  vatCollectedXAF: string;
  vatDeductibleXAF: string;
  vatDueXAF: string;
  corporateTaxProvisionXAF: string;
  socialChargesUpToDate: boolean;
  fiscalDeadlinesNext30d: number;

  executiveSummary: string | null;
  performanceAnalysis: string | null;
  cashFlowAnalysis: string | null;
  receivablesAnalysis: string | null;
  payablesAnalysis: string | null;
  fiscalAnalysis: string | null;
  financialRisks: string | null;
  financialDecisions: string | null;
  recommendations: string | null;
  nextMonthOutlook: string | null;
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
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} Md FCFA`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M FCFA`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} k FCFA`;
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}

type StatusTab = "SUBMITTED" | "VALIDATED" | "REJECTED";

export default function DgDafReportsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [statusTab, setStatusTab] = useState<StatusTab>("SUBMITTED");

  const { data, isLoading } = useQuery({
    queryKey: ["dg", "daf-reports", statusTab],
    queryFn: () => getJson<{ items: ListItem[] }>(`/api/daf/monthly-reports?status=${statusTab}`),
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
        <h1 className="text-[20px] font-bold text-ink">Rapports financiers mensuels DAF</h1>
        <p className="text-[12.5px] text-ink-3">
          Validation des rapports financiers du Directeur Administratif et Financier
        </p>
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
          onClose={() => {
            setSelected(null);
            setRejecting(false);
          }}
          rejecting={rejecting}
          setRejecting={setRejecting}
        />
      )}
    </div>
  );
}

function Card({ item, onOpen }: { item: ListItem; onOpen: () => void }) {
  const submitted = item.submittedAt ? new Date(item.submittedAt) : null;
  const ageDays = submitted ? Math.floor((Date.now() - submitted.getTime()) / 86_400_000) : null;

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

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
        <KvSmall label="CA mois" value={fmtFCFA(item.revenueMonthXAF)} />
        <KvSmall label="Marge brute" value={`${item.grossMarginPercent.toFixed(1)} %`} alert={item.grossMarginPercent < 5} />
        <KvSmall label="Trésorerie" value={fmtFCFA(item.cashBalanceXAF)} />
        <KvSmall label="DSO" value={`${item.dso.toFixed(0)} j`} alert={item.dso > 90} />
      </div>

      <div className="mt-2.5 flex items-center gap-2 text-[11px]">
        <Receipt className="h-3 w-3 text-ink-3" />
        <span className={Number(item.overdueReceivablesXAF) > 0 ? "font-semibold text-amber-700" : "text-ink-2"}>
          Échu : {fmtFCFA(item.overdueReceivablesXAF)}
        </span>
        {ageDays !== null && (
          <span className={clsx("ml-auto", ageDays > 5 ? "font-semibold text-amber-700" : "text-ink-3")}>
            Soumis il y a {ageDays} jour{ageDays > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700"
      >
        Examiner &amp; décider
      </button>
    </article>
  );
}

function KvSmall({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={clsx("rounded bg-surface-alt/40 px-1.5 py-1", alert && "bg-rose-50")}>
      <div className="text-[9px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className={clsx("text-[12px] font-bold", alert ? "text-rose-700" : "text-ink")}>{value}</div>
    </div>
  );
}

function ReviewModal({
  reportId,
  readOnly = false,
  onClose,
  rejecting,
  setRejecting,
}: {
  reportId: string;
  readOnly?: boolean;
  onClose: () => void;
  rejecting: boolean;
  setRejecting: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";
  const [reason, setReason] = useState("");
  const [showSignConfirm, setShowSignConfirm] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ["dg", "daf-report", reportId],
    queryFn: () => getJson<ReportDetail>(`/api/daf/monthly-reports/${reportId}`),
  });

  const validate = useMutation({
    mutationFn: () => getJson(`/api/daf/monthly-reports/${reportId}/validate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dg"] });
      setShowSignConfirm(false);
      onClose();
    },
  });

  const reject = useMutation({
    mutationFn: () =>
      getJson(`/api/daf/monthly-reports/${reportId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dg"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Examen rapport financier mensuel</h2>
            {report && (
              <p className="text-[12px] text-ink-3">
                Auteur : {report.author.name}
                {report.author.position ? ` · ${report.author.position}` : ""} ·{" "}
                {report.periodLabel ?? fmtMonth(report.period)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {isLoading || !report ? (
            <div className="h-64 animate-pulse rounded-md bg-surface-alt" />
          ) : (
            <>
              <Section icon={TrendingUp} title="Performance financière">
                <div className="grid grid-cols-4 gap-3 text-[12px]">
                  <KV label="CA mois" value={fmtFCFA(report.revenueMonthXAF)} />
                  <KV label="CA YTD" value={fmtFCFA(report.revenueYtdXAF)} />
                  <KV label="CA budgété" value={fmtFCFA(report.revenueBudgetMonthXAF)} />
                  <KV label="Charges mois" value={fmtFCFA(report.expensesMonthXAF)} />
                  <KV label="Marge brute" value={`${report.grossMarginPercent.toFixed(1)} %`} alert={report.grossMarginPercent < 5} />
                  <KV label="Marge nette" value={`${report.netMarginPercent.toFixed(1)} %`} alert={report.netMarginPercent < 2} />
                  <KV label="EBITDA" value={fmtFCFA(report.ebitdaXAF)} />
                  <KV label="EBITDA %" value={`${report.ebitdaPercent.toFixed(1)} %`} />
                </div>
              </Section>

              <Section icon={Coins} title="Trésorerie">
                <div className="grid grid-cols-3 gap-3 text-[12px]">
                  <KV label="Solde" value={fmtFCFA(report.cashBalanceXAF)} />
                  <KV label="Δ vs M-1" value={fmtFCFA(report.cashVariationXAF)} alert={Number(report.cashVariationXAF) < 0} />
                  <KV label="CAF mois" value={fmtFCFA(report.capacityAutofinancingXAF)} />
                  <KV label="Lignes utilisées" value={fmtFCFA(report.creditLinesUsedXAF)} />
                  <KV label="Lignes dispo" value={fmtFCFA(report.creditLinesAvailableXAF)} />
                </div>
              </Section>

              <Section icon={Receipt} title="Créances clients (BFR)">
                <div className="grid grid-cols-4 gap-3 text-[12px]">
                  <KV label="Encours total" value={fmtFCFA(report.accountsReceivableXAF)} />
                  <KV label="Échues" value={fmtFCFA(report.overdueReceivablesXAF)} alert={Number(report.overdueReceivablesXAF) > 0} />
                  <KV label="Douteuses" value={fmtFCFA(report.doubtfulReceivablesXAF)} alert={Number(report.doubtfulReceivablesXAF) > 0} />
                  <KV label="DSO" value={`${report.dso.toFixed(0)} j`} alert={report.dso > 90} />
                </div>
              </Section>

              <Section icon={Briefcase} title="Dettes fournisseurs">
                <div className="grid grid-cols-3 gap-3 text-[12px]">
                  <KV label="Encours total" value={fmtFCFA(report.accountsPayableXAF)} />
                  <KV label="Échues" value={fmtFCFA(report.overduePayablesXAF)} alert={Number(report.overduePayablesXAF) > 0} />
                  <KV label="DPO" value={`${report.dpo.toFixed(0)} j`} />
                </div>
              </Section>

              <Section icon={TrendingUp} title="Structure financière">
                <div className="grid grid-cols-4 gap-3 text-[12px]">
                  <KV label="BFR" value={fmtFCFA(report.workingCapitalNeedXAF)} />
                  <KV label="Dette LT" value={fmtFCFA(report.financialDebtLtXAF)} />
                  <KV label="Dette CT" value={fmtFCFA(report.financialDebtStXAF)} />
                  <KV label="Gearing" value={`${report.gearingPercent.toFixed(1)} %`} alert={report.gearingPercent > 150} />
                  <KV label="CAPEX mois" value={fmtFCFA(report.capexMonthXAF)} />
                </div>
              </Section>

              <Section icon={CreditCard} title="Paie">
                <div className="grid grid-cols-3 gap-3 text-[12px]">
                  <KV label="Masse mois" value={fmtFCFA(report.payrollMassMonthXAF)} />
                  <KV label="Effectifs payés" value={String(report.payrollHeadcount)} />
                  <KV label="Masse / CA" value={`${report.payrollVsRevenuePercent.toFixed(1)} %`} />
                </div>
              </Section>

              <Section icon={ScrollText} title="Fiscal & réglementaire">
                <div className="grid grid-cols-3 gap-3 text-[12px]">
                  <KV label="TVA collectée" value={fmtFCFA(report.vatCollectedXAF)} />
                  <KV label="TVA déductible" value={fmtFCFA(report.vatDeductibleXAF)} />
                  <KV label="TVA due" value={fmtFCFA(report.vatDueXAF)} alert={Number(report.vatDueXAF) > 0} />
                  <KV label="IS provisionné" value={fmtFCFA(report.corporateTaxProvisionXAF)} />
                  <KV label="Échéances 30j" value={String(report.fiscalDeadlinesNext30d)} alert={report.fiscalDeadlinesNext30d > 0} />
                  <KV
                    label="Cotis. sociales"
                    value={report.socialChargesUpToDate ? "À jour" : "En retard"}
                    alert={!report.socialChargesUpToDate}
                  />
                </div>
              </Section>

              <Narrative title="Synthèse exécutive" text={report.executiveSummary} highlight />
              <Narrative title="Analyse de la performance financière" text={report.performanceAnalysis} />
              <Narrative title="Analyse trésorerie" text={report.cashFlowAnalysis} />
              <Narrative title="Analyse créances / recouvrement" text={report.receivablesAnalysis} />
              <Narrative title="Analyse fournisseurs" text={report.payablesAnalysis} />
              <Narrative title="Fiscal & réglementaire" text={report.fiscalAnalysis} />
              <Narrative title="Risques financiers" text={report.financialRisks} highlight />
              <Narrative title="Décisions financières du mois" text={report.financialDecisions} />
              <Narrative title="Recommandations / arbitrages COMEX" text={report.recommendations} highlight />
              <Narrative title="Prévisions mois suivant" text={report.nextMonthOutlook} />
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
              <button
                onClick={() => setRejecting(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                <XCircle className="h-4 w-4" /> Refuser
              </button>
              <button
                onClick={() => setShowSignConfirm(true)}
                disabled={validate.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" /> {validate.isPending ? "Validation..." : "Valider et signer"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink-2">
                  Motif du refus <span className="text-rose-600">*</span>
                </span>
                <textarea
                  required
                  rows={3}
                  minLength={5}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-md border border-line bg-white p-2 text-[12.5px]"
                />
              </label>
              {reject.error && (
                <p className="text-[11.5px] text-rose-700">{(reject.error as Error).message}</p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setRejecting(false)} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">
                  Annuler
                </button>
                <button
                  onClick={() => reject.mutate()}
                  disabled={reason.length < 5 || reject.isPending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-[12.5px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" /> Confirmer le refus
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SignatureConfirmModal
        open={showSignConfirm}
        title="Valider et signer le rapport"
        description="En validant, vous apposez votre visa sur le rapport mensuel financier (DAF). Votre signature et le cachet de la société seront enregistrés pour le PDF officiel."
        tenantSlug={tenantSlug}
        busy={validate.isPending}
        onConfirm={() => validate.mutate()}
        onClose={() => setShowSignConfirm(false)}
      />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof TrendingUp; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface-alt/30 p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-violet-700">
        <Icon className="h-3 w-3" /> {title}
      </h3>
      {children}
    </section>
  );
}

function KV({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={clsx("rounded bg-white px-2 py-1.5", alert && "bg-rose-50")}>
      <div className="text-[9px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className={clsx("text-[12px] font-bold", alert ? "text-rose-700" : "text-ink")}>{value}</div>
    </div>
  );
}

function Narrative({ title, text, highlight }: { title: string; text: string | null; highlight?: boolean }) {
  if (!text || !text.trim()) {
    return (
      <Section icon={FileText} title={title}>
        <p className="text-[12px] italic text-ink-3">— Non renseigné —</p>
      </Section>
    );
  }
  return (
    <section className={clsx("rounded-lg border p-3", highlight ? "border-amber-300 bg-amber-50" : "border-line bg-surface-alt/30")}>
      <div className={clsx("mb-1 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide", highlight ? "text-amber-800" : "text-violet-700")}>
        {highlight && <AlertOctagon className="h-3 w-3" />}
        {title}
      </div>
      {text.split(/\n+/).map((line, i) =>
        line.trim() ? <p key={i} className="text-[12px] leading-snug text-ink-2">{line.trim()}</p> : null,
      )}
    </section>
  );
}
