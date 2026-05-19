"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  Download,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  FileText,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useProgressReport,
  useUpdateProgressReport,
  useSubmitProgressReport,
} from "@/hooks/useProgressReports";
import { REPORT_TYPE_LABEL, REPORT_STATUS_LABEL } from "@/schemas/site-progress-report";

const STEPS = [
  { key: 1, title: "Période & contexte", description: "Type, période, % avancement" },
  { key: 2, title: "Réalisations & retards", description: "Achievements, delays, photos" },
  { key: 3, title: "Financier & RH", description: "Valeur produite, effectif, heures sup" },
  { key: 4, title: "HSE & blocages", description: "Incidents, issues, support" },
  { key: 5, title: "Pièces & priorités", description: "Documents joints, prochaine période" },
] as const;

interface FormState {
  reportType: "WEEKLY" | "MONTHLY" | "AD_HOC";
  period: string;
  periodLabel: string;
  physicalProgressPercent: number;
  previousProgressPercent: string;
  mainAchievements: string;
  delaysIdentified: string;
  photos: string[];
  valueProducedXAF: string;
  valueProducedCumulXAF: string;
  avgWorkforce: string;
  maxWorkforce: string;
  overtimeHoursTotal: string;
  billingStatus: string;
  hseIncidentsCount: string;
  daysWithoutAccident: string;
  issuesEncountered: string;
  supportNeeded: string;
  attachmentDocumentIds: string[];
  nextPeriodPriorities: string;
}

export default function CcReportWizardPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string; id: string }>();
  const { tenantSlug, id } = params;
  const { data: report, isLoading } = useProgressReport(id);
  const update = useUpdateProgressReport(id);
  const submit = useSubmitProgressReport(id);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Hydrate form from report
  useEffect(() => {
    if (!report) return;
    setForm({
      reportType: report.reportType,
      period: report.period.slice(0, 10),
      periodLabel: report.periodLabel ?? "",
      physicalProgressPercent: report.physicalProgressPercent,
      previousProgressPercent: report.previousProgressPercent?.toString() ?? "",
      mainAchievements: report.mainAchievements ?? "",
      delaysIdentified: report.delaysIdentified ?? "",
      photos: report.photos ?? [],
      valueProducedXAF: report.valueProducedXAF,
      valueProducedCumulXAF: report.valueProducedCumulXAF,
      avgWorkforce: String(report.avgWorkforce),
      maxWorkforce: String(report.maxWorkforce),
      overtimeHoursTotal: String(report.overtimeHoursTotal),
      billingStatus: report.billingStatus ?? "",
      hseIncidentsCount: String(report.hseIncidentsCount),
      daysWithoutAccident: String(report.daysWithoutAccident),
      issuesEncountered: report.issuesEncountered ?? "",
      supportNeeded: report.supportNeeded ?? "",
      attachmentDocumentIds: report.attachmentDocumentIds ?? [],
      nextPeriodPriorities: report.nextPeriodPriorities ?? "",
    });
  }, [report]);

  const readOnly = report && report.status !== "DRAFT" && report.status !== "REJECTED";

  const handleSave = async (overrides?: Partial<FormState>): Promise<boolean> => {
    if (!form) return false;
    const f = { ...form, ...(overrides ?? {}) };
    try {
      await update.mutateAsync({
        reportType: f.reportType,
        period: new Date(f.period).toISOString(),
        periodLabel: f.periodLabel.trim() || null,
        physicalProgressPercent: f.physicalProgressPercent,
        previousProgressPercent: f.previousProgressPercent.trim()
          ? Number(f.previousProgressPercent)
          : null,
        mainAchievements: f.mainAchievements.trim() || null,
        delaysIdentified: f.delaysIdentified.trim() || null,
        photos: f.photos,
        valueProducedXAF: Number(f.valueProducedXAF || "0"),
        valueProducedCumulXAF: Number(f.valueProducedCumulXAF || "0"),
        avgWorkforce: Number(f.avgWorkforce || "0"),
        maxWorkforce: Number(f.maxWorkforce || "0"),
        overtimeHoursTotal: Number(f.overtimeHoursTotal || "0"),
        billingStatus: f.billingStatus.trim() || null,
        hseIncidentsCount: Number(f.hseIncidentsCount || "0"),
        daysWithoutAccident: Number(f.daysWithoutAccident || "0"),
        issuesEncountered: f.issuesEncountered.trim() || null,
        supportNeeded: f.supportNeeded.trim() || null,
        attachmentDocumentIds: f.attachmentDocumentIds,
        nextPeriodPriorities: f.nextPeriodPriorities.trim() || null,
      });
      setSavedAt(new Date());
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!form) return;
    if (!confirm("Soumettre ce rapport au Directeur de Travaux ? Vous ne pourrez plus le modifier ensuite.")) return;
    const ok = await handleSave();
    if (!ok) return;
    submit.mutate(undefined, {
      onSuccess: () => router.push(`/${tenantSlug}/chef-chantier/rapports`),
    });
  };

  if (isLoading || !form || !report) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-2.5">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-ink-3">
            <Link
              href={`/${tenantSlug}/chef-chantier/rapports`}
              className="inline-flex items-center gap-1 hover:text-ink-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Rapports
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span>{report.site.code} — {report.site.name}</span>
          </div>
          <h1 className="mt-1 text-[20px] font-bold text-ink">
            Rapport {REPORT_TYPE_LABEL[report.reportType]}
          </h1>
          <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-3">
            <span className={clsx(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
              report.status === "DRAFT" && "bg-slate-100 text-slate-700",
              report.status === "SUBMITTED" && "bg-amber-100 text-amber-800",
              report.status === "VALIDATED" && "bg-emerald-100 text-emerald-800",
              report.status === "REJECTED" && "bg-rose-100 text-rose-800",
            )}>
              {REPORT_STATUS_LABEL[report.status]}
            </span>
            {savedAt && (
              <span className="text-[11px] text-emerald-600">
                <CheckCircle2 className="mr-0.5 inline h-3 w-3" /> Enregistré {savedAt.toLocaleTimeString("fr-FR")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/cc/progress-reports/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt"
          >
            <Download className="h-4 w-4" /> PDF
          </a>
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={update.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt disabled:opacity-60"
              >
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={update.isPending || submit.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" /> Soumettre au DTrav
              </button>
            </>
          )}
        </div>
      </header>

      {report.status === "REJECTED" && report.rejectionReason && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12.5px] text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Rapport refusé par le DTrav</p>
            <p className="mt-0.5">{report.rejectionReason}</p>
            <p className="mt-1 text-[11.5px] italic">Modifiez et soumettez à nouveau.</p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <nav className="flex flex-wrap gap-2 rounded-lg border border-line bg-white p-2 shadow-card">
        {STEPS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(s.key)}
            className={clsx(
              "flex flex-1 min-w-[140px] items-center gap-2 rounded-md px-3 py-2 text-left transition",
              step === s.key
                ? "bg-violet-50 ring-1 ring-violet-300"
                : "hover:bg-surface-alt",
            )}
          >
            <span
              className={clsx(
                "grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold",
                step === s.key ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-700",
              )}
            >
              {s.key}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-ink">{s.title}</p>
              <p className="truncate text-[10.5px] text-ink-3">{s.description}</p>
            </div>
          </button>
        ))}
      </nav>

      {/* Step content */}
      <div className="rounded-xl border border-line bg-white p-4 shadow-card md:p-6">
        {step === 1 && <Step1 form={form} setForm={setForm} readOnly={!!readOnly} />}
        {step === 2 && <Step2 form={form} setForm={setForm} readOnly={!!readOnly} />}
        {step === 3 && <Step3 form={form} setForm={setForm} readOnly={!!readOnly} />}
        {step === 4 && <Step4 form={form} setForm={setForm} readOnly={!!readOnly} />}
        {step === 5 && <Step5 form={form} setForm={setForm} readOnly={!!readOnly} />}
      </div>

      {/* Nav buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> Précédent
        </button>
        {step < STEPS.length ? (
          <button
            type="button"
            onClick={async () => {
              if (!readOnly) await handleSave();
              setStep((s) => Math.min(STEPS.length, s + 1));
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700"
          >
            Suivant <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          !readOnly && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submit.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> Soumettre au DTrav
            </button>
          )
        )}
      </div>
    </div>
  );
}

interface StepProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState | null>>;
  readOnly: boolean;
}

function patch<K extends keyof FormState>(setForm: StepProps["setForm"], key: K, value: FormState[K]) {
  setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[10.5px] text-ink-3">{hint}</span>}
    </label>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:bg-surface-alt disabled:text-ink-3";
const textareaCls =
  "w-full rounded-md border border-line bg-white p-2 text-[12.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:bg-surface-alt disabled:text-ink-3";

function Step1({ form, setForm, readOnly }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-bold text-ink">Étape 1 — Période & contexte</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Type de rapport">
          <select
            disabled={readOnly}
            value={form.reportType}
            onChange={(e) => patch(setForm, "reportType", e.target.value as FormState["reportType"])}
            className={inputCls}
          >
            <option value="MONTHLY">Mensuel</option>
            <option value="WEEKLY">Hebdomadaire</option>
            <option value="AD_HOC">Ad hoc</option>
          </select>
        </Field>
        <Field label="Période (date pivot)">
          <input
            disabled={readOnly}
            type="date"
            value={form.period}
            onChange={(e) => patch(setForm, "period", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Libellé (optionnel)" hint='Ex. "Mai 2026" ou "Semaine 20"'>
          <input
            disabled={readOnly}
            value={form.periodLabel}
            onChange={(e) => patch(setForm, "periodLabel", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="% avancement physique" hint="0 à 100">
          <input
            disabled={readOnly}
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={form.physicalProgressPercent}
            onChange={(e) => patch(setForm, "physicalProgressPercent", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="% période précédente (optionnel)" hint="Pour calculer la progression">
          <input
            disabled={readOnly}
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={form.previousProgressPercent}
            onChange={(e) => patch(setForm, "previousProgressPercent", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}

function Step2({ form, setForm, readOnly }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-bold text-ink">Étape 2 — Réalisations & retards</h2>
      <Field label="Réalisations majeures de la période">
        <textarea
          disabled={readOnly}
          rows={5}
          value={form.mainAchievements}
          onChange={(e) => patch(setForm, "mainAchievements", e.target.value)}
          placeholder="Coulage 3e dalle terminé, pose menuiserie aluminium R+1..."
          className={textareaCls}
        />
      </Field>
      <Field label="Retards identifiés" hint="Causes, impact planning, actions correctives">
        <textarea
          disabled={readOnly}
          rows={5}
          value={form.delaysIdentified}
          onChange={(e) => patch(setForm, "delaysIdentified", e.target.value)}
          placeholder="Retard livraison fer à béton (3 jours), récupéré par équipe nuit..."
          className={textareaCls}
        />
      </Field>
      <Field label="Photos (URLs)" hint="Une URL par ligne — référencement des photos du chantier (uploads gérés ailleurs)">
        <textarea
          disabled={readOnly}
          rows={3}
          value={form.photos.join("\n")}
          onChange={(e) =>
            patch(setForm, "photos", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))
          }
          placeholder="/uploads/sites/.../photo1.jpg"
          className={textareaCls}
        />
      </Field>
    </div>
  );
}

function Step3({ form, setForm, readOnly }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-bold text-ink">Étape 3 — Financier & RH</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Valeur produite période (XAF)">
          <input
            disabled={readOnly}
            type="number"
            min={0}
            value={form.valueProducedXAF}
            onChange={(e) => patch(setForm, "valueProducedXAF", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Valeur produite cumulée (XAF)">
          <input
            disabled={readOnly}
            type="number"
            min={0}
            value={form.valueProducedCumulXAF}
            onChange={(e) => patch(setForm, "valueProducedCumulXAF", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Effectif moyen sur la période">
          <input
            disabled={readOnly}
            type="number"
            min={0}
            value={form.avgWorkforce}
            onChange={(e) => patch(setForm, "avgWorkforce", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Effectif maximum (pic)">
          <input
            disabled={readOnly}
            type="number"
            min={0}
            value={form.maxWorkforce}
            onChange={(e) => patch(setForm, "maxWorkforce", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Heures supplémentaires (total)">
          <input
            disabled={readOnly}
            type="number"
            min={0}
            step={0.5}
            value={form.overtimeHoursTotal}
            onChange={(e) => patch(setForm, "overtimeHoursTotal", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Situation facturation" hint="Décomptes émis, en cours, encaissés / retards">
        <textarea
          disabled={readOnly}
          rows={4}
          value={form.billingStatus}
          onChange={(e) => patch(setForm, "billingStatus", e.target.value)}
          placeholder="Décompte n°4 émis 12/05 (45 M FCFA), réception attendue 22/05..."
          className={textareaCls}
        />
      </Field>
    </div>
  );
}

function Step4({ form, setForm, readOnly }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-bold text-ink">Étape 4 — HSE & blocages</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Incidents HSE déclarés sur la période">
          <input
            disabled={readOnly}
            type="number"
            min={0}
            value={form.hseIncidentsCount}
            onChange={(e) => patch(setForm, "hseIncidentsCount", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Jours sans accident à fin période">
          <input
            disabled={readOnly}
            type="number"
            min={0}
            value={form.daysWithoutAccident}
            onChange={(e) => patch(setForm, "daysWithoutAccident", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Difficultés rencontrées" hint="Approvisionnement, sous-traitants, météo, riverains...">
        <textarea
          disabled={readOnly}
          rows={5}
          value={form.issuesEncountered}
          onChange={(e) => patch(setForm, "issuesEncountered", e.target.value)}
          className={textareaCls}
        />
      </Field>
      <Field label="Support demandé" hint="Ressources, arbitrage, dérogation, escalade DTrav/DG...">
        <textarea
          disabled={readOnly}
          rows={4}
          value={form.supportNeeded}
          onChange={(e) => patch(setForm, "supportNeeded", e.target.value)}
          className={textareaCls}
        />
      </Field>
    </div>
  );
}

function Step5({ form, setForm, readOnly }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-bold text-ink">Étape 5 — Pièces jointes & priorités</h2>
      <AttachmentsPicker
        readOnly={readOnly}
        selectedIds={form.attachmentDocumentIds}
        onChange={(ids) => patch(setForm, "attachmentDocumentIds", ids)}
      />
      <Field label="Priorités de la prochaine période">
        <textarea
          disabled={readOnly}
          rows={6}
          value={form.nextPeriodPriorities}
          onChange={(e) => patch(setForm, "nextPeriodPriorities", e.target.value)}
          placeholder="1) Finition cloisons R+1 — 2) Démarrage étanchéité toiture..."
          className={textareaCls}
        />
      </Field>
    </div>
  );
}

interface DocLite {
  id: string;
  title: string;
  category: string;
  fileName: string;
}

function AttachmentsPicker({
  readOnly,
  selectedIds,
  onChange,
}: {
  readOnly: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [docs, setDocs] = useState<DocLite[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cc/documents?archived=false", { credentials: "same-origin" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setDocs(
            (json.items ?? []).map((d: { id: string; title: string; category: string; fileName: string }) => ({
              id: d.id,
              title: d.title,
              category: d.category,
              fileName: d.fileName,
            })),
          );
        }
      } catch {
        if (!cancelled) setDocs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: string) => {
    if (readOnly) return;
    const set = new Set(selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  };

  const selectedDocs = useMemo(
    () => (docs ?? []).filter((d) => selectedIds.includes(d.id)),
    [docs, selectedIds],
  );

  return (
    <Field
      label={`Pièces jointes (${selectedIds.length} sélectionnée${selectedIds.length > 1 ? "s" : ""})`}
      hint="Cocher les documents du chantier à attacher au rapport"
    >
      <div className="space-y-2">
        {selectedDocs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedDocs.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700"
              >
                <FileText className="h-3 w-3" /> {d.title}
              </span>
            ))}
          </div>
        )}
        <div className="max-h-64 overflow-y-auto rounded-md border border-line">
          {docs === null ? (
            <div className="p-3 text-[12px] text-ink-3">Chargement...</div>
          ) : docs.length === 0 ? (
            <div className="p-3 text-[12px] text-ink-3">Aucun document disponible.</div>
          ) : (
            <ul className="divide-y divide-line">
              {docs.map((d) => {
                const checked = selectedIds.includes(d.id);
                return (
                  <li key={d.id}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-surface-alt">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={checked}
                        onChange={() => toggle(d.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-ink">{d.title}</span>
                        <span className="block truncate text-[10.5px] text-ink-3">
                          {d.category} · {d.fileName}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Field>
  );
}
