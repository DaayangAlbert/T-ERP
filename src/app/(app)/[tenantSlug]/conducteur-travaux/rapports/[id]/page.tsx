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
} from "lucide-react";
import { clsx } from "clsx";
import {
  useWeeklyReport,
  useUpdateWeeklyReport,
  useSubmitWeeklyReport,
  useAvailableSites,
  type SiteSnapshot,
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

export default function CdtWeeklyReportEditPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string; id: string }>();
  const { data: report, isLoading } = useWeeklyReport(params.id);
  const update = useUpdateWeeklyReport(params.id);
  const submit = useSubmitWeeklyReport(params.id);
  const available = useAvailableSites();

  // Form state
  const [form, setForm] = useState({
    weekStart: "",
    weekEnd: "",
    weekLabel: "",
    workingDays: 5,
    weatherDays: 0,
    subcontractorsPresent: 0,
    globalSummary: "",
    keyAchievements: "",
    transverseIssues: "",
    scheduleSlippages: "",
    arbitrationsNeeded: "",
    nextWeekPlan: "",
  });
  const [sites, setSites] = useState<SiteSnapshot[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!report) return;
    setForm({
      weekStart: report.weekStart.slice(0, 10),
      weekEnd: report.weekEnd.slice(0, 10),
      weekLabel: report.weekLabel ?? "",
      workingDays: report.workingDays,
      weatherDays: report.weatherDays,
      subcontractorsPresent: report.subcontractorsPresent,
      globalSummary: report.globalSummary ?? "",
      keyAchievements: report.keyAchievements ?? "",
      transverseIssues: report.transverseIssues ?? "",
      scheduleSlippages: report.scheduleSlippages ?? "",
      arbitrationsNeeded: report.arbitrationsNeeded ?? "",
      nextWeekPlan: report.nextWeekPlan ?? "",
    });
    setSites(report.sites);
  }, [report]);

  const readOnly = report?.status === "SUBMITTED" || report?.status === "VALIDATED";

  const handleSave = () => {
    update.mutate({
      ...form,
      weekLabel: form.weekLabel || null,
      sites: sites.map((s) => ({
        siteId: s.siteId,
        physicalProgressPercent: s.physicalProgressPercent,
        financialProgressPercent: s.financialProgressPercent,
        valueProducedXAF: s.valueProducedXAF,
        avgWorkforce: s.avgWorkforce,
        hseIncidentsCount: s.hseIncidentsCount,
        milestonesAchieved: s.milestonesAchieved,
        milestonesAtRisk: s.milestonesAtRisk,
        notes: s.notes,
      })),
    });
  };

  const handleSubmit = () => {
    if (!confirm("Soumettre ce rapport au Directeur de Travaux ?\nIl ne sera plus modifiable jusqu'à la décision.")) return;
    handleSaveAndSubmit();
  };

  const handleSaveAndSubmit = () => {
    update.mutate(
      {
        ...form,
        weekLabel: form.weekLabel || null,
        sites: sites.map((s) => ({
          siteId: s.siteId,
          physicalProgressPercent: s.physicalProgressPercent,
          financialProgressPercent: s.financialProgressPercent,
          valueProducedXAF: s.valueProducedXAF,
          avgWorkforce: s.avgWorkforce,
          hseIncidentsCount: s.hseIncidentsCount,
          milestonesAchieved: s.milestonesAchieved,
          milestonesAtRisk: s.milestonesAtRisk,
          notes: s.notes,
        })),
      },
      { onSuccess: () => submit.mutate() },
    );
  };

  const candidates = useMemo(() => {
    const taken = new Set(sites.map((s) => s.siteId));
    return (available.data?.items ?? []).filter((s) => !taken.has(s.id));
  }, [sites, available.data?.items]);

  if (isLoading || !report) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(`/${params.tenantSlug}/conducteur-travaux/rapports`)}
          className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white hover:bg-surface-alt"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink">
            Rapport hebdomadaire {form.weekLabel || `${form.weekStart} → ${form.weekEnd}`}
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
              href={`/api/cdt/weekly-reports/${report.id}/pdf`}
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
                <Send className="h-3.5 w-3.5" /> Soumettre au DTrav
              </button>
            </>
          )}
        </div>
      </div>

      {report.status === "REJECTED" && report.rejectionReason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-rose-800">
            <AlertOctagon className="h-3.5 w-3.5" /> Rapport refusé — motif du DTrav
          </div>
          <p className="mt-1 text-[12px] text-rose-700">{report.rejectionReason}</p>
        </div>
      )}

      {report.status === "VALIDATED" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> Rapport validé par {report.validatedBy} le {report.validatedAt ? new Date(report.validatedAt).toLocaleDateString("fr-FR") : "—"}
          </div>
        </div>
      )}

      {readOnly && report.status === "SUBMITTED" && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-sky-800">
            <Lock className="h-3.5 w-3.5" /> En attente de validation — modifications verrouillées
          </div>
        </div>
      )}

      {/* Section 1 — Cadre semaine */}
      <Card title="1. Cadre de la semaine">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Lundi">
            <input
              type="date"
              disabled={readOnly}
              value={form.weekStart}
              onChange={(e) => setForm({ ...form, weekStart: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Dimanche">
            <input
              type="date"
              disabled={readOnly}
              value={form.weekEnd}
              onChange={(e) => setForm({ ...form, weekEnd: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Libellé semaine (option)">
            <input
              disabled={readOnly}
              value={form.weekLabel}
              onChange={(e) => setForm({ ...form, weekLabel: e.target.value })}
              placeholder="Semaine 12 — 16/03 → 22/03"
              className={inputCls}
            />
          </Field>
          <Field label="Jours travaillés">
            <input
              type="number"
              min={0}
              max={7}
              disabled={readOnly}
              value={form.workingDays}
              onChange={(e) => setForm({ ...form, workingDays: Number(e.target.value) })}
              className={inputCls}
            />
          </Field>
          <Field label="Jours intempéries">
            <input
              type="number"
              min={0}
              max={7}
              disabled={readOnly}
              value={form.weatherDays}
              onChange={(e) => setForm({ ...form, weatherDays: Number(e.target.value) })}
              className={inputCls}
            />
          </Field>
          <Field label="Sous-traitants présents">
            <input
              type="number"
              min={0}
              disabled={readOnly}
              value={form.subcontractorsPresent}
              onChange={(e) => setForm({ ...form, subcontractorsPresent: Number(e.target.value) })}
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      {/* Section 2 — Chantiers couverts */}
      <Card
        title={`2. Chantiers couverts (${sites.length})`}
        action={
          !readOnly && candidates.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-violet-600 px-2 text-[11.5px] font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-3 w-3" /> Ajouter un chantier
            </button>
          ) : null
        }
      >
        {sites.length === 0 ? (
          <p className="text-[12.5px] italic text-ink-3">Aucun chantier dans ce rapport. Ajoutez-en pour pouvoir soumettre.</p>
        ) : (
          <div className="space-y-2">
            {sites.map((s, idx) => (
              <SiteSnapshotCard
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

      {/* Sections narratives */}
      <NarrativeCard
        index={3}
        title="Synthèse globale"
        value={form.globalSummary}
        onChange={(v) => setForm({ ...form, globalSummary: v })}
        readOnly={readOnly}
        placeholder="Vue d'ensemble de la semaine, faits marquants transverses..."
      />
      <NarrativeCard
        index={4}
        title="Réalisations clés transverses"
        value={form.keyAchievements}
        onChange={(v) => setForm({ ...form, keyAchievements: v })}
        readOnly={readOnly}
        placeholder="Une réalisation par ligne — visible dans le tableau de bord du DTrav"
      />
      <NarrativeCard
        index={5}
        title="Difficultés &amp; risques transverses"
        value={form.transverseIssues}
        onChange={(v) => setForm({ ...form, transverseIssues: v })}
        readOnly={readOnly}
        placeholder="Difficultés impactant plusieurs chantiers : appro, RH, sous-traitance..."
      />
      <NarrativeCard
        index={6}
        title="Glissements planning &amp; jalons à risque"
        value={form.scheduleSlippages}
        onChange={(v) => setForm({ ...form, scheduleSlippages: v })}
        readOnly={readOnly}
        placeholder="Glissements identifiés et causes, jalons sous surveillance"
      />
      <NarrativeCard
        index={7}
        title="Arbitrages demandés au DTrav"
        value={form.arbitrationsNeeded}
        onChange={(v) => setForm({ ...form, arbitrationsNeeded: v })}
        readOnly={readOnly}
        placeholder="Décisions ou ressources à obtenir au-dessus de votre niveau"
      />
      <NarrativeCard
        index={8}
        title="Programme semaine suivante"
        value={form.nextWeekPlan}
        onChange={(v) => setForm({ ...form, nextWeekPlan: v })}
        readOnly={readOnly}
        placeholder="Priorités, jalons cibles, ressources nécessaires"
      />

      {update.error && (
        <p className="rounded bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {(update.error as Error).message}
        </p>
      )}

      {showAdd && (
        <AddSiteModal
          candidates={candidates}
          onClose={() => setShowAdd(false)}
          onAdd={(siteId) => {
            const cand = candidates.find((c) => c.id === siteId);
            if (!cand) return;
            setSites([
              ...sites,
              {
                siteId: cand.id,
                site: {
                  id: cand.id,
                  code: cand.code,
                  name: cand.name,
                  client: cand.client,
                  region: cand.region,
                  physicalProgress: cand.physicalProgress,
                  financialProgress: cand.financialProgress,
                },
                physicalProgressPercent: cand.physicalProgress,
                financialProgressPercent: cand.financialProgress,
                valueProducedXAF: "0",
                avgWorkforce: cand.suggestedAvgWorkforce,
                hseIncidentsCount: cand.suggestedHseIncidents,
                milestonesAchieved: null,
                milestonesAtRisk: null,
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

function SiteSnapshotCard({
  snapshot,
  readOnly,
  onChange,
  onRemove,
}: {
  snapshot: SiteSnapshot;
  readOnly: boolean;
  onChange: (patch: Partial<SiteSnapshot>) => void;
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
          <button
            type="button"
            onClick={onRemove}
            className="grid h-6 w-6 place-items-center rounded text-rose-600 hover:bg-white"
            title="Retirer ce chantier"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Field label="% physique">
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            disabled={readOnly}
            value={snapshot.physicalProgressPercent}
            onChange={(e) => onChange({ physicalProgressPercent: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
        <Field label="% financier">
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            disabled={readOnly}
            value={snapshot.financialProgressPercent}
            onChange={(e) => onChange({ financialProgressPercent: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
        <Field label="Valeur prod. (FCFA)">
          <input
            type="number"
            min={0}
            disabled={readOnly}
            value={snapshot.valueProducedXAF}
            onChange={(e) => onChange({ valueProducedXAF: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Effectif moy.">
          <input
            type="number"
            min={0}
            disabled={readOnly}
            value={snapshot.avgWorkforce}
            onChange={(e) => onChange({ avgWorkforce: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
        <Field label="Incidents HSE">
          <input
            type="number"
            min={0}
            disabled={readOnly}
            value={snapshot.hseIncidentsCount}
            onChange={(e) => onChange({ hseIncidentsCount: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="Jalons atteints">
          <textarea
            rows={2}
            disabled={readOnly}
            value={snapshot.milestonesAchieved ?? ""}
            onChange={(e) => onChange({ milestonesAchieved: e.target.value })}
            className={textareaCls}
          />
        </Field>
        <Field label="Jalons à risque">
          <textarea
            rows={2}
            disabled={readOnly}
            value={snapshot.milestonesAtRisk ?? ""}
            onChange={(e) => onChange({ milestonesAtRisk: e.target.value })}
            className={textareaCls}
          />
        </Field>
      </div>
      <Field label="Notes spécifiques">
        <textarea
          rows={2}
          disabled={readOnly}
          value={snapshot.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          className={textareaCls}
        />
      </Field>
    </div>
  );
}

function NarrativeCard({
  index,
  title,
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  index: number;
  title: string;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  placeholder?: string;
}) {
  return (
    <Card title={`${index}. ${title}`}>
      <textarea
        rows={4}
        disabled={readOnly}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={textareaCls}
      />
    </Card>
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
      <span className="mb-1 block text-[11.5px] font-semibold text-ink-2">{label}</span>
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
  candidates: Array<{ id: string; code: string; name: string; client: string; physicalProgress: number; suggestedAvgWorkforce: number; suggestedHseIncidents: number }>;
  onClose: () => void;
  onAdd: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">Ajouter un chantier au rapport</h2>
          <button onClick={onClose} className="text-ink-3 hover:text-ink">✕</button>
        </div>
        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
          {candidates.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onAdd(c.id)}
                className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-alt"
              >
                <div>
                  <div className="text-[13px] font-bold text-ink">{c.code} — {c.name}</div>
                  <div className="text-[10.5px] text-ink-3">{c.client}</div>
                </div>
                <div className="text-right text-[11px] text-ink-3">
                  <div>Avancement : <span className="font-semibold text-ink">{c.physicalProgress.toFixed(1)} %</span></div>
                  <div>Effectif suggéré : {c.suggestedAvgWorkforce} · HSE : {c.suggestedHseIncidents}</div>
                </div>
              </button>
            </li>
          ))}
          {candidates.length === 0 && (
            <li className="p-4 text-center text-[12px] text-ink-3">Tous les chantiers actifs sont déjà inclus.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
