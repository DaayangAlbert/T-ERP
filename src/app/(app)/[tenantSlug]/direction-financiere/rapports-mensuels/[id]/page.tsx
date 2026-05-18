"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Briefcase,
  Coins,
  Receipt,
  CreditCard,
  ScrollText,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useDafMonthlyReport,
  useUpdateDafReport,
  useSubmitDafReport,
  type DafReportDetail,
} from "@/hooks/useDafMonthlyReports";

const STATUS_LABEL = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis au DG",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
} as const;

const STATUS_CLS = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-sky-100 text-sky-800",
  VALIDATED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
} as const;

function fmtMonth(iso: string) {
  const s = new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type DraftState = {
  // numeric/text fields stored as strings for input control
  [K in keyof DafReportDetail]?: string | boolean;
};

const BIGINT_FIELDS = [
  "revenueMonthXAF",
  "revenueYtdXAF",
  "revenueBudgetMonthXAF",
  "expensesMonthXAF",
  "grossMarginXAF",
  "netMarginXAF",
  "ebitdaXAF",
  "cashBalanceXAF",
  "cashVariationXAF",
  "creditLinesUsedXAF",
  "creditLinesAvailableXAF",
  "capacityAutofinancingXAF",
  "accountsReceivableXAF",
  "overdueReceivablesXAF",
  "doubtfulReceivablesXAF",
  "accountsPayableXAF",
  "overduePayablesXAF",
  "workingCapitalNeedXAF",
  "financialDebtLtXAF",
  "financialDebtStXAF",
  "capexMonthXAF",
  "payrollMassMonthXAF",
  "vatCollectedXAF",
  "vatDeductibleXAF",
  "vatDueXAF",
  "corporateTaxProvisionXAF",
] as const;

const FLOAT_FIELDS = [
  "grossMarginPercent",
  "netMarginPercent",
  "ebitdaPercent",
  "dso",
  "dpo",
  "gearingPercent",
  "payrollVsRevenuePercent",
] as const;

const INT_FIELDS = ["payrollHeadcount", "fiscalDeadlinesNext30d"] as const;

const NARRATIVE_FIELDS = [
  { key: "executiveSummary", label: "Synthèse exécutive", highlight: true },
  { key: "performanceAnalysis", label: "Analyse de la performance financière (P&L)" },
  { key: "cashFlowAnalysis", label: "Analyse trésorerie" },
  { key: "receivablesAnalysis", label: "Analyse créances / recouvrement" },
  { key: "payablesAnalysis", label: "Analyse fournisseurs" },
  { key: "fiscalAnalysis", label: "Fiscal & réglementaire" },
  { key: "financialRisks", label: "Risques financiers identifiés", highlight: true },
  { key: "financialDecisions", label: "Décisions financières du mois" },
  { key: "recommendations", label: "Recommandations / arbitrages COMEX", highlight: true },
  { key: "nextMonthOutlook", label: "Prévisions mois suivant" },
] as const;

export default function DafReportDetailPage() {
  const params = useParams<{ tenantSlug: string; id: string }>();
  const router = useRouter();
  const { data: report, isLoading } = useDafMonthlyReport(params.id);
  const update = useUpdateDafReport(params.id);
  const submit = useSubmitDafReport(params.id);

  const [draft, setDraft] = useState<DraftState>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (report) {
      const next: DraftState = {};
      for (const k of BIGINT_FIELDS) next[k] = (report[k] as string) ?? "0";
      for (const k of FLOAT_FIELDS) next[k] = String(report[k] ?? 0);
      for (const k of INT_FIELDS) next[k] = String(report[k] ?? 0);
      next.socialChargesUpToDate = report.socialChargesUpToDate;
      for (const f of NARRATIVE_FIELDS) {
        const k = f.key as keyof DafReportDetail;
        next[k] = (report[k] as string) ?? "";
      }
      setDraft(next);
    }
  }, [report]);

  const editable = useMemo(
    () => report?.status === "DRAFT" || report?.status === "REJECTED",
    [report?.status],
  );

  const setField = (k: keyof DafReportDetail, v: string | boolean) => {
    setDraft((s) => ({ ...s, [k]: v }));
    setFeedback(null);
  };

  const save = () => {
    const payload: Record<string, unknown> = {};
    for (const k of BIGINT_FIELDS) payload[k] = (draft[k] as string) || "0";
    for (const k of FLOAT_FIELDS) payload[k] = Number((draft[k] as string) || 0);
    for (const k of INT_FIELDS) payload[k] = Number((draft[k] as string) || 0);
    payload.socialChargesUpToDate = Boolean(draft.socialChargesUpToDate);
    for (const f of NARRATIVE_FIELDS) {
      payload[f.key] = (draft[f.key as keyof DafReportDetail] as string) || null;
    }
    update.mutate(payload, {
      onSuccess: () => setFeedback("Modifications enregistrées."),
      onError: (e: Error) => setFeedback(e.message),
    });
  };

  const handleSubmit = () => {
    submit.mutate(undefined, {
      onSuccess: () => setFeedback("Rapport soumis au DG."),
      onError: (e: Error) => setFeedback(e.message),
    });
  };

  if (isLoading || !report) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-2.5">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() =>
              router.push(`/${params.tenantSlug}/direction-financiere/rapports-mensuels`)
            }
            className="mb-1 inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-violet-700"
          >
            <ArrowLeft className="h-3 w-3" /> Liste des rapports
          </button>
          <h1 className="text-[20px] font-bold text-ink">
            Rapport financier — {report.periodLabel ?? fmtMonth(report.period)}
          </h1>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            Auteur : {report.author.name}
            {report.author.position ? ` · ${report.author.position}` : ""}
            {report.submittedAt && (
              <>
                {" "}· soumis {new Date(report.submittedAt).toLocaleDateString("fr-FR")}
              </>
            )}
          </p>
        </div>
        <span className={clsx("rounded px-2 py-0.5 text-[11px] font-semibold", STATUS_CLS[report.status])}>
          {STATUS_LABEL[report.status]}
        </span>
      </header>

      {report.status === "REJECTED" && report.rejectionReason && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12.5px] text-rose-800">
          <AlertOctagon className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <div className="font-semibold">Motif de refus du DG</div>
            <p className="mt-0.5">{report.rejectionReason}</p>
          </div>
        </div>
      )}

      {report.status === "VALIDATED" && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[12.5px] text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          <div>
            <span className="font-semibold">Validé par {report.validatedBy}</span>
            {report.validatedAt && (
              <> le {new Date(report.validatedAt).toLocaleDateString("fr-FR")}</>
            )}
          </div>
        </div>
      )}

      {feedback && (
        <div className="rounded-lg border border-line bg-surface-alt p-2.5 text-[12px] text-ink-2">
          {feedback}
        </div>
      )}

      {/* 1) Performance financière */}
      <Section icon={TrendingUp} title="Performance financière (P&L mensuel)" tone="violet">
        <Grid>
          <Field label="CA mois (FCFA)" value={draft.revenueMonthXAF as string} onChange={(v) => setField("revenueMonthXAF", v)} disabled={!editable} />
          <Field label="CA YTD (FCFA)" value={draft.revenueYtdXAF as string} onChange={(v) => setField("revenueYtdXAF", v)} disabled={!editable} />
          <Field label="CA budgété mois (FCFA)" value={draft.revenueBudgetMonthXAF as string} onChange={(v) => setField("revenueBudgetMonthXAF", v)} disabled={!editable} />
          <Field label="Charges mois (FCFA)" value={draft.expensesMonthXAF as string} onChange={(v) => setField("expensesMonthXAF", v)} disabled={!editable} />
          <Field label="Marge brute (FCFA)" value={draft.grossMarginXAF as string} onChange={(v) => setField("grossMarginXAF", v)} disabled={!editable} />
          <Field label="Marge brute (%)" value={draft.grossMarginPercent as string} onChange={(v) => setField("grossMarginPercent", v)} disabled={!editable} step="0.1" />
          <Field label="Marge nette (FCFA)" value={draft.netMarginXAF as string} onChange={(v) => setField("netMarginXAF", v)} disabled={!editable} />
          <Field label="Marge nette (%)" value={draft.netMarginPercent as string} onChange={(v) => setField("netMarginPercent", v)} disabled={!editable} step="0.1" />
          <Field label="EBITDA (FCFA)" value={draft.ebitdaXAF as string} onChange={(v) => setField("ebitdaXAF", v)} disabled={!editable} />
          <Field label="EBITDA (%)" value={draft.ebitdaPercent as string} onChange={(v) => setField("ebitdaPercent", v)} disabled={!editable} step="0.1" />
        </Grid>
      </Section>

      {/* 2) Trésorerie */}
      <Section icon={Coins} title="Trésorerie" tone="emerald">
        <Grid>
          <Field label="Solde trésorerie (FCFA)" value={draft.cashBalanceXAF as string} onChange={(v) => setField("cashBalanceXAF", v)} disabled={!editable} />
          <Field label="Variation vs mois précédent (FCFA)" value={draft.cashVariationXAF as string} onChange={(v) => setField("cashVariationXAF", v)} disabled={!editable} />
          <Field label="Lignes crédit utilisées (FCFA)" value={draft.creditLinesUsedXAF as string} onChange={(v) => setField("creditLinesUsedXAF", v)} disabled={!editable} />
          <Field label="Lignes crédit disponibles (FCFA)" value={draft.creditLinesAvailableXAF as string} onChange={(v) => setField("creditLinesAvailableXAF", v)} disabled={!editable} />
          <Field label="CAF du mois (FCFA)" value={draft.capacityAutofinancingXAF as string} onChange={(v) => setField("capacityAutofinancingXAF", v)} disabled={!editable} />
        </Grid>
      </Section>

      {/* 3) Créances clients */}
      <Section icon={Receipt} title="Créances clients (BFR)" tone="amber">
        <Grid>
          <Field label="Encours clients total (FCFA)" value={draft.accountsReceivableXAF as string} onChange={(v) => setField("accountsReceivableXAF", v)} disabled={!editable} />
          <Field label="Créances échues (FCFA)" value={draft.overdueReceivablesXAF as string} onChange={(v) => setField("overdueReceivablesXAF", v)} disabled={!editable} />
          <Field label="Créances douteuses (FCFA)" value={draft.doubtfulReceivablesXAF as string} onChange={(v) => setField("doubtfulReceivablesXAF", v)} disabled={!editable} />
          <Field label="DSO (jours)" value={draft.dso as string} onChange={(v) => setField("dso", v)} disabled={!editable} step="0.1" />
        </Grid>
      </Section>

      {/* 4) Dettes fournisseurs */}
      <Section icon={Briefcase} title="Dettes fournisseurs" tone="slate">
        <Grid>
          <Field label="Encours fournisseurs total (FCFA)" value={draft.accountsPayableXAF as string} onChange={(v) => setField("accountsPayableXAF", v)} disabled={!editable} />
          <Field label="Dettes échues (FCFA)" value={draft.overduePayablesXAF as string} onChange={(v) => setField("overduePayablesXAF", v)} disabled={!editable} />
          <Field label="DPO (jours)" value={draft.dpo as string} onChange={(v) => setField("dpo", v)} disabled={!editable} step="0.1" />
        </Grid>
      </Section>

      {/* 5) Structure financière */}
      <Section icon={TrendingUp} title="Structure financière" tone="violet">
        <Grid>
          <Field label="BFR (FCFA)" value={draft.workingCapitalNeedXAF as string} onChange={(v) => setField("workingCapitalNeedXAF", v)} disabled={!editable} />
          <Field label="Dette financière LT (FCFA)" value={draft.financialDebtLtXAF as string} onChange={(v) => setField("financialDebtLtXAF", v)} disabled={!editable} />
          <Field label="Dette financière CT (FCFA)" value={draft.financialDebtStXAF as string} onChange={(v) => setField("financialDebtStXAF", v)} disabled={!editable} />
          <Field label="Gearing (%)" value={draft.gearingPercent as string} onChange={(v) => setField("gearingPercent", v)} disabled={!editable} step="0.1" />
          <Field label="CAPEX du mois (FCFA)" value={draft.capexMonthXAF as string} onChange={(v) => setField("capexMonthXAF", v)} disabled={!editable} />
        </Grid>
      </Section>

      {/* 6) Paie */}
      <Section icon={CreditCard} title="Paie & masse salariale" tone="emerald">
        <Grid>
          <Field label="Masse salariale mois (FCFA, brut+charges)" value={draft.payrollMassMonthXAF as string} onChange={(v) => setField("payrollMassMonthXAF", v)} disabled={!editable} />
          <Field label="Effectifs payés" value={draft.payrollHeadcount as string} onChange={(v) => setField("payrollHeadcount", v)} disabled={!editable} step="1" />
          <Field label="Masse / CA (%)" value={draft.payrollVsRevenuePercent as string} onChange={(v) => setField("payrollVsRevenuePercent", v)} disabled={!editable} step="0.1" />
        </Grid>
      </Section>

      {/* 7) Fiscal */}
      <Section icon={ScrollText} title="Fiscal & réglementaire" tone="amber">
        <Grid>
          <Field label="TVA collectée (FCFA)" value={draft.vatCollectedXAF as string} onChange={(v) => setField("vatCollectedXAF", v)} disabled={!editable} />
          <Field label="TVA déductible (FCFA)" value={draft.vatDeductibleXAF as string} onChange={(v) => setField("vatDeductibleXAF", v)} disabled={!editable} />
          <Field label="TVA solde à payer (FCFA)" value={draft.vatDueXAF as string} onChange={(v) => setField("vatDueXAF", v)} disabled={!editable} />
          <Field label="IS provisionné (FCFA)" value={draft.corporateTaxProvisionXAF as string} onChange={(v) => setField("corporateTaxProvisionXAF", v)} disabled={!editable} />
          <Field label="Échéances fiscales ≤ 30 j" value={draft.fiscalDeadlinesNext30d as string} onChange={(v) => setField("fiscalDeadlinesNext30d", v)} disabled={!editable} step="1" />
          <label className="flex flex-col gap-1 text-[11.5px]">
            <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Cotisations sociales à jour</span>
            <select
              value={String(draft.socialChargesUpToDate ?? true)}
              onChange={(e) => setField("socialChargesUpToDate", e.target.value === "true")}
              disabled={!editable}
              className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px] disabled:bg-surface-alt"
            >
              <option value="true">Oui</option>
              <option value="false">Non — en retard</option>
            </select>
          </label>
        </Grid>
      </Section>

      {/* Narratives */}
      {NARRATIVE_FIELDS.map((f) => (
        <NarrativeSection
          key={f.key}
          label={f.label}
          value={(draft[f.key] as string) ?? ""}
          onChange={(v) => setField(f.key, v)}
          disabled={!editable}
          highlight={"highlight" in f ? f.highlight : false}
        />
      ))}

      {editable && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-line bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            onClick={save}
            disabled={update.isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {update.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm("Soumettre ce rapport au DG ? Vous ne pourrez plus l'éditer tant qu'il n'est pas refusé.")) return;
              save();
              setTimeout(handleSubmit, 250);
            }}
            disabled={submit.isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {submit.isPending ? "Soumission..." : "Soumettre au DG"}
          </button>
        </div>
      )}

      {report.status === "SUBMITTED" && (
        <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-[12.5px] text-sky-800">
          <Clock className="h-4 w-4" /> Rapport en attente de décision du DG.
        </div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  tone: "violet" | "emerald" | "amber" | "slate";
  children: React.ReactNode;
}) {
  const toneCls = {
    violet: "border-violet-200 bg-violet-50/30",
    emerald: "border-emerald-200 bg-emerald-50/30",
    amber: "border-amber-200 bg-amber-50/30",
    slate: "border-slate-200 bg-slate-50/30",
  }[tone];
  const iconCls = {
    violet: "text-violet-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    slate: "text-slate-600",
  }[tone];
  return (
    <section className={clsx("rounded-xl border p-3", toneCls)}>
      <h2 className={clsx("mb-2.5 flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wide", iconCls)}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  disabled,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] uppercase tracking-wide text-ink-3">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        step={step ?? "1"}
        className="h-9 rounded-md border border-line bg-white px-2 text-right text-[12.5px] font-mono tabular-nums disabled:bg-surface-alt"
      />
    </label>
  );
}

function NarrativeSection({
  label,
  value,
  onChange,
  disabled,
  highlight,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <section
      className={clsx(
        "rounded-xl border p-3",
        highlight ? "border-amber-300 bg-amber-50/40" : "border-line bg-white",
      )}
    >
      <h2
        className={clsx(
          "mb-1.5 text-[12.5px] font-bold uppercase tracking-wide",
          highlight ? "text-amber-800" : "text-violet-700",
        )}
      >
        {label}
      </h2>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className="w-full rounded-md border border-line bg-white p-2 text-[12.5px] disabled:bg-surface-alt"
      />
    </section>
  );
}
