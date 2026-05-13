"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { BoardReportType } from "@prisma/client";
import { ReportWizardStepper } from "@/components/dg/ReportWizardStepper";
import { ChapterSelector } from "@/components/dg/ChapterSelector";
import { useCreateBoardReport } from "@/hooks/useDgBoardReports";
import { REPORT_CHAPTER_LABELS } from "@/lib/board-report-chapters";
import { Field, inputClass } from "@/components/auth/LoginForm";

const TYPE_LABEL: Record<BoardReportType, string> = {
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  ANNUAL: "Annuel",
  EXTRAORDINARY: "Extraordinaire",
};

const STEPS = [
  { key: "period", label: "Période & type" },
  { key: "chapters", label: "Chapitres" },
  { key: "comments", label: "Commentaires" },
  { key: "preview", label: "Aperçu" },
];

const DEFAULT_CHAPTERS: Record<string, boolean> = Object.fromEntries(
  Object.keys(REPORT_CHAPTER_LABELS).map((k) => [k, true])
);

function defaultPeriod(type: BoardReportType): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  if (type === BoardReportType.ANNUAL) return String(y);
  if (type === BoardReportType.QUARTERLY) {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `${y}-T${q}`;
  }
  return `${y}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultBoardDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(15);
  return d.toISOString().slice(0, 10);
}

export default function NouveauRapportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") as BoardReportType | null) ?? BoardReportType.MONTHLY;
  const create = useCreateBoardReport();

  const [step, setStep] = useState(0);
  const [type, setType] = useState<BoardReportType>(initialType);
  const [period, setPeriod] = useState(defaultPeriod(initialType));
  const [boardDate, setBoardDate] = useState(defaultBoardDate());
  const [chapters, setChapters] = useState<Record<string, boolean>>(DEFAULT_CHAPTERS);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(period && boardDate);
    if (step === 1) return Object.values(chapters).some(Boolean);
    return true;
  }, [step, period, boardDate, chapters]);

  const submit = async () => {
    setServerError(null);
    try {
      const created = await create.mutateAsync({
        type,
        period,
        boardDate,
        chapters,
        comments,
      });
      router.push(`/direction-generale/reporting-ca/${created.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <button
            onClick={() => router.push("/direction-generale/reporting-ca")}
            className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux rapports
          </button>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Nouveau rapport CA — {TYPE_LABEL[type]}
          </h1>
        </div>
      </header>

      <div className="mb-6">
        <ReportWizardStepper steps={STEPS} currentIndex={step} onJump={setStep} />
      </div>

      {step === 0 && (
        <section className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-card">
          <Field label="Type de rapport" required>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              {(Object.keys(TYPE_LABEL) as BoardReportType[]).map((t) => (
                <label
                  key={t}
                  className={
                    "cursor-pointer rounded-md border p-2.5 text-center text-[12.5px] font-medium transition " +
                    (t === type
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-line bg-white text-ink-3 hover:border-primary-300")
                  }
                >
                  <input
                    type="radio"
                    value={t}
                    checked={t === type}
                    onChange={() => {
                      setType(t);
                      setPeriod(defaultPeriod(t));
                    }}
                    className="sr-only"
                  />
                  {TYPE_LABEL[t]}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Période concernée" required hint="Ex: 2026-04, 2026-T1, 2026">
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={inputClass(false)}
            />
          </Field>
          <Field label="Date du conseil d'administration" required>
            <input
              type="date"
              value={boardDate}
              onChange={(e) => setBoardDate(e.target.value)}
              className={inputClass(false)}
            />
          </Field>
        </section>
      )}

      {step === 1 && (
        <section className="rounded-xl border border-line bg-white p-5 shadow-card">
          <ChapterSelector chapters={chapters} onChange={setChapters} />
        </section>
      )}

      {step === 2 && (
        <section className="rounded-xl border border-line bg-white p-5 shadow-card">
          <ChapterSelector
            chapters={chapters}
            comments={comments}
            onChange={setChapters}
            onCommentChange={(key, value) => setComments((c) => ({ ...c, [key]: value }))}
            showComments
          />
        </section>
      )}

      {step === 3 && (
        <section className="rounded-xl border border-line bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">Aperçu du rapport prêt à générer</span>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Row label="Type">{TYPE_LABEL[type]}</Row>
            <Row label="Période">{period}</Row>
            <Row label="Date du CA">{new Date(boardDate).toLocaleDateString("fr-FR")}</Row>
            <Row label="Chapitres inclus">
              {Object.values(chapters).filter(Boolean).length} / {Object.keys(REPORT_CHAPTER_LABELS).length}
            </Row>
          </dl>
          <div className="mt-4">
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              Détail des chapitres
            </h3>
            <ul className="space-y-1 text-[12.5px]">
              {Object.entries(REPORT_CHAPTER_LABELS).map(([k, label]) => (
                <li key={k} className="flex items-center justify-between gap-2 border-b border-line pb-1.5 last:border-0">
                  <span
                    className={
                      chapters[k] !== false ? "font-medium text-ink" : "text-ink-3 line-through"
                    }
                  >
                    {label}
                  </span>
                  <span className="text-[11px] text-ink-3">
                    {chapters[k] !== false
                      ? comments[k]
                        ? `Commentaire (${comments[k].length} car.)`
                        : "—"
                      : "Exclu"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
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
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-sm text-ink-2 hover:border-primary-300 disabled:opacity-40"
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
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
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
