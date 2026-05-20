"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardHat,
  Wallet,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { formatFCFA } from "@/lib/format";
import { ContactActions } from "@/components/contact/ContactActions";

interface AdvanceItem {
  id: string;
  amountXAF: number;
  maxAllowedXAF: number;
  reason: string;
  payoutMethod: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string | null;
    position: string | null;
    avatarUrl: string | null;
    phoneMobile: string | null;
    sites: Array<{ id: string; code: string; name: string }>;
  };
}

interface Response {
  items: AdvanceItem[];
  summary: { pendingCount: number; totalAmountXAF: number };
}

export default function DrhAdvancesPage() {
  const qc = useQueryClient();
  const [confirmReject, setConfirmReject] = useState<AdvanceItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rh", "advances", "pending"],
    queryFn: async (): Promise<Response> => {
      const res = await fetch("/api/rh/advances/pending", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    // Court refetch pour voir les nouvelles demandes en quasi temps réel
    refetchInterval: 15_000,
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rh/advances/${id}/approve`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Demande approuvée — ouvrier notifié." });
      qc.invalidateQueries({ queryKey: ["rh", "advances", "pending"] });
    },
    onError: (e: Error) => setFeedback({ tone: "error", message: e.message }),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/rh/advances/${id}/reject`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Refus enregistré — ouvrier notifié." });
      setConfirmReject(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["rh", "advances", "pending"] });
    },
    onError: (e: Error) => setFeedback({ tone: "error", message: e.message }),
  });

  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Avances sur salaire — à valider
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Demandes émises par les ouvriers via leur PWA mobile. Chaque action
          envoie une notification à l'ouvrier (push + cloche).
        </p>
      </header>

      {/* Feedback bandeau */}
      {feedback && (
        <div
          className={clsx(
            "mb-4 flex items-start gap-2 rounded-md px-3 py-2 text-[12.5px]",
            feedback.tone === "success"
              ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border border-danger/30 bg-danger/5 text-danger",
          )}
          role="status"
        >
          {feedback.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          )}
          <div className="flex-1">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-current/70 hover:text-current"
            aria-label="Fermer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPIs */}
      {data && (
        <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard
            icon={<Clock className="h-4 w-4" />}
            label="Demandes en attente"
            value={data.summary.pendingCount.toString()}
            tone={data.summary.pendingCount > 0 ? "warning" : "ok"}
          />
          <KpiCard
            icon={<Wallet className="h-4 w-4" />}
            label="Montant total"
            value={`${new Intl.NumberFormat("fr-FR").format(Math.round(data.summary.totalAmountXAF))}`}
            unit="FCFA"
          />
          <KpiCard
            icon={<HardHat className="h-4 w-4" />}
            label="Ouvriers concernés"
            value={new Set(data.items.map((a) => a.user.id)).size.toString()}
          />
        </section>
      )}

      {isLoading && <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />}

      {!isLoading && data && data.items.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-surface-alt p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
          <h3 className="mt-2 text-sm font-semibold text-ink">
            Aucune demande en attente
          </h3>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Toutes les avances ont été traitées. Bonne journée.
          </p>
        </div>
      )}

      {!isLoading && data && data.items.length > 0 && (
        <section className="space-y-3">
          {data.items.map((a) => (
            <AdvanceCard
              key={a.id}
              advance={a}
              onApprove={() => approve.mutate(a.id)}
              onReject={() => setConfirmReject(a)}
              busy={approve.isPending || reject.isPending}
            />
          ))}
        </section>
      )}

      {/* Modal confirmation refus avec motif */}
      {confirmReject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-2xl">
            <h2 className="text-[15px] font-semibold text-ink">Refuser la demande</h2>
            <p className="mt-1 text-[12.5px] text-ink-3">
              {confirmReject.user.firstName} {confirmReject.user.lastName} —{" "}
              {formatFCFA(confirmReject.amountXAF)} FCFA
            </p>
            <label className="mt-3 block text-[11.5px] font-semibold text-ink-2">
              Motif du refus (obligatoire)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Ex : plafond mensuel dépassé pour ce chantier, demande hors période..."
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12.5px] text-ink focus:border-primary-300 focus:outline-none"
            />
            <p className="mt-1 text-[10.5px] text-ink-3">
              {rejectReason.length}/300 caractères · l'ouvrier verra ce motif
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmReject(null);
                  setRejectReason("");
                }}
                className="rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-alt"
              >
                Annuler
              </button>
              <button
                onClick={() =>
                  reject.mutate({ id: confirmReject.id, reason: rejectReason })
                }
                disabled={rejectReason.trim().length < 3 || reject.isPending}
                className="rounded-md bg-danger px-3 py-1.5 text-[13px] font-medium text-white hover:bg-danger/90 disabled:opacity-50"
              >
                {reject.isPending ? "Envoi…" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AdvanceCard({
  advance: a,
  onApprove,
  onReject,
  busy,
}: {
  advance: AdvanceItem;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const overQuota = a.amountXAF > a.maxAllowedXAF * 0.9;
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-start gap-3 p-3 sm:p-4">
        {/* Avatar + identité */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar
            firstName={a.user.firstName}
            lastName={a.user.lastName}
            url={a.user.avatarUrl}
          />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold text-ink">
              {a.user.firstName} {a.user.lastName}
            </div>
            <div className="truncate text-[11px] text-ink-3">
              {a.user.position ?? "—"} {a.user.matricule ? `· ${a.user.matricule}` : ""}
            </div>
            {a.user.sites.length > 0 && (
              <div className="mt-0.5 truncate text-[10.5px] text-ink-3">
                Chantier · {a.user.sites.map((s) => s.code).join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* Montant */}
        <div className="ml-auto text-right">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-ink-3">
            Demande
          </div>
          <div className="font-mono text-[18px] font-bold tabular-nums text-ink">
            {formatFCFA(a.amountXAF)}
            <span className="ml-1 text-[11px] font-medium text-ink-3">FCFA</span>
          </div>
          <div className="text-[10.5px] text-ink-3">
            Plafond {formatFCFA(a.maxAllowedXAF)} FCFA
          </div>
          {overQuota && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              <AlertTriangle className="h-2.5 w-2.5" /> ≥ 90% du plafond
            </span>
          )}
        </div>
      </div>

      {/* Motif + paiement */}
      <div className="border-t border-line bg-surface-alt px-3 py-2 sm:px-4">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
          Motif
        </div>
        <p className="mt-1 text-[12.5px] text-ink whitespace-pre-line">{a.reason}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Wallet className="h-3 w-3" />{" "}
            Versement : <strong className="font-semibold text-ink-2">{a.payoutMethod}</strong>
          </span>
          <span className="text-ink-3">
            · Demandée le {new Date(a.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
          <ContactActions userId={a.user.id} size="sm" className="ml-auto" />
        </div>
      </div>

      {/* Actions */}
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-3 py-2 sm:px-4">
        <button
          onClick={onReject}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-danger/40 px-3 py-1.5 text-[12.5px] font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" /> Refuser
        </button>
        <button
          onClick={onApprove}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Approuver
        </button>
      </footer>
    </article>
  );
}

function Avatar({
  firstName,
  lastName,
  url,
}: {
  firstName: string;
  lastName: string;
  url: string | null;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />;
  }
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary-100 text-[12px] font-semibold text-primary-700">
      {initials}
    </span>
  );
}

function KpiCard({
  icon,
  label,
  value,
  unit,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "ok" | "warning";
}) {
  const toneCls = {
    default: "bg-surface-alt text-ink",
    ok: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2">
        <span className={clsx("grid h-8 w-8 place-items-center rounded-full", toneCls)}>
          {icon}
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
          {label}
        </span>
      </div>
      <div className="mt-2 font-mono text-[20px] font-bold tabular-nums text-ink">
        {value}
        {unit && <span className="ml-1 text-[11px] font-medium text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}
