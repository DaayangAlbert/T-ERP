"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  MapPin,
  Calendar,
  Phone,
  Video,
  Building2,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { PreparationChecklist } from "./PreparationChecklist";

export interface UpcomingInterview {
  id: string;
  applicationId: string;
  jobTitle: string;
  region: string | null;
  scheduledAt: string;
  duration: number;
  mode: "ONSITE" | "VIDEO" | "PHONE";
  location: string | null;
  interviewers: string[];
  candidateConfirmed: boolean;
}

const MODE_LABELS: Record<UpcomingInterview["mode"], string> = {
  ONSITE: "Présentiel",
  VIDEO: "Visioconférence",
  PHONE: "Téléphone",
};

const MODE_ICONS: Record<UpcomingInterview["mode"], React.ReactNode> = {
  ONSITE: <Building2 className="h-3.5 w-3.5" />,
  VIDEO: <Video className="h-3.5 w-3.5" />,
  PHONE: <Phone className="h-3.5 w-3.5" />,
};

function relativeDay(d: Date): string {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((s.getTime() - t.getTime()) / 86_400_000);
  if (diff === 0) return "AUJOURD'HUI";
  if (diff === 1) return "DEMAIN";
  if (diff > 1 && diff < 7) return `DANS ${diff} JOURS`;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  })
    .format(d)
    .toUpperCase();
}

export function UpcomingInterviewCard({
  interview,
}: {
  interview: UpcomingInterview;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(interview.candidateConfirmed);
  const [pending, startTransition] = useTransition();
  const [showReschedule, setShowReschedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduledAt = new Date(interview.scheduledAt);
  const dayLabel = relativeDay(scheduledAt);
  const timeLabel = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(scheduledAt);
  const fullDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(scheduledAt);

  async function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/cand/interviews/${interview.id}/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("Erreur de confirmation");
        return;
      }
      setConfirmed(true);
      router.refresh();
    });
  }

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-gradient-to-br from-primary-50 to-white shadow-card">
      <div className="border-l-4 border-primary p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary-700">
              ⏰ {dayLabel}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-ink">
              {interview.jobTitle}
            </h3>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {timeLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Field icon={<Calendar className="h-3.5 w-3.5" />} label="Date" value={fullDate} />
          <Field
            icon={<CalendarClock className="h-3.5 w-3.5" />}
            label="Durée"
            value={`${interview.duration} min`}
          />
          <Field
            icon={MODE_ICONS[interview.mode]}
            label="Mode"
            value={MODE_LABELS[interview.mode]}
          />
          <Field
            icon={<MapPin className="h-3.5 w-3.5" />}
            label={interview.mode === "ONSITE" ? "Lieu" : "Adresse / lien"}
            value={interview.location ?? "—"}
          />
        </div>

        {interview.interviewers.length > 0 ? (
          <div className="mt-3 text-xs text-ink-2">
            <span className="font-semibold">Avec :</span>{" "}
            {interview.interviewers.join(", ")}
          </div>
        ) : null}

        {confirmed ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" /> Présence confirmée
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmed || pending}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-brand hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {confirmed
              ? "Présence confirmée"
              : pending
                ? "Envoi…"
                : "Confirmer ma présence"}
          </button>
          {interview.location && interview.mode === "ONSITE" ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(interview.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-alt"
            >
              <MapPin className="h-4 w-4" />
              Itinéraire
            </a>
          ) : null}
          <a
            href={`/api/cand/interviews/${interview.id}/ics`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-alt"
          >
            <Calendar className="h-4 w-4" />
            Ajouter au calendrier
          </a>
          <button
            type="button"
            onClick={() => setShowReschedule(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-alt"
          >
            Demander un report
          </button>
        </div>

        <div className="mt-5">
          <PreparationChecklist />
        </div>
      </div>

      {showReschedule ? (
        <RescheduleModal
          interviewId={interview.id}
          onClose={() => setShowReschedule(false)}
          onSent={() => {
            setShowReschedule(false);
            router.refresh();
          }}
        />
      ) : null}
    </article>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-3">
        {icon} <span>{label}</span>
      </div>
      <div className="mt-0.5 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function RescheduleModal({
  interviewId,
  onClose,
  onSent,
}: {
  interviewId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (reason.trim().length < 10) {
      setError("Motif trop court (10 caractères min.)");
      return;
    }
    setSending(true);
    setError(null);
    const res = await fetch(
      `/api/cand/interviews/${interviewId}/request-reschedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
    setSending(false);
    if (!res.ok) {
      setError("Erreur d'envoi");
      return;
    }
    onSent();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-5"
      >
        <h3 className="text-base font-semibold text-ink">
          Demander un report d&apos;entretien
        </h3>
        <p className="mt-1 text-sm text-ink-3">
          Le recruteur recevra votre demande et vous proposera une nouvelle date.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Motif (indisponibilité, raison personnelle…)"
          className="mt-3 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {error ? (
          <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-white px-4 py-2 text-sm text-ink-2 hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-brand hover:bg-primary-600 disabled:opacity-60"
          >
            {sending ? "Envoi…" : "Envoyer la demande"}
          </button>
        </div>
      </div>
    </div>
  );
}
