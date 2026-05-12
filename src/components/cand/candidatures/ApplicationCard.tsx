"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  XCircle,
  Send,
} from "lucide-react";
import { clsx } from "clsx";
import {
  ApplicationPipelineVisual,
  type AppStage,
} from "./ApplicationPipelineVisual";

export interface ApplicationCardData {
  id: string;
  jobOfferId: string;
  jobTitle: string;
  jobRegion: string | null;
  jobContractType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  stage: AppStage;
  appliedAt: string; // ISO
  daysSinceApplied: number;
  daysSinceLastUpdate: number;
  rhMessage: string | null;
  hasUpcomingInterview: boolean;
  upcomingInterviewId: string | null;
}

const STAGE_CFG: Record<
  AppStage,
  { label: string; chipCls: string; icon: string }
> = {
  RECEIVED: { label: "Reçue", chipCls: "bg-ink-3/10 text-ink-2", icon: "📥" },
  SHORTLISTED: {
    label: "Présélection",
    chipCls: "bg-emerald-100 text-emerald-700",
    icon: "📐",
  },
  INTERVIEW: {
    label: "En entretien",
    chipCls: "bg-amber-100 text-amber-800",
    icon: "👷",
  },
  TECHNICAL_TEST: {
    label: "Test technique",
    chipCls: "bg-blue-100 text-blue-700",
    icon: "🛠",
  },
  OFFER: {
    label: "Offre",
    chipCls: "bg-primary-100 text-primary-700",
    icon: "🎉",
  },
  HIRED: { label: "Embauché", chipCls: "bg-emerald-200 text-emerald-800", icon: "✅" },
  REJECTED: { label: "Refusée", chipCls: "bg-rose-100 text-rose-700", icon: "❌" },
  WITHDRAWN: { label: "Retirée", chipCls: "bg-ink-3/15 text-ink-3", icon: "↩️" },
  EXPIRED: { label: "Expirée", chipCls: "bg-ink-3/15 text-ink-3", icon: "⏰" },
};

function formatSalary(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} M`
      : `${Math.round(n / 1000)} K`;
  if (min === null) return `≤ ${fmt(max!)} FCFA`;
  if (max === null) return `≥ ${fmt(min)} FCFA`;
  return `${fmt(min)} - ${fmt(max)} FCFA`;
}

export function ApplicationCard({ app }: { app: ApplicationCardData }) {
  const router = useRouter();
  const cfg = STAGE_CFG[app.stage];
  const isActive = !["HIRED", "REJECTED", "WITHDRAWN", "EXPIRED"].includes(app.stage);
  const isStale = isActive && app.daysSinceLastUpdate >= 14;

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-primary-50 text-xl">
            {cfg.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">{app.jobTitle}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
              {app.jobRegion ? <span>BatimCAM · {app.jobRegion}</span> : <span>BatimCAM</span>}
              <span>·</span>
              <span>{app.jobContractType}</span>
              {formatSalary(app.salaryMin, app.salaryMax) ? (
                <>
                  <span>·</span>
                  <span>{formatSalary(app.salaryMin, app.salaryMax)}</span>
                </>
              ) : null}
              <span>·</span>
              <span>postulé il y a {app.daysSinceApplied} j</span>
            </div>
          </div>
          <span
            className={clsx(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              cfg.chipCls,
            )}
          >
            {cfg.label}
          </span>
        </div>

        {/* Pipeline */}
        <div className="mt-4">
          <ApplicationPipelineVisual stage={app.stage} />
        </div>

        {/* Stale alert */}
        {isStale ? (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Pas de retour depuis <strong>{app.daysSinceLastUpdate} jours</strong>. Vous
              pouvez relancer le recruteur poliment.
            </span>
          </div>
        ) : null}

        {/* RH message */}
        {app.rhMessage ? (
          <div className="mt-3 rounded-md bg-surface-alt p-3">
            <div className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                  Message RH
                </p>
                <p className="mt-0.5 text-xs text-ink-2">{app.rhMessage}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/jobs/${app.jobOfferId}`}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-alt"
          >
            <ExternalLink className="h-3 w-3" /> Voir l&apos;offre
          </Link>
          {app.hasUpcomingInterview ? (
            <Link
              href="/cand/entretiens"
              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              📅 Voir mon entretien
            </Link>
          ) : null}
          {isActive ? (
            <>
              <FollowUpButton applicationId={app.id} onSent={() => router.refresh()} />
              <WithdrawButton applicationId={app.id} onDone={() => router.refresh()} />
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FollowUpButton({
  applicationId,
  onSent,
}: {
  applicationId: string;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!message.trim() || message.length < 10) {
      setError("Message trop court (10 caractères min.)");
      return;
    }
    setSending(true);
    setError(null);
    const res = await fetch(`/api/cand/applications/${applicationId}/follow-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setSending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur d'envoi");
      return;
    }
    setOpen(false);
    setMessage("");
    onSent();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-alt"
      >
        <Send className="h-3 w-3" /> Relancer
      </button>
      {open ? (
        <Modal onClose={() => setOpen(false)} title="Relancer le recruteur">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Bonjour, je me permets de revenir vers vous concernant ma candidature…"
            className="mt-2 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {error ? (
            <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-line bg-white px-4 py-2 text-sm text-ink-2 hover:bg-surface-alt"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-brand hover:bg-primary-600 disabled:opacity-60"
            >
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function WithdrawButton({
  applicationId,
  onDone,
}: {
  applicationId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleWithdraw() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/cand/applications/${applicationId}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur");
      return;
    }
    setOpen(false);
    onDone();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
      >
        <XCircle className="h-3 w-3" /> Retirer
      </button>
      {open ? (
        <Modal onClose={() => setOpen(false)} title="Retirer ma candidature">
          <p className="text-sm text-ink-2">
            Êtes-vous sûr de vouloir retirer cette candidature ? Cette action est
            définitive.
          </p>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-2">
              Raison (optionnel)
            </span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: poste accepté ailleurs"
              className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          {error ? (
            <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-line bg-white px-4 py-2 text-sm text-ink-2 hover:bg-surface-alt"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={loading}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {loading ? "…" : "Confirmer le retrait"}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-card-lg"
      >
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {children}
      </div>
    </div>
  );
}
