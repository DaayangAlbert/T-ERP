"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { ReportType } from "@prisma/client";
import { ReportWizardStepper } from "@/components/reports/ReportWizardStepper";
import { BlockLibrary } from "@/components/reports/BlockLibrary";
import { useCreateReport } from "@/hooks/useReports";
import { REPORT_TYPE_LABEL, TEMPLATE_BLOCKS, REPORT_BLOCKS } from "@/lib/report-blocks";
import { useAuth } from "@/hooks/useAuth";

const STEPS = [
  { key: "type", label: "Type" },
  { key: "scope", label: "Période & périmètre" },
  { key: "blocks", label: "Indicateurs et graphes" },
  { key: "layout", label: "Mise en page" },
  { key: "preview", label: "Aperçu" },
];

const SCOPE_LABEL: Record<string, string> = {
  GROUP: "Groupe consolidé",
  TENANT: "Société courante",
  SITES: "Chantiers sélectionnés",
};

function defaultPeriod(type: ReportType): string {
  const d = new Date();
  if (type === "EXECUTIVE_SUMMARY") {
    const year = d.getFullYear();
    const onejan = new Date(year, 0, 1);
    const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    return `S${String(week).padStart(2, "0")}-${year}`;
  }
  if (type === "ANNUAL_GROUP") return String(d.getFullYear() - 1);
  if (type === "QUARTERLY_NOTE") {
    d.setMonth(d.getMonth() - 1);
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `${d.getFullYear()}-T${q}`;
  }
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function NouveauRapportPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuth();
  const initialType = (sp.get("type") as ReportType | null) ?? ReportType.EXECUTIVE_SUMMARY;
  const defaultSignature = user
    ? `${user.firstName} ${user.lastName}${user.role === "DG" ? ", Directeur Général" : ""}`
    : "";

  const [step, setStep] = useState(0);
  const [type, setType] = useState<ReportType>(initialType);
  const [title, setTitle] = useState<string>(REPORT_TYPE_LABEL[initialType]);
  const [period, setPeriod] = useState<string>(defaultPeriod(initialType));
  const [scope, setScope] = useState<string>("GROUP");
  const [blocks, setBlocks] = useState<string[]>(TEMPLATE_BLOCKS[initialType] ?? []);
  const [signature, setSignature] = useState<string>(defaultSignature);
  const [serverError, setServerError] = useState<string | null>(null);

  // Si l'utilisateur arrive avant l'hydratation puis user devient disponible, met la signature.
  useEffect(() => {
    if (defaultSignature && !signature) setSignature(defaultSignature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSignature]);

  const create = useCreateReport();

  // Quand le type change, on réinitialise le titre + les blocs au template du type
  useEffect(() => {
    setTitle(REPORT_TYPE_LABEL[type]);
    setBlocks(TEMPLATE_BLOCKS[type] ?? []);
    setPeriod(defaultPeriod(type));
  }, [type]);

  const toggleBlock = (key: string) => {
    setBlocks((b) => (b.includes(key) ? b.filter((k) => k !== key) : [...b, key]));
  };

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(type && title.trim());
    if (step === 1) return Boolean(period);
    if (step === 2) return blocks.length > 0;
    return true;
  }, [step, type, title, period, blocks]);

  const submit = async () => {
    setServerError(null);
    try {
      const created = await create.mutateAsync({
        type,
        title: title.trim(),
        period,
        scope,
        blocks,
        signature: signature.trim() || undefined,
      });
      router.push(`/rapports/${created.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <button
            onClick={() => router.push("/rapports")}
            className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </button>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Nouveau rapport — {REPORT_TYPE_LABEL[type]}
          </h1>
        </div>
      </header>

      <div className="mb-5">
        <ReportWizardStepper steps={STEPS} current={step} onJump={setStep} />
      </div>

      {step === 0 && (
        <section className="rounded-xl border border-line bg-white p-5 shadow-card">
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-2">Type de rapport</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(REPORT_TYPE_LABEL) as ReportType[]).map((t) => (
                <label
                  key={t}
                  className={
                    "cursor-pointer rounded-md border p-3 text-center text-[12px] font-medium transition " +
                    (t === type
                      ? "border-primary-500 bg-primary-50 text-primary-800"
                      : "border-line bg-white text-ink-3 hover:border-primary-300")
                  }
                >
                  <input type="radio" value={t} checked={t === type} onChange={() => setType(t)} className="sr-only" />
                  {REPORT_TYPE_LABEL[t]}
                </label>
              ))}
            </div>
          </label>
          <label className="mt-4 block">
            <span className="text-[12px] font-semibold text-ink-2">Titre du rapport</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px]"
            />
          </label>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-card">
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-2">Période</span>
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="ex: S18-2026, 2026-04, 2026-T1"
              className="mt-1 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px]"
            />
          </label>
          <div>
            <span className="text-[12px] font-semibold text-ink-2">Périmètre</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {Object.entries(SCOPE_LABEL).map(([k, v]) => (
                <label
                  key={k}
                  className={
                    "cursor-pointer rounded-md border p-3 text-center text-[12px] " +
                    (k === scope
                      ? "border-primary-500 bg-primary-50 text-primary-800 font-medium"
                      : "border-line bg-white text-ink-3 hover:border-primary-300")
                  }
                >
                  <input type="radio" value={k} checked={k === scope} onChange={() => setScope(k)} className="sr-only" />
                  {v}
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-xl border border-line bg-white p-5 shadow-card">
          <p className="mb-3 text-[12px] text-ink-3">
            {blocks.length} bloc{blocks.length > 1 ? "s" : ""} sélectionné{blocks.length > 1 ? "s" : ""}
          </p>
          <BlockLibrary selected={blocks} onToggle={toggleBlock} />
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3 rounded-xl border border-line bg-white p-5 shadow-card">
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-2">Signataire (footer du PDF)</span>
            <input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Nom, titre"
              className="mt-1 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px]"
            />
          </label>
          <p className="rounded-md bg-surface-alt px-3 py-2 text-[12px] text-ink-3">
            Le logo et la couleur primaire du tenant sont automatiquement appliqués.
            Les destinataires seront définis après génération via le bouton « Diffuser ».
          </p>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-xl border border-line bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">Aperçu prêt à générer</span>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Row label="Type">{REPORT_TYPE_LABEL[type]}</Row>
            <Row label="Titre">{title}</Row>
            <Row label="Période">{period}</Row>
            <Row label="Périmètre">{SCOPE_LABEL[scope]}</Row>
            <Row label="Blocs inclus">
              {blocks.length} / {REPORT_BLOCKS.length}
            </Row>
            <Row label="Signataire">{signature || "—"}</Row>
          </dl>
          <h3 className="mt-4 mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Détail des blocs
          </h3>
          <ul className="grid grid-cols-1 gap-1 text-[12px] sm:grid-cols-2">
            {REPORT_BLOCKS.map((b) => (
              <li
                key={b.key}
                className={
                  "flex items-center justify-between gap-2 rounded-md border border-line px-2 py-1 " +
                  (blocks.includes(b.key) ? "bg-success/5 text-ink-2" : "bg-surface-alt text-ink-3 line-through")
                }
              >
                <span className="truncate">{b.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-ink-3">{b.category}</span>
              </li>
            ))}
          </ul>
          {serverError && (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {serverError}
            </p>
          )}
        </section>
      )}

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-sm text-ink-2 disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Précédent
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => canNext && setStep((s) => s + 1)}
            disabled={!canNext}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            Étape suivante <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={create.isPending}
            className="inline-flex h-9 items-center rounded-md bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {create.isPending ? "Génération…" : "Générer le rapport"}
          </button>
        )}
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface-alt px-3 py-2">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-semibold text-ink">{children}</dd>
    </div>
  );
}
