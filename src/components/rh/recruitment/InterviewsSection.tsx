"use client";

import { useState } from "react";
import { CalendarPlus, Video, Phone, MapPin, Check, Trash2, Star } from "lucide-react";
import { clsx } from "clsx";
import {
  useScheduleInterview,
  useUpdateInterview,
  useDeleteInterview,
  type InterviewItem,
} from "@/hooks/useRhRecruitment";

const MODE_LABEL: Record<string, string> = { ONSITE: "Présentiel", PHONE: "Téléphone", VIDEO: "Visio" };
const MODE_ICON: Record<string, React.ReactNode> = {
  ONSITE: <MapPin className="h-3 w-3" />,
  PHONE: <Phone className="h-3 w-3" />,
  VIDEO: <Video className="h-3 w-3" />,
};
const DECISION_LABEL: Record<string, string> = { GO: "Favorable", NO_GO: "Défavorable", PENDING: "En attente" };
const DECISION_CLS: Record<string, string> = {
  GO: "bg-emerald-100 text-emerald-800",
  NO_GO: "bg-rose-100 text-rose-800",
  PENDING: "bg-amber-100 text-amber-800",
};

const input =
  "h-9 w-full rounded-md border border-line bg-white px-2.5 text-[12.5px] focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-200";

function fmt(s: string): string {
  return new Date(s).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export function InterviewsSection({
  applicationId,
  interviews,
}: {
  applicationId: string;
  interviews: InterviewItem[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Entretiens</h4>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-[11.5px] font-medium text-primary-700 hover:bg-primary-100"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Planifier
          </button>
        )}
      </div>

      {adding && (
        <ScheduleForm applicationId={applicationId} onDone={() => setAdding(false)} />
      )}

      {interviews.length === 0 && !adding ? (
        <p className="rounded-md border border-line bg-white p-2.5 text-[12px] text-ink-3">
          Aucun entretien planifié.
        </p>
      ) : (
        <div className="space-y-2">
          {interviews.map((itw) => (
            <InterviewCard key={itw.id} itw={itw} />
          ))}
        </div>
      )}
    </section>
  );
}

function ScheduleForm({ applicationId, onDone }: { applicationId: string; onDone: () => void }) {
  const schedule = useScheduleInterview(applicationId);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState("ONSITE");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!scheduledAt) return setError("Choisissez une date et une heure.");
    try {
      await schedule.mutateAsync({ scheduledAt, duration, mode, location: location || undefined });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="mb-2 space-y-2 rounded-md border border-primary-200 bg-primary-50/40 p-2.5">
      <input type="datetime-local" className={input} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="ONSITE">Présentiel</option>
          <option value="PHONE">Téléphone</option>
          <option value="VIDEO">Visio</option>
        </select>
        <select className={input} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          <option value={30}>30 min</option>
          <option value={45}>45 min</option>
          <option value={60}>1 h</option>
          <option value={90}>1 h 30</option>
        </select>
      </div>
      <input
        className={input}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder={mode === "VIDEO" ? "Lien de visio" : mode === "PHONE" ? "Numéro à appeler" : "Lieu / salle"}
      />
      {error && <p className="text-[11.5px] text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-ink-3 hover:bg-surface-alt">
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={schedule.isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {schedule.isPending ? "…" : "Planifier"}
        </button>
      </div>
    </div>
  );
}

function InterviewCard({ itw }: { itw: InterviewItem }) {
  const update = useUpdateInterview();
  const del = useDeleteInterview();
  const [debrief, setDebrief] = useState(false);
  const [feedback, setFeedback] = useState(itw.feedback ?? "");
  const [score, setScore] = useState<number>(itw.score ?? 0);
  const [decision, setDecision] = useState<string>(itw.decision ?? "");

  async function saveDebrief() {
    await update.mutateAsync({
      id: itw.id,
      completed: true,
      feedback: feedback || null,
      score: score || null,
      decision: (decision || null) as "GO" | "NO_GO" | "PENDING" | null,
    });
    setDebrief(false);
  }

  return (
    <div className="rounded-md border border-line bg-white p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold text-ink">{fmt(itw.scheduledAt)}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1">{MODE_ICON[itw.mode]} {MODE_LABEL[itw.mode]}</span>
            <span>· {itw.duration} min</span>
            {itw.location && <span>· {itw.location}</span>}
          </div>
          {itw.interviewers.length > 0 && (
            <div className="mt-0.5 text-[11px] text-ink-3">Avec : {itw.interviewers.join(", ")}</div>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {itw.candidateConfirmed && (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
              <Check className="h-3 w-3" /> Confirmé
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (confirm("Annuler cet entretien ?")) del.mutate(itw.id);
            }}
            title="Annuler"
            className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {itw.completed ? (
        <div className="mt-2 space-y-1 border-t border-line pt-2">
          <div className="flex items-center gap-2 text-[11.5px]">
            {itw.decision && (
              <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold", DECISION_CLS[itw.decision])}>
                {DECISION_LABEL[itw.decision]}
              </span>
            )}
            {itw.score != null && (
              <span className="inline-flex items-center gap-0.5 font-mono text-ink-2">
                <Star className="h-3 w-3 text-amber-500" /> {itw.score}/5
              </span>
            )}
          </div>
          {itw.feedback && <p className="text-[11.5px] italic text-ink-2">« {itw.feedback} »</p>}
        </div>
      ) : debrief ? (
        <div className="mt-2 space-y-2 border-t border-line pt-2">
          <textarea
            rows={2}
            className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] focus:border-primary-300 focus:outline-none"
            placeholder="Compte-rendu / feedback…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select className={input} value={score} onChange={(e) => setScore(Number(e.target.value))}>
              <option value={0}>Note…</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}/5</option>
              ))}
            </select>
            <select className={input} value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="">Décision…</option>
              <option value="GO">Favorable</option>
              <option value="NO_GO">Défavorable</option>
              <option value="PENDING">En attente</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDebrief(false)} className="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-ink-3 hover:bg-surface-alt">
              Annuler
            </button>
            <button type="button" onClick={saveDebrief} disabled={update.isPending} className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
              {update.isPending ? "…" : "Enregistrer le compte-rendu"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDebrief(true)}
          className="mt-2 w-full rounded-md border border-line py-1.5 text-[11.5px] font-medium text-ink-2 hover:bg-surface-alt"
        >
          Saisir le compte-rendu
        </button>
      )}
    </div>
  );
}
