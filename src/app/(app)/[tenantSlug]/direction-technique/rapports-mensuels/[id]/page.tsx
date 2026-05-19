"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Download,
  Plus,
  Trash2,
  AlertOctagon,
  CheckCircle2,
  Lock,
  X,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useDtMonthlyReport,
  useUpdateDtReport,
  useSubmitDtReport,
  useAutoFillDtReport,
  usePortfolioSites,
  type DtSiteSnapshot,
  type DtReportStatus,
} from "@/hooks/useDtMonthlyReports";

const STATUS_LABEL: Record<DtReportStatus, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis au DG",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

const STATUS_CLS: Record<DtReportStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-sky-100 text-sky-800",
  VALIDATED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

const RISK_OPTIONS: Array<{ value: "LOW" | "MEDIUM" | "HIGH"; label: string; cls: string }> = [
  { value: "LOW", label: "Faible", cls: "text-emerald-700" },
  { value: "MEDIUM", label: "Moyen", cls: "text-amber-700" },
  { value: "HIGH", label: "Élevé", cls: "text-rose-700" },
];

export default function DtMonthlyReportEditPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string; id: string }>();
  const { data: report, isLoading } = useDtMonthlyReport(params.id);
  const update = useUpdateDtReport(params.id);
  const submit = useSubmitDtReport(params.id);
  const autoFill = useAutoFillDtReport(params.id);
  const portfolio = usePortfolioSites();

  const [form, setForm] = useState({
    period: "",
    periodLabel: "",
    sitesActiveCount: 0,
    sitesCompletedCount: 0,
    sitesAtRiskCount: 0,
    avgPhysicalProgress: 0,
    avgFinancialProgress: 0,
    totalRevenueXAF: "0",
    totalSpentXAF: "0",
    portfolioMarginPercent: 0,
    hseTotalIncidents: 0,
    hseTf1: 0,
    hseAuditsConducted: 0,
    hseNcOpen: 0,
    subcontractorsActive: 0,
    subcontractorsAtRisk: 0,
    executiveSummary: "",
    financialAnalysis: "",
    qhseAnalysis: "",
    subcontractingAnalysis: "",
    majorRisks: "",
    technicalDecisions: "",
    recommendations: "",
    nextMonthOutlook: "",
  });
  const [sites, setSites] = useState<DtSiteSnapshot[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!report) return;
    setForm({
      period: report.period.slice(0, 10),
      periodLabel: report.periodLabel ?? "",
      sitesActiveCount: report.sitesActiveCount,
      sitesCompletedCount: report.sitesCompletedCount,
      sitesAtRiskCount: report.sitesAtRiskCount,
      avgPhysicalProgress: report.avgPhysicalProgress,
      avgFinancialProgress: report.avgFinancialProgress,
      totalRevenueXAF: report.totalRevenueXAF,
      totalSpentXAF: report.totalSpentXAF,
      portfolioMarginPercent: report.portfolioMarginPercent,
      hseTotalIncidents: report.hseTotalIncidents,
      hseTf1: report.hseTf1,
      hseAuditsConducted: report.hseAuditsConducted,
      hseNcOpen: report.hseNcOpen,
      subcontractorsActive: report.subcontractorsActive,
      subcontractorsAtRisk: report.subcontractorsAtRisk,
      executiveSummary: report.executiveSummary ?? "",
      financialAnalysis: report.financialAnalysis ?? "",
      qhseAnalysis: report.qhseAnalysis ?? "",
      subcontractingAnalysis: report.subcontractingAnalysis ?? "",
      majorRisks: report.majorRisks ?? "",
      technicalDecisions: report.technicalDecisions ?? "",
      recommendations: report.recommendations ?? "",
      nextMonthOutlook: report.nextMonthOutlook ?? "",
    });
    setSites(report.sites);
  }, [report]);

  const readOnly = report?.status === "SUBMITTED" || report?.status === "VALIDATED";

  const buildPayload = () => ({
    ...form,
    periodLabel: form.periodLabel || null,
    period: form.period ? new Date(form.period).toISOString() : undefined,
    sites: sites.map((s) => ({
      siteId: s.siteId,
      physicalProgressPercent: s.physicalProgressPercent,
      financialProgressPercent: s.financialProgressPercent,
      marginPercent: s.marginPercent,
      revenueMonthXAF: s.revenueMonthXAF,
      hseIncidentsCount: s.hseIncidentsCount,
      ncOpenCount: s.ncOpenCount,
      riskLevel: s.riskLevel,
      notes: s.notes,
    })),
  });

  const handleSave = () => update.mutate(buildPayload());
  const handleSubmit = () => {
    if (!confirm("Soumettre ce rapport au DG ?\nIl ne sera plus modifiable jusqu'à la décision.")) return;
    update.mutate(buildPayload(), { onSuccess: () => submit.mutate() });
  };

  // Auto-recalcul des KPI portefeuille à partir des snapshots sites
  const recomputeFromSites = () => {
    if (sites.length === 0) return;
    const avgPhy = sites.reduce((s, x) => s + x.physicalProgressPercent, 0) / sites.length;
    const avgFin = sites.reduce((s, x) => s + x.financialProgressPercent, 0) / sites.length;
    const avgMar = sites.reduce((s, x) => s + x.marginPercent, 0) / sites.length;
    const totalRev = sites.reduce((s, x) => s + Number(x.revenueMonthXAF || "0"), 0);
    const totalInc = sites.reduce((s, x) => s + x.hseIncidentsCount, 0);
    const totalNc = sites.reduce((s, x) => s + x.ncOpenCount, 0);
    const atRisk = sites.filter((s) => s.riskLevel === "HIGH").length;
    setForm({
      ...form,
      avgPhysicalProgress: Number(avgPhy.toFixed(1)),
      avgFinancialProgress: Number(avgFin.toFixed(1)),
      portfolioMarginPercent: Number(avgMar.toFixed(1)),
      totalRevenueXAF: String(totalRev),
      hseTotalIncidents: totalInc,
      hseNcOpen: totalNc,
      sitesActiveCount: sites.length,
      sitesAtRiskCount: atRisk,
    });
  };

  const candidates = useMemo(() => {
    const taken = new Set(sites.map((s) => s.siteId));
    return (portfolio.data?.items ?? []).filter((s) => !taken.has(s.id));
  }, [sites, portfolio.data?.items]);

  if (isLoading || !report) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(`/${params.tenantSlug}/direction-technique/rapports-mensuels`)}
          className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white hover:bg-surface-alt"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink">
            Rapport mensuel technique — {form.periodLabel || form.period}
          </h1>
          <p className="text-[12px] text-ink-3">
            Auteur : {report.author.name} · Statut :{" "}
            <span className={clsx("ml-1 inline-block rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_CLS[report.status])}>
              {STATUS_LABEL[report.status]}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(report.status === "SUBMITTED" || report.status === "VALIDATED") && (
            <a
              href={`/api/dt/monthly-reports/${report.id}/pdf`}
              target="_blank"
              rel="noopener"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </a>
          )}
          {!readOnly && (
            <>
              <button
                onClick={() => {
                  if (!confirm("Pré-remplir les KPIs portefeuille depuis la base de données ?\n\nCela écrasera : nombre de chantiers (actifs/terminés/à risque), avancement moyen, CA portefeuille, marge moyenne, incidents HSE du mois.")) return;
                  autoFill.mutate(undefined, {
                    onSuccess: (res) => {
                      alert(
                        `Pré-rempli depuis la DB · ${res.filledFields.length} champs\n\n${res.filledFields.join(", ")}\n\nSources : ${res.sources.sites} chantiers · ${res.sources.billings} factures · ${res.sources.incidents} incidents HSE`,
                      );
                    },
                    onError: (e: Error) => alert(e.message),
                  });
                }}
                disabled={autoFill.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 text-[12.5px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" /> {autoFill.isPending ? "Calcul..." : "Pré-remplir depuis la DB"}
              </button>
              <button
                onClick={handleSave}
                disabled={update.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" /> {update.isPending ? "Sauvegarde..." : "Enregistrer"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={update.isPending || submit.isPending || sites.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                title={sites.length === 0 ? "Ajoutez au moins un chantier" : undefined}
              >
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
          <Lock className="inline h-3.5 w-3.5" /> En attente de validation DG — modifications verrouillées
        </div>
      )}

      {/* 1 — Cadre */}
      <Card title="1. Période & cadrage">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Mois (1er)">
            <input type="date" disabled={readOnly} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Libellé (option)">
            <input disabled={readOnly} value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} placeholder="Avril 2026" className={inputCls} />
          </Field>
          <Field label="Chantiers actifs">
            <input type="number" min={0} disabled={readOnly} value={form.sitesActiveCount} onChange={(e) => setForm({ ...form, sitesActiveCount: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Chantiers à risque">
            <input type="number" min={0} disabled={readOnly} value={form.sitesAtRiskCount} onChange={(e) => setForm({ ...form, sitesAtRiskCount: Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>
      </Card>

      {/* 2 — Chantiers */}
      <Card
        title={`2. Tableau de bord chantiers (${sites.length})`}
        action={
          <div className="flex gap-1.5">
            {!readOnly && sites.length > 0 && (
              <button onClick={recomputeFromSites} className="inline-flex h-7 items-center gap-1 rounded border border-line bg-white px-2 text-[11px] hover:bg-surface-alt" title="Recalculer les agrégats à partir des chantiers">
                ⟲ Recalculer agrégats
              </button>
            )}
            {!readOnly && candidates.length > 0 && (
              <button onClick={() => setShowAdd(true)} className="inline-flex h-7 items-center gap-1 rounded bg-violet-600 px-2 text-[11px] font-semibold text-white hover:bg-violet-700">
                <Plus className="h-3 w-3" /> Ajouter
              </button>
            )}
          </div>
        }
      >
        {sites.length === 0 ? (
          <p className="text-[12.5px] italic text-ink-3">Aucun chantier. Ajoutez les chantiers représentatifs du portefeuille.</p>
        ) : (
          <div className="space-y-2">
            {sites.map((s, idx) => (
              <SiteRow
                key={s.siteId}
                snapshot={s}
                readOnly={readOnly}
                onChange={(patch) =>
                  setSites((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
                }
                onRemove={() => setSites((prev) => prev.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
        )}
      </Card>

      {/* 3 — KPI portefeuille */}
      <Card title="3. KPIs portefeuille consolidés">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Avct physique moyen (%)">
            <input type="number" min={0} max={100} step="0.1" disabled={readOnly} value={form.avgPhysicalProgress} onChange={(e) => setForm({ ...form, avgPhysicalProgress: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Avct financier moyen (%)">
            <input type="number" min={0} max={100} step="0.1" disabled={readOnly} value={form.avgFinancialProgress} onChange={(e) => setForm({ ...form, avgFinancialProgress: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="CA produit (FCFA)">
            <input type="number" min={0} disabled={readOnly} value={form.totalRevenueXAF} onChange={(e) => setForm({ ...form, totalRevenueXAF: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Dépenses (FCFA)">
            <input type="number" min={0} disabled={readOnly} value={form.totalSpentXAF} onChange={(e) => setForm({ ...form, totalSpentXAF: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Marge portefeuille (%)">
            <input type="number" step="0.1" disabled={readOnly} value={form.portfolioMarginPercent} onChange={(e) => setForm({ ...form, portfolioMarginPercent: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Chantiers terminés">
            <input type="number" min={0} disabled={readOnly} value={form.sitesCompletedCount} onChange={(e) => setForm({ ...form, sitesCompletedCount: Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>
      </Card>

      {/* 4 — HSE */}
      <Card title="4. Indicateurs QHSE consolidés">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Incidents HSE (total)">
            <input type="number" min={0} disabled={readOnly} value={form.hseTotalIncidents} onChange={(e) => setForm({ ...form, hseTotalIncidents: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="TF1 (taux fréq.)">
            <input type="number" min={0} step="0.01" disabled={readOnly} value={form.hseTf1} onChange={(e) => setForm({ ...form, hseTf1: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Audits réalisés">
            <input type="number" min={0} disabled={readOnly} value={form.hseAuditsConducted} onChange={(e) => setForm({ ...form, hseAuditsConducted: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Non-conformités ouvertes">
            <input type="number" min={0} disabled={readOnly} value={form.hseNcOpen} onChange={(e) => setForm({ ...form, hseNcOpen: Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>
      </Card>

      {/* 5 — Sous-traitance */}
      <Card title="5. Sous-traitance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Sous-traitants actifs">
            <input type="number" min={0} disabled={readOnly} value={form.subcontractorsActive} onChange={(e) => setForm({ ...form, subcontractorsActive: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Sous-traitants à risque">
            <input type="number" min={0} disabled={readOnly} value={form.subcontractorsAtRisk} onChange={(e) => setForm({ ...form, subcontractorsAtRisk: Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>
      </Card>

      {/* Sections narratives */}
      <Narrative index={6} title="Synthèse direction" value={form.executiveSummary} onChange={(v) => setForm({ ...form, executiveSummary: v })} readOnly={readOnly} />
      <Narrative index={7} title="Analyse financière" value={form.financialAnalysis} onChange={(v) => setForm({ ...form, financialAnalysis: v })} readOnly={readOnly} />
      <Narrative index={8} title="Analyse QHSE" value={form.qhseAnalysis} onChange={(v) => setForm({ ...form, qhseAnalysis: v })} readOnly={readOnly} />
      <Narrative index={9} title="Sous-traitance & sinistralité" value={form.subcontractingAnalysis} onChange={(v) => setForm({ ...form, subcontractingAnalysis: v })} readOnly={readOnly} />
      <Narrative index={10} title="Risques majeurs portefeuille" value={form.majorRisks} onChange={(v) => setForm({ ...form, majorRisks: v })} readOnly={readOnly} />
      <Narrative index={11} title="Décisions techniques engagées" value={form.technicalDecisions} onChange={(v) => setForm({ ...form, technicalDecisions: v })} readOnly={readOnly} />
      <Narrative index={12} title="Recommandations / arbitrages COMEX" value={form.recommendations} onChange={(v) => setForm({ ...form, recommendations: v })} readOnly={readOnly} highlight />
      <Narrative index={13} title="Vision du mois suivant" value={form.nextMonthOutlook} onChange={(v) => setForm({ ...form, nextMonthOutlook: v })} readOnly={readOnly} />

      {update.error && (
        <p className="rounded bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{(update.error as Error).message}</p>
      )}

      {showAdd && (
        <AddSiteModal
          candidates={candidates}
          onClose={() => setShowAdd(false)}
          onAdd={(siteId) => {
            const c = candidates.find((x) => x.id === siteId);
            if (!c) return;
            setSites([
              ...sites,
              {
                siteId: c.id,
                site: { id: c.id, code: c.code, name: c.name, client: c.client, region: c.region },
                physicalProgressPercent: c.physicalProgress,
                financialProgressPercent: c.financialProgress,
                marginPercent: c.margin,
                revenueMonthXAF: "0",
                hseIncidentsCount: c.suggestedHseIncidents,
                ncOpenCount: c.suggestedNcOpen,
                riskLevel: null,
                notes: null,
              },
            ]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function SiteRow({
  snapshot,
  readOnly,
  onChange,
  onRemove,
}: {
  snapshot: DtSiteSnapshot;
  readOnly: boolean;
  onChange: (patch: Partial<DtSiteSnapshot>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-alt/30 p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[13px] font-bold text-ink">{snapshot.site?.code} — {snapshot.site?.name}</div>
          <div className="text-[10.5px] text-ink-3">{snapshot.site?.client}{snapshot.site?.region ? ` · ${snapshot.site.region}` : ""}</div>
        </div>
        {!readOnly && (
          <button onClick={onRemove} className="grid h-6 w-6 place-items-center rounded text-rose-600 hover:bg-white" title="Retirer">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-7">
        <Field label="% phys.">
          <input type="number" min={0} max={100} step="0.1" disabled={readOnly} value={snapshot.physicalProgressPercent} onChange={(e) => onChange({ physicalProgressPercent: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="% fin.">
          <input type="number" min={0} max={100} step="0.1" disabled={readOnly} value={snapshot.financialProgressPercent} onChange={(e) => onChange({ financialProgressPercent: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="Marge %">
          <input type="number" step="0.1" disabled={readOnly} value={snapshot.marginPercent} onChange={(e) => onChange({ marginPercent: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="CA mois (FCFA)">
          <input type="number" min={0} disabled={readOnly} value={snapshot.revenueMonthXAF} onChange={(e) => onChange({ revenueMonthXAF: e.target.value })} className={inputCls} />
        </Field>
        <Field label="HSE">
          <input type="number" min={0} disabled={readOnly} value={snapshot.hseIncidentsCount} onChange={(e) => onChange({ hseIncidentsCount: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="NC">
          <input type="number" min={0} disabled={readOnly} value={snapshot.ncOpenCount} onChange={(e) => onChange({ ncOpenCount: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="Risque">
          <select disabled={readOnly} value={snapshot.riskLevel ?? ""} onChange={(e) => onChange({ riskLevel: (e.target.value || null) as "LOW" | "MEDIUM" | "HIGH" | null })} className={inputCls}>
            <option value="">—</option>
            {RISK_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notes">
        <textarea rows={2} disabled={readOnly} value={snapshot.notes ?? ""} onChange={(e) => onChange({ notes: e.target.value })} className={textareaCls} />
      </Field>
    </div>
  );
}

function Narrative({
  index,
  title,
  value,
  onChange,
  readOnly,
  highlight,
}: {
  index: number;
  title: string;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  highlight?: boolean;
}) {
  return (
    <section className={clsx("rounded-xl border bg-white p-3.5 shadow-card", highlight ? "border-amber-300" : "border-line")}>
      <h3 className={clsx("mb-2 text-[13.5px] font-bold", highlight ? "text-amber-800" : "text-ink")}>
        {index}. {title}
      </h3>
      <textarea rows={5} disabled={readOnly} value={value} onChange={(e) => onChange(e.target.value)} className={textareaCls} />
    </section>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
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

const inputCls =
  "h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:bg-slate-50 disabled:text-ink-3";

const textareaCls =
  "w-full rounded-md border border-line bg-white p-2 text-[12.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:bg-slate-50 disabled:text-ink-3";

function AddSiteModal({
  candidates,
  onClose,
  onAdd,
}: {
  candidates: Array<{ id: string; code: string; name: string; client: string; status: string; physicalProgress: number; margin: number }>;
  onClose: () => void;
  onAdd: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">Ajouter un chantier au rapport</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
          {candidates.map((c) => (
            <li key={c.id}>
              <button onClick={() => onAdd(c.id)} className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-alt">
                <div>
                  <div className="text-[13px] font-bold text-ink">{c.code} — {c.name}</div>
                  <div className="text-[10.5px] text-ink-3">{c.client} · {c.status}</div>
                </div>
                <div className="text-right text-[11px] text-ink-3">
                  <div>Phys. <span className="font-semibold text-ink">{c.physicalProgress.toFixed(1)} %</span></div>
                  <div>Marge {c.margin.toFixed(1)} %</div>
                </div>
              </button>
            </li>
          ))}
          {candidates.length === 0 && <li className="p-4 text-center text-[12px] text-ink-3">Tous les chantiers sont déjà inclus.</li>}
        </ul>
      </div>
    </div>
  );
}
