"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MapPin, BookOpen, AlertCircle } from "lucide-react";

interface InterviewPayload {
  id: string;
  scheduledAt: string; // ISO
  duration: number;
  mode: "ONSITE" | "PHONE" | "VIDEO";
  location: string | null;
  interviewerName: string | null;
  jobTitle: string;
  candidateConfirmed: boolean;
}

function relativeDay(d: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay.getTime() - startOfToday.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "AUJOURD'HUI";
  if (diffDays === 1) return "DEMAIN";
  if (diffDays > 1 && diffDays < 7) return `DANS ${diffDays} JOURS`;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  })
    .format(d)
    .toUpperCase();
}

const MODE_LABELS: Record<InterviewPayload["mode"], string> = {
  ONSITE: "Présentiel",
  VIDEO: "Visioconférence",
  PHONE: "Téléphone",
};

export function NextInterviewCard({ interview }: { interview: InterviewPayload }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(interview.candidateConfirmed);
  const [error, setError] = useState<string | null>(null);

  const scheduledAt = new Date(interview.scheduledAt);
  const dayLabel = relativeDay(scheduledAt);
  const timeLabel = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(scheduledAt);
  const fullDateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(scheduledAt);

  async function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/cand/interviews/${interview.id}/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Erreur lors de la confirmation");
        return;
      }
      setConfirmed(true);
      router.refresh();
    });
  }

  const itineraryUrl =
    interview.mode === "ONSITE" && interview.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(interview.location)}`
      : null;

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-gradient-to-br from-primary-50 to-white shadow-card">
      <div className="border-l-4 border-primary p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary-700">
              ⏰ Prochain entretien · {dayLabel}
            </div>
            <h3 className="mt-1 text-base font-semibold text-ink md:text-lg">
              {interview.jobTitle}
            </h3>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {timeLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Field label="Date" value={fullDateLabel} />
          <Field label="Durée" value={`${interview.duration} min`} />
          <Field
            label={interview.mode === "ONSITE" ? "Lieu" : "Mode"}
            value={
              interview.mode === "ONSITE"
                ? (interview.location ?? "À préciser")
                : MODE_LABELS[interview.mode]
            }
          />
          <Field
            label="Avec"
            value={interview.interviewerName ?? "Équipe RH"}
          />
        </div>

        {confirmed ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" /> Présence confirmée
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmed || pending}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-brand transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {confirmed
              ? "Présence confirmée"
              : pending
                ? "Envoi…"
                : "Confirmer ma présence"}
          </button>
          {itineraryUrl ? (
            <a
              href={itineraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-alt"
            >
              <MapPin className="h-4 w-4" />
              Itinéraire
            </a>
          ) : null}
          <button
            type="button"
            disabled
            title="Disponible en fonction 1.4"
            className="inline-flex min-h-[44px] cursor-not-allowed items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink-3 opacity-70"
          >
            <BookOpen className="h-4 w-4" />
            Préparation
          </button>
        </div>
      </div>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-3">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}
