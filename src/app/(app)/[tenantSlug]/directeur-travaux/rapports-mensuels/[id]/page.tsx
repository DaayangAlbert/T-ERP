"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Send, Download, AlertOctagon, CheckCircle2, Lock } from "lucide-react";
import { clsx } from "clsx";
import { useDtravReport, useUpdateDtravReport, useSubmitDtravReport, type DtravReportStatus } from "@/hooks/useDtravMonthlyReports";

const STATUS_LABEL: Record<DtravReportStatus, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis au DG",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};
const STATUS_CLS: Record<DtravReportStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-sky-100 text-sky-800",
  VALIDATED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

export default function DtravMonthlyReportEditPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string; id: string }>();
  const { data: report, isLoading } = useDtravReport(params.id);
  const update = useUpdateDtravReport(params.id);
  const submit = useSubmitDtravReport(params.id);

  const [form, setForm] = useState({
    period: "",
    periodLabel: "",
    revenueProducedXAF: "0",
    revenueDeliveredXAF: "0",
    marginPercent: 0,
    sitesDelivered: 0,
    receivablesXAF: "0",
    overdueReceivablesXAF: "0",
    dso: 0,
    decompteIssuedCount: 0,
    decompteIssuedXAF: "0",
    amendmentsCount: 0,
    penaltiesAppliedXAF: "0",
    litigationsOpen: 0,
    cdtCount: 0,
    cdtReportsValidated: 0,
    cdtUnderperforming: 0,
    workforceTotal: 0,
    workforceOvertimeHours: 0,
    workforceCostXAF: "0",
    executiveSummary: "",
    productionAnalysis: "",
    collectionsAnalysis: "",
    contractualSituation: "",
    cdtPerformance: "",
    workforceAnalysis: "",
    majorIssues: "",
    arbitragesRequested: "",
    nextMonthStrategy: "",
  });

  useEffect(() => {
    if (!report) return;
    setForm({
      period: report.period.slice(0, 10),
      periodLabel: report.periodLabel ?? "",
      revenueProducedXAF: report.revenueProducedXAF,
      revenueDeliveredXAF: report.revenueDeliveredXAF,
      marginPercent: report.marginPercent,
      sitesDelivered: report.sitesDelivered,
      receivablesXAF: report.receivablesXAF,
      overdueReceivablesXAF: report.overdueReceivablesXAF,
      dso: report.dso,
      decompteIssuedCount: report.decompteIssuedCount,
      decompteIssuedXAF: report.decompteIssuedXAF,
      amendmentsCount: report.amendmentsCount,
      penaltiesAppliedXAF: report.penaltiesAppliedXAF,
      litigationsOpen: report.litigationsOpen,
      cdtCount: report.cdtCount,
      cdtReportsValidated: report.cdtReportsValidated,
      cdtUnderperforming: report.cdtUnderperforming,
      workforceTotal: report.workforceTotal,
      workforceOvertimeHours: report.workforceOvertimeHours,
      workforceCostXAF: report.workforceCostXAF,
      executiveSummary: report.executiveSummary ?? "",
      productionAnalysis: report.productionAnalysis ?? "",
      collectionsAnalysis: report.collectionsAnalysis ?? "",
      contractualSituation: report.contractualSituation ?? "",
      cdtPerformance: report.cdtPerformance ?? "",
      workforceAnalysis: report.workforceAnalysis ?? "",
      majorIssues: report.majorIssues ?? "",
      arbitragesRequested: report.arbitragesRequested ?? "",
      nextMonthStrategy: report.nextMonthStrategy ?? "",
    });
  }, [report]);

  const readOnly = report?.status === "SUBMITTED" || report?.status === "VALIDATED";

  const buildPayload = () => ({
    ...form,
    periodLabel: form.periodLabel || null,
    period: form.period ? new Date(form.period).toISOString() : undefined,
  });

  const handleSave = () => update.mutate(buildPayload());
  const handleSubmit = () => {
    if (!confirm("Soumettre au DG ?")) return;
    update.mutate(buildPayload(), { onSuccess: () => submit.mutate() });
  };

  if (isLoading || !report) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push(`/${params.tenantSlug}/directeur-travaux/rapports-mensuels`)} className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white hover:bg-surface-alt">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink">Rapport mensuel DTrav — {form.periodLabel || form.period}</h1>
          <p className="text-[12px] text-ink-3">
            Auteur : {report.author.name} · Statut :{" "}
            <span className={clsx("ml-1 inline-block rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_CLS[report.status])}>
              {STATUS_LABEL[report.status]}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(report.status === "SUBMITTED" || report.status === "VALIDATED") && (
            <a href={`/api/dtrav/monthly-reports/${report.id}/pdf`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">
              <Download className="h-3.5 w-3.5" /> PDF
            </a>
          )}
          {!readOnly && (
            <>
              <button onClick={handleSave} disabled={update.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt disabled:opacity-60">
                <Save className="h-3.5 w-3.5" /> {update.isPending ? "Sauvegarde..." : "Enregistrer"}
              </button>
              <button onClick={handleSubmit} disabled={update.isPending || submit.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                <Send className="h-3.5 w-3.5" /> Soumettre au DG
              </button>
            </>
          )}
        </div>
      </div>

      {report.status === "REJECTED" && report.rejectionReason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-rose-800">
            <AlertOctagon className="h-3.5 w-3.5" /> Rapport refusé — motif du DG
          </div>
          <p className="mt-1 text-[12px] text-rose-700">{report.rejectionReason}</p>
        </div>
      )}
      {report.status === "VALIDATED" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[12.5px] font-bold text-emerald-800">
          <CheckCircle2 className="inline h-3.5 w-3.5" /> Validé par {report.validatedBy} le {report.validatedAt ? new Date(report.validatedAt).toLocaleDateString("fr-FR") : "—"}
        </div>
      )}
      {readOnly && report.status === "SUBMITTED" && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-[12.5px] font-bold text-sky-800">
          <Lock className="inline h-3.5 w-3.5" /> En attente de validation DG — verrouillé
        </div>
      )}

      <Card title="1. Période & cadrage">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Mois (1er)"><input type="date" disabled={readOnly} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className={inputCls} /></Field>
          <Field label="Libellé"><input disabled={readOnly} value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="2. Production">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="CA produit (FCFA)"><input type="number" min={0} disabled={readOnly} value={form.revenueProducedXAF} onChange={(e) => setForm({ ...form, revenueProducedXAF: e.target.value })} className={inputCls} /></Field>
          <Field label="CA livré (FCFA)"><input type="number" min={0} disabled={readOnly} value={form.revenueDeliveredXAF} onChange={(e) => setForm({ ...form, revenueDeliveredXAF: e.target.value })} className={inputCls} /></Field>
          <Field label="Marge (%)"><input type="number" step="0.1" disabled={readOnly} value={form.marginPercent} onChange={(e) => setForm({ ...form, marginPercent: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Chantiers livrés"><input type="number" min={0} disabled={readOnly} value={form.sitesDelivered} onChange={(e) => setForm({ ...form, sitesDelivered: Number(e.target.value) })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="3. Recouvrement">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Encours client (FCFA)"><input type="number" min={0} disabled={readOnly} value={form.receivablesXAF} onChange={(e) => setForm({ ...form, receivablesXAF: e.target.value })} className={inputCls} /></Field>
          <Field label="Créances en retard (FCFA)"><input type="number" min={0} disabled={readOnly} value={form.overdueReceivablesXAF} onChange={(e) => setForm({ ...form, overdueReceivablesXAF: e.target.value })} className={inputCls} /></Field>
          <Field label="DSO (jours)"><input type="number" min={0} disabled={readOnly} value={form.dso} onChange={(e) => setForm({ ...form, dso: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Décomptes émis (nb)"><input type="number" min={0} disabled={readOnly} value={form.decompteIssuedCount} onChange={(e) => setForm({ ...form, decompteIssuedCount: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Décomptes émis (FCFA)"><input type="number" min={0} disabled={readOnly} value={form.decompteIssuedXAF} onChange={(e) => setForm({ ...form, decompteIssuedXAF: e.target.value })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="4. Contractuel">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Avenants signés"><input type="number" min={0} disabled={readOnly} value={form.amendmentsCount} onChange={(e) => setForm({ ...form, amendmentsCount: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Pénalités appliquées (FCFA)"><input type="number" min={0} disabled={readOnly} value={form.penaltiesAppliedXAF} onChange={(e) => setForm({ ...form, penaltiesAppliedXAF: e.target.value })} className={inputCls} /></Field>
          <Field label="Litiges ouverts"><input type="number" min={0} disabled={readOnly} value={form.litigationsOpen} onChange={(e) => setForm({ ...form, litigationsOpen: Number(e.target.value) })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="5. Performance CDT">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="CDT supervisés"><input type="number" min={0} disabled={readOnly} value={form.cdtCount} onChange={(e) => setForm({ ...form, cdtCount: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Rapports CDT validés"><input type="number" min={0} disabled={readOnly} value={form.cdtReportsValidated} onChange={(e) => setForm({ ...form, cdtReportsValidated: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="CDT sous-performants"><input type="number" min={0} disabled={readOnly} value={form.cdtUnderperforming} onChange={(e) => setForm({ ...form, cdtUnderperforming: Number(e.target.value) })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="6. Effectifs & coûts MO">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Effectif total"><input type="number" min={0} disabled={readOnly} value={form.workforceTotal} onChange={(e) => setForm({ ...form, workforceTotal: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Heures sup. totales"><input type="number" min={0} step="0.5" disabled={readOnly} value={form.workforceOvertimeHours} onChange={(e) => setForm({ ...form, workforceOvertimeHours: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Coût MO total (FCFA)"><input type="number" min={0} disabled={readOnly} value={form.workforceCostXAF} onChange={(e) => setForm({ ...form, workforceCostXAF: e.target.value })} className={inputCls} /></Field>
        </div>
      </Card>

      <Narrative index={7} title="Synthèse direction" value={form.executiveSummary} onChange={(v) => setForm({ ...form, executiveSummary: v })} readOnly={readOnly} />
      <Narrative index={8} title="Analyse production" value={form.productionAnalysis} onChange={(v) => setForm({ ...form, productionAnalysis: v })} readOnly={readOnly} />
      <Narrative index={9} title="Analyse recouvrement" value={form.collectionsAnalysis} onChange={(v) => setForm({ ...form, collectionsAnalysis: v })} readOnly={readOnly} />
      <Narrative index={10} title="Situation contractuelle" value={form.contractualSituation} onChange={(v) => setForm({ ...form, contractualSituation: v })} readOnly={readOnly} />
      <Narrative index={11} title="Performance équipes CDT" value={form.cdtPerformance} onChange={(v) => setForm({ ...form, cdtPerformance: v })} readOnly={readOnly} />
      <Narrative index={12} title="Analyse effectifs &amp; coûts" value={form.workforceAnalysis} onChange={(v) => setForm({ ...form, workforceAnalysis: v })} readOnly={readOnly} />
      <Narrative index={13} title="Difficultés majeures" value={form.majorIssues} onChange={(v) => setForm({ ...form, majorIssues: v })} readOnly={readOnly} />
      <Narrative index={14} title="Arbitrages demandés au DG" value={form.arbitragesRequested} onChange={(v) => setForm({ ...form, arbitragesRequested: v })} readOnly={readOnly} highlight />
      <Narrative index={15} title="Plan stratégique mois suivant" value={form.nextMonthStrategy} onChange={(v) => setForm({ ...form, nextMonthStrategy: v })} readOnly={readOnly} />

      {update.error && <p className="rounded bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{(update.error as Error).message}</p>}
    </div>
  );
}

function Narrative({ index, title, value, onChange, readOnly, highlight }: { index: number; title: string; value: string; onChange: (v: string) => void; readOnly: boolean; highlight?: boolean }) {
  return (
    <section className={clsx("rounded-xl border bg-white p-3.5 shadow-card", highlight ? "border-amber-300" : "border-line")}>
      <h3 className={clsx("mb-2 text-[13.5px] font-bold", highlight ? "text-amber-800" : "text-ink")}>{index}. {title}</h3>
      <textarea rows={4} disabled={readOnly} value={value} onChange={(e) => onChange(e.target.value)} className={textareaCls} />
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-3.5 shadow-card">
      <h3 className="mb-2.5 text-[13.5px] font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:bg-slate-50 disabled:text-ink-3";
const textareaCls = "w-full rounded-md border border-line bg-white p-2 text-[12.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:bg-slate-50 disabled:text-ink-3";
