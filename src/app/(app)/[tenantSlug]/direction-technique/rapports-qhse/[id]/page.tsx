"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Send, Download, AlertOctagon, CheckCircle2, Lock } from "lucide-react";
import { clsx } from "clsx";
import { useQhseReport, useUpdateQhseReport, useSubmitQhseReport, type QhseReportStatus } from "@/hooks/useQhseMonthlyReports";

const STATUS_LABEL: Record<QhseReportStatus, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis au DG",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};
const STATUS_CLS: Record<QhseReportStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-sky-100 text-sky-800",
  VALIDATED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

export default function QhseMonthlyReportEditPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string; id: string }>();
  const { data: report, isLoading } = useQhseReport(params.id);
  const update = useUpdateQhseReport(params.id);
  const submit = useSubmitQhseReport(params.id);

  const [form, setForm] = useState({
    period: "",
    periodLabel: "",
    totalHoursWorked: "0",
    totalIncidents: 0,
    lostTimeIncidents: 0,
    noLostTimeIncidents: 0,
    daysLost: 0,
    tf1: 0,
    tg: 0,
    daysWithoutAccident: 0,
    cutsCount: 0,
    fallsCount: 0,
    electricalCount: 0,
    chemicalCount: 0,
    vehiclesCount: 0,
    otherCount: 0,
    internalAudits: 0,
    externalAudits: 0,
    inspectionsCount: 0,
    observationsCount: 0,
    ncOpened: 0,
    ncClosed: 0,
    ncCritical: 0,
    ncOverdue: 0,
    safetyTrainings: 0,
    trainingHours: 0,
    personsTrained: 0,
    epiDistributed: 0,
    epiCheckCompliance: 0,
    executiveSummary: "",
    incidentsAnalysis: "",
    auditFindings: "",
    ncAnalysis: "",
    trainingsAnalysis: "",
    epiAnalysis: "",
    actionPlans: "",
    trendsAnalysis: "",
    chsctRecommendations: "",
  });

  useEffect(() => {
    if (!report) return;
    setForm({
      period: report.period.slice(0, 10),
      periodLabel: report.periodLabel ?? "",
      totalHoursWorked: report.totalHoursWorked,
      totalIncidents: report.totalIncidents,
      lostTimeIncidents: report.lostTimeIncidents,
      noLostTimeIncidents: report.noLostTimeIncidents,
      daysLost: report.daysLost,
      tf1: report.tf1,
      tg: report.tg,
      daysWithoutAccident: report.daysWithoutAccident,
      cutsCount: report.cutsCount,
      fallsCount: report.fallsCount,
      electricalCount: report.electricalCount,
      chemicalCount: report.chemicalCount,
      vehiclesCount: report.vehiclesCount,
      otherCount: report.otherCount,
      internalAudits: report.internalAudits,
      externalAudits: report.externalAudits,
      inspectionsCount: report.inspectionsCount,
      observationsCount: report.observationsCount,
      ncOpened: report.ncOpened,
      ncClosed: report.ncClosed,
      ncCritical: report.ncCritical,
      ncOverdue: report.ncOverdue,
      safetyTrainings: report.safetyTrainings,
      trainingHours: report.trainingHours,
      personsTrained: report.personsTrained,
      epiDistributed: report.epiDistributed,
      epiCheckCompliance: report.epiCheckCompliance,
      executiveSummary: report.executiveSummary ?? "",
      incidentsAnalysis: report.incidentsAnalysis ?? "",
      auditFindings: report.auditFindings ?? "",
      ncAnalysis: report.ncAnalysis ?? "",
      trainingsAnalysis: report.trainingsAnalysis ?? "",
      epiAnalysis: report.epiAnalysis ?? "",
      actionPlans: report.actionPlans ?? "",
      trendsAnalysis: report.trendsAnalysis ?? "",
      chsctRecommendations: report.chsctRecommendations ?? "",
    });
  }, [report]);

  const readOnly = report?.status === "SUBMITTED" || report?.status === "VALIDATED";

  const buildPayload = () => ({
    ...form,
    periodLabel: form.periodLabel || null,
    period: form.period ? new Date(form.period).toISOString() : undefined,
  });

  // Auto-calc TF1 et TG depuis heures travaillées et incidents
  const recompute = () => {
    const hours = Number(form.totalHoursWorked);
    if (hours <= 0) return;
    const tf1 = (form.lostTimeIncidents * 1_000_000) / hours;
    const tg = (form.daysLost * 1000) / hours;
    setForm({ ...form, tf1: Number(tf1.toFixed(2)), tg: Number(tg.toFixed(2)) });
  };

  const handleSave = () => update.mutate(buildPayload());
  const handleSubmit = () => {
    if (!confirm("Soumettre au DG ?")) return;
    update.mutate(buildPayload(), { onSuccess: () => submit.mutate() });
  };

  if (isLoading || !report) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push(`/${params.tenantSlug}/direction-technique/rapports-qhse`)} className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white hover:bg-surface-alt">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink">Rapport QHSE — {form.periodLabel || form.period}</h1>
          <p className="text-[12px] text-ink-3">
            Auteur : {report.author.name} · Statut :{" "}
            <span className={clsx("ml-1 inline-block rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_CLS[report.status])}>{STATUS_LABEL[report.status]}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(report.status === "SUBMITTED" || report.status === "VALIDATED") && (
            <a href={`/api/qhse/monthly-reports/${report.id}/pdf`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">
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
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-rose-800"><AlertOctagon className="h-3.5 w-3.5" /> Rapport refusé</div>
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

      <Card title="1. Période">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mois (1er)"><input type="date" disabled={readOnly} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className={inputCls} /></Field>
          <Field label="Libellé"><input disabled={readOnly} value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="2. Sinistralité globale" action={!readOnly ? <button onClick={recompute} className="inline-flex h-7 items-center gap-1 rounded border border-line bg-white px-2 text-[11px] hover:bg-surface-alt" title="Recalculer TF1 et TG">⟲ Recalcul TF1/TG</button> : null}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Heures travaillées (mois)"><input type="number" min={0} disabled={readOnly} value={form.totalHoursWorked} onChange={(e) => setForm({ ...form, totalHoursWorked: e.target.value })} className={inputCls} /></Field>
          <Field label="Total incidents"><input type="number" min={0} disabled={readOnly} value={form.totalIncidents} onChange={(e) => setForm({ ...form, totalIncidents: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Avec arrêt (LTI)"><input type="number" min={0} disabled={readOnly} value={form.lostTimeIncidents} onChange={(e) => setForm({ ...form, lostTimeIncidents: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Sans arrêt"><input type="number" min={0} disabled={readOnly} value={form.noLostTimeIncidents} onChange={(e) => setForm({ ...form, noLostTimeIncidents: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Jours perdus cumulés"><input type="number" min={0} disabled={readOnly} value={form.daysLost} onChange={(e) => setForm({ ...form, daysLost: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="TF1"><input type="number" min={0} step="0.01" disabled={readOnly} value={form.tf1} onChange={(e) => setForm({ ...form, tf1: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="TG"><input type="number" min={0} step="0.01" disabled={readOnly} value={form.tg} onChange={(e) => setForm({ ...form, tg: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Jours sans accident"><input type="number" min={0} disabled={readOnly} value={form.daysWithoutAccident} onChange={(e) => setForm({ ...form, daysWithoutAccident: Number(e.target.value) })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="3. Typologie des incidents">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <Field label="Coupures"><input type="number" min={0} disabled={readOnly} value={form.cutsCount} onChange={(e) => setForm({ ...form, cutsCount: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Chutes"><input type="number" min={0} disabled={readOnly} value={form.fallsCount} onChange={(e) => setForm({ ...form, fallsCount: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Électrique"><input type="number" min={0} disabled={readOnly} value={form.electricalCount} onChange={(e) => setForm({ ...form, electricalCount: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Chimique"><input type="number" min={0} disabled={readOnly} value={form.chemicalCount} onChange={(e) => setForm({ ...form, chemicalCount: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Véhicules"><input type="number" min={0} disabled={readOnly} value={form.vehiclesCount} onChange={(e) => setForm({ ...form, vehiclesCount: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Autres"><input type="number" min={0} disabled={readOnly} value={form.otherCount} onChange={(e) => setForm({ ...form, otherCount: Number(e.target.value) })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="4. Audits & inspections">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Audits internes"><input type="number" min={0} disabled={readOnly} value={form.internalAudits} onChange={(e) => setForm({ ...form, internalAudits: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Audits externes"><input type="number" min={0} disabled={readOnly} value={form.externalAudits} onChange={(e) => setForm({ ...form, externalAudits: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Inspections terrain"><input type="number" min={0} disabled={readOnly} value={form.inspectionsCount} onChange={(e) => setForm({ ...form, inspectionsCount: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Observations"><input type="number" min={0} disabled={readOnly} value={form.observationsCount} onChange={(e) => setForm({ ...form, observationsCount: Number(e.target.value) })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="5. Non-conformités">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="NC ouvertes (mois)"><input type="number" min={0} disabled={readOnly} value={form.ncOpened} onChange={(e) => setForm({ ...form, ncOpened: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="NC clôturées"><input type="number" min={0} disabled={readOnly} value={form.ncClosed} onChange={(e) => setForm({ ...form, ncClosed: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="NC critiques"><input type="number" min={0} disabled={readOnly} value={form.ncCritical} onChange={(e) => setForm({ ...form, ncCritical: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="NC en retard"><input type="number" min={0} disabled={readOnly} value={form.ncOverdue} onChange={(e) => setForm({ ...form, ncOverdue: Number(e.target.value) })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="6. Formations sécurité">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Sessions"><input type="number" min={0} disabled={readOnly} value={form.safetyTrainings} onChange={(e) => setForm({ ...form, safetyTrainings: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Heures de formation"><input type="number" min={0} step="0.5" disabled={readOnly} value={form.trainingHours} onChange={(e) => setForm({ ...form, trainingHours: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Personnes formées"><input type="number" min={0} disabled={readOnly} value={form.personsTrained} onChange={(e) => setForm({ ...form, personsTrained: Number(e.target.value) })} className={inputCls} /></Field>
        </div>
      </Card>

      <Card title="7. EPI & équipements">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <Field label="EPI distribués"><input type="number" min={0} disabled={readOnly} value={form.epiDistributed} onChange={(e) => setForm({ ...form, epiDistributed: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Conformité contrôles EPI (%)"><input type="number" min={0} max={100} step="0.1" disabled={readOnly} value={form.epiCheckCompliance} onChange={(e) => setForm({ ...form, epiCheckCompliance: Number(e.target.value) })} className={inputCls} /></Field>
        </div>
      </Card>

      <Narrative index={8} title="Synthèse direction" value={form.executiveSummary} onChange={(v) => setForm({ ...form, executiveSummary: v })} readOnly={readOnly} />
      <Narrative index={9} title="Analyse des incidents" value={form.incidentsAnalysis} onChange={(v) => setForm({ ...form, incidentsAnalysis: v })} readOnly={readOnly} />
      <Narrative index={10} title="Constats d'audits" value={form.auditFindings} onChange={(v) => setForm({ ...form, auditFindings: v })} readOnly={readOnly} />
      <Narrative index={11} title="Analyse des non-conformités" value={form.ncAnalysis} onChange={(v) => setForm({ ...form, ncAnalysis: v })} readOnly={readOnly} />
      <Narrative index={12} title="Bilan formations" value={form.trainingsAnalysis} onChange={(v) => setForm({ ...form, trainingsAnalysis: v })} readOnly={readOnly} />
      <Narrative index={13} title="Bilan EPI" value={form.epiAnalysis} onChange={(v) => setForm({ ...form, epiAnalysis: v })} readOnly={readOnly} />
      <Narrative index={14} title="Plans d'action en cours" value={form.actionPlans} onChange={(v) => setForm({ ...form, actionPlans: v })} readOnly={readOnly} />
      <Narrative index={15} title="Analyse tendances" value={form.trendsAnalysis} onChange={(v) => setForm({ ...form, trendsAnalysis: v })} readOnly={readOnly} />
      <Narrative index={16} title="Recommandations CHSCT" value={form.chsctRecommendations} onChange={(v) => setForm({ ...form, chsctRecommendations: v })} readOnly={readOnly} highlight />

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

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-3.5 shadow-card">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-ink">{title}</h3>
        {action}
      </div>
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
