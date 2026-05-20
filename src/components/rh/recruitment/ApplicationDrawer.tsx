"use client";

import { X, Mail, Phone, MapPin, Calendar, Star, ArrowRight, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import type { AppStage } from "@prisma/client";
import { useApplicationDetail, useUpdateStage, useRescoreApplication } from "@/hooks/useRhRecruitment";
import { InterviewsSection } from "./InterviewsSection";

interface Props {
  id: string;
  onClose: () => void;
}

const STAGE_LABEL: Record<AppStage, string> = {
  RECEIVED: "Reçue",
  SHORTLISTED: "Présélectionnée",
  INTERVIEW: "Entretien",
  TECHNICAL_TEST: "Test technique",
  OFFER: "Décision",
  HIRED: "Embauchée",
  REJECTED: "Rejetée",
  WITHDRAWN: "Retirée",
  EXPIRED: "Expirée",
};

const NEXT_STAGES: Record<AppStage, AppStage[]> = {
  RECEIVED: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFER", "REJECTED"],
  TECHNICAL_TEST: ["OFFER", "REJECTED"],
  OFFER: ["HIRED", "REJECTED"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
  EXPIRED: [],
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const SCORE_DIMS = [
  { key: "skills", label: "Compétences", max: 40 },
  { key: "experience", label: "Expérience", max: 25 },
  { key: "location", label: "Localisation", max: 15 },
  { key: "contract", label: "Contrat", max: 10 },
  { key: "salary", label: "Salaire", max: 10 },
] as const;

export function ApplicationDrawer({ id, onClose }: Props) {
  const { data, isLoading } = useApplicationDetail(id);
  const update = useUpdateStage();
  const rescore = useRescoreApplication();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-3 py-2">
          <h3 className="text-[13px] font-semibold text-ink">Candidature</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {isLoading || !data ? (
          <div className="space-y-3 p-3">
            <div className="h-24 animate-pulse rounded-xl bg-surface-alt" />
            <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
          </div>
        ) : (
          <div className="space-y-3 p-3">
            <div className="rounded-xl border border-line bg-surface-alt p-3">
              <div className="text-[15px] font-bold text-ink">{data.candidateName}</div>
              <div className="text-[12.5px] text-ink-2">{data.position}</div>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[11.5px] text-ink-3">
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {data.email}</span>
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {data.phone}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {data.region}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Postulé le {fmtDate(data.appliedAt)}</span>
              </div>
            </div>

            <section>
              <h4 className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Étape actuelle</h4>
              <div className="rounded-md border border-line bg-white p-2 text-[12px] font-semibold text-primary-700">
                {STAGE_LABEL[data.stage]}
              </div>
            </section>

            <section>
              <div className="mb-1 flex items-center justify-between">
                <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Scoring (matching auto)</h4>
                <button
                  type="button"
                  onClick={() => rescore.mutate(id)}
                  disabled={rescore.isPending}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50"
                  title="Recalculer le score depuis le profil actuel du candidat"
                >
                  <RefreshCw className={clsx("h-3 w-3", rescore.isPending && "animate-spin")} /> Recalculer
                </button>
              </div>
              <div className="space-y-1.5 rounded-md border border-line bg-white p-2.5">
                {data.scoring.breakdown ? (
                  SCORE_DIMS.map((d) => {
                    const value = data.scoring.breakdown![d.key];
                    const pct = Math.round((value / d.max) * 100);
                    return (
                      <div key={d.key}>
                        <div className="flex items-center justify-between text-[11.5px]">
                          <span className="text-ink">{d.label}</span>
                          <span className="font-mono font-semibold text-ink">{value} / {d.max}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                          <div
                            className={clsx("h-full", pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11.5px] text-ink-3">Détail indisponible (profil candidat incomplet).</p>
                )}
                <div className="mt-1 flex items-center justify-between border-t border-line pt-1.5 text-[12px] font-semibold">
                  <span className="text-ink">Score global</span>
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Star className="h-3 w-3 text-amber-500" /> {data.scoring.overall} / 100
                  </span>
                </div>
              </div>
              {(data.scoring.matchedSkills.length > 0 || data.scoring.missingRequirements.length > 0) && (
                <div className="mt-1.5 space-y-1.5">
                  {data.scoring.matchedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {data.scoring.matchedSkills.map((s) => (
                        <span key={s} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700">✓ {s}</span>
                      ))}
                    </div>
                  )}
                  {data.scoring.missingRequirements.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {data.scoring.missingRequirements.map((s) => (
                        <span key={s} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-medium text-rose-700">manque : {s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <InterviewsSection applicationId={id} interviews={data.interviews} />

            <section>
              <h4 className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Lettre de motivation</h4>
              <p className="rounded-md border border-line bg-white p-2.5 text-[12px] italic text-ink-2">
                « {data.coverLetter} »
              </p>
            </section>

            <section>
              <h4 className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Actions</h4>
              <div className="space-y-1.5">
                {NEXT_STAGES[data.stage].length === 0 ? (
                  <p className="text-[12px] text-ink-3">Aucune action disponible (étape terminale).</p>
                ) : (
                  NEXT_STAGES[data.stage].map((next) => (
                    <button
                      key={next}
                      type="button"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id, stage: next }, { onSuccess: onClose })}
                      className={clsx(
                        "inline-flex h-9 w-full items-center justify-between rounded-md border px-3 text-[12.5px] font-semibold disabled:opacity-50",
                        next === "REJECTED"
                          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100"
                      )}
                    >
                      <span>Passer à {STAGE_LABEL[next]}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
