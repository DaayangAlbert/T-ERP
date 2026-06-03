"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Factory,
  Hourglass,
  Package,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { formatFCFA } from "@/lib/format";
import { ContactActions } from "@/components/contact/ContactActions";
import { PageHelp } from "@/components/help/PageHelp";
import { MagDemandesTutorial } from "@/components/help/tutorials/MagDemandesTutorial";

type Status = "PENDING" | "FULFILLED" | "PARTIAL" | "REJECTED" | "CANCELLED";
type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface RequestLine {
  id: string;
  article: { id: string; code: string; name: string; unit: string; category: string };
  quantityRequested: number;
  quantityFulfilled: number | null;
  availableInStock: number;
  notes: string | null;
}

interface Request {
  id: string;
  reference: string;
  status: Status;
  priority: Priority;
  reason: string | null;
  notes: string | null;
  site: { id: string; code: string; name: string };
  warehouse: { id: string; code: string; name: string };
  requester: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    phoneMobile: string | null;
  };
  fulfilledAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  lines: RequestLine[];
}

const PRIORITY_BADGE: Record<Priority, { label: string; tone: string }> = {
  LOW: { label: "Basse", tone: "bg-surface-alt text-ink-3" },
  NORMAL: { label: "Normale", tone: "bg-blue-50 text-blue-700" },
  HIGH: { label: "Élevée", tone: "bg-amber-50 text-amber-700" },
  URGENT: { label: "Urgent", tone: "bg-danger/10 text-danger" },
};

const STATUS_BADGE: Record<Status, { label: string; tone: string }> = {
  PENDING: { label: "En attente", tone: "bg-amber-100 text-amber-800" },
  FULFILLED: { label: "Honorée", tone: "bg-emerald-100 text-emerald-700" },
  PARTIAL: { label: "Partielle", tone: "bg-blue-100 text-blue-700" },
  REJECTED: { label: "Refusée", tone: "bg-danger/10 text-danger" },
  CANCELLED: { label: "Annulée", tone: "bg-surface-alt text-ink-3" },
};

type Tab = "pending" | "history";

export default function MagasinDemandesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [fulfillFor, setFulfillFor] = useState<Request | null>(null);
  const [rejectFor, setRejectFor] = useState<Request | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["mag", "material-requests"],
    queryFn: async (): Promise<{ items: Request[]; summary: { pendingCount: number; totalCount: number } }> => {
      const res = await fetch("/api/mag/material-requests", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 15_000,
  });

  const items = data?.items ?? [];
  const pending = items.filter((r) => r.status === "PENDING");
  const history = items.filter((r) => r.status !== "PENDING");

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Demandes de matériel
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Demandes émises par les chefs de chantier. Validation = sortie de
            stock immédiate (création des mouvements OUT).
          </p>
        </div>
        <PageHelp title="Aide — Demandes magasin"><MagDemandesTutorial /></PageHelp>
      </header>

      {feedback && (
        <div
          className={clsx(
            "mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-[12.5px]",
            feedback.tone === "ok"
              ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border border-danger/30 bg-danger/5 text-danger",
          )}
        >
          {feedback.tone === "ok" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <div className="flex-1">{feedback.msg}</div>
          <button onClick={() => setFeedback(null)} aria-label="Fermer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1 overflow-x-auto border-b border-line">
        <TabBtn
          active={tab === "pending"}
          onClick={() => setTab("pending")}
          icon={<Hourglass className="h-3.5 w-3.5" />}
          label="En attente"
          count={pending.length}
        />
        <TabBtn
          active={tab === "history"}
          onClick={() => setTab("history")}
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Historique"
          count={history.length}
          muted
        />
      </div>

      {isLoading && <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />}

      {!isLoading && tab === "pending" && pending.length === 0 && (
        <EmptyState
          icon={<CheckCircle2 className="h-8 w-8 text-emerald-600" />}
          title="Aucune demande en attente"
          message="Toutes les demandes de matériel ont été traitées. Bon travail !"
        />
      )}

      {!isLoading && tab === "pending" && pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((r) => (
            <PendingCard
              key={r.id}
              request={r}
              onFulfill={() => setFulfillFor(r)}
              onReject={() => setRejectFor(r)}
            />
          ))}
        </div>
      )}

      {!isLoading && tab === "history" && history.length === 0 && (
        <EmptyState
          icon={<Package className="h-8 w-8 text-ink-3" />}
          title="Aucun historique"
          message="Aucune demande traitée pour l'instant."
        />
      )}

      {!isLoading && tab === "history" && history.length > 0 && (
        <div className="space-y-3">
          {history.map((r) => (
            <HistoryCard key={r.id} request={r} />
          ))}
        </div>
      )}

      {fulfillFor && (
        <FulfillModal
          request={fulfillFor}
          onClose={() => setFulfillFor(null)}
          onSuccess={() => {
            setFulfillFor(null);
            setFeedback({ tone: "ok", msg: "Sortie de stock enregistrée. Le CC est notifié." });
            qc.invalidateQueries({ queryKey: ["mag", "material-requests"] });
          }}
        />
      )}

      {rejectFor && (
        <RejectModal
          request={rejectFor}
          onClose={() => setRejectFor(null)}
          onSuccess={() => {
            setRejectFor(null);
            setFeedback({ tone: "ok", msg: "Demande refusée. Le CC est notifié avec le motif." });
            qc.invalidateQueries({ queryKey: ["mag", "material-requests"] });
          }}
        />
      )}
    </>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  count,
  muted,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition",
        active ? "text-primary-700" : "text-ink-3 hover:text-ink",
      )}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={clsx(
            "rounded-full px-1.5 text-[10px] font-semibold",
            muted ? "bg-surface-alt text-ink-3" : "bg-primary-100 text-primary-700",
          )}
        >
          {count}
        </span>
      )}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  );
}

function PendingCard({
  request: r,
  onFulfill,
  onReject,
}: {
  request: Request;
  onFulfill: () => void;
  onReject: () => void;
}) {
  const priority = PRIORITY_BADGE[r.priority];
  const lowStockCount = r.lines.filter((l) => l.availableInStock < l.quantityRequested).length;
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-alt px-3 py-2">
        <span className="font-mono text-[11.5px] text-ink-2">{r.reference}</span>
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            priority.tone,
          )}
        >
          {priority.label}
        </span>
        {lowStockCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            <AlertTriangle className="h-2.5 w-2.5" /> stock insuffisant ({lowStockCount})
          </span>
        )}
        <span className="ml-auto text-[11px] text-ink-3">
          Reçue le {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
        </span>
      </header>

      <div className="space-y-2 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={r.requester.fullName} url={r.requester.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink">{r.requester.fullName}</div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-3">
              <span className="inline-flex items-center gap-1">
                <Factory className="h-3 w-3" /> {r.site.name} ({r.site.code})
              </span>
            </div>
          </div>
          <ContactActions userId={r.requester.id} size="sm" />
        </div>

        {r.reason && (
          <p className="text-[12.5px] text-ink-2">
            <strong className="text-ink-3">Motif : </strong>
            {r.reason}
          </p>
        )}

        <table className="w-full text-[12px]">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
            <tr className="border-b border-line">
              <th className="py-1 text-left">Article</th>
              <th className="py-1 text-right">Demandé</th>
              <th className="py-1 text-right">Stock dispo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {r.lines.map((l) => {
              const insufficient = l.availableInStock < l.quantityRequested;
              return (
                <tr key={l.id} className={clsx(insufficient && "bg-amber-50/40")}>
                  <td className="py-1.5">
                    <div className="font-medium text-ink">{l.article.name}</div>
                    <div className="text-[10.5px] text-ink-3">{l.article.code}</div>
                  </td>
                  <td className="py-1.5 text-right font-mono tabular-nums">
                    {l.quantityRequested} {l.article.unit}
                  </td>
                  <td className="py-1.5 text-right font-mono tabular-nums">
                    <span
                      className={clsx(
                        insufficient ? "font-semibold text-amber-700" : "text-ink-2",
                      )}
                    >
                      {l.availableInStock} {l.article.unit}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-3 py-2">
        <button
          onClick={onReject}
          className="inline-flex items-center gap-1 rounded-md border border-danger/40 px-3 py-1.5 text-[12.5px] font-medium text-danger hover:bg-danger/5"
        >
          <X className="h-3.5 w-3.5" /> Refuser
        </button>
        <button
          onClick={onFulfill}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-emerald-700"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Servir
        </button>
      </footer>
    </article>
  );
}

function HistoryCard({ request: r }: { request: Request }) {
  const status = STATUS_BADGE[r.status];
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white opacity-90">
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-alt px-3 py-2">
        <span className="font-mono text-[11.5px] text-ink-2">{r.reference}</span>
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            status.tone,
          )}
        >
          {status.label}
        </span>
        <span className="ml-auto text-[11px] text-ink-3">
          {r.fulfilledAt
            ? `Traitée le ${new Date(r.fulfilledAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}`
            : `Créée le ${new Date(r.createdAt).toLocaleDateString("fr-FR")}`}
        </span>
      </header>
      <div className="p-3 text-[12px] text-ink-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{r.requester.fullName}</span>
          <span className="text-ink-3">·</span>
          <span>{r.site.name}</span>
        </div>
        <div className="mt-1 text-[11px] text-ink-3">
          {r.lines.length} article{r.lines.length > 1 ? "s" : ""} ·{" "}
          {r.lines.reduce((acc, l) => acc + (l.quantityFulfilled ?? 0), 0)} unités servies
        </div>
        {r.rejectionReason && (
          <div className="mt-2 rounded-md border border-danger/30 bg-danger/5 px-2 py-1 text-[11.5px] text-danger">
            Refusée : {r.rejectionReason}
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface-alt p-8 text-center">
      <div className="mx-auto">{icon}</div>
      <h3 className="mt-2 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-[12.5px] text-ink-3">{message}</p>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />;
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0))
    .join("")
    .toUpperCase();
  return (
    <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary-100 text-[12px] font-semibold text-primary-700">
      {initials}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Modal Servir (fulfill)
// ════════════════════════════════════════════════════════════════════════

function FulfillModal({
  request: r,
  onClose,
  onSuccess,
}: {
  request: Request;
  onClose: () => void;
  onSuccess: () => void;
}) {
  // Pré-remplit avec : min(demandé, dispo). Le mag peut ajuster avant validation.
  const [quantities, setQuantities] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const l of r.lines) {
      const auto = Math.min(l.quantityRequested, l.availableInStock);
      out[l.id] = String(auto);
    }
    return out;
  });
  const [error, setError] = useState<string | null>(null);

  const partial = useMemo(() => {
    return r.lines.some((l) => Number(quantities[l.id] ?? 0) < l.quantityRequested);
  }, [r.lines, quantities]);

  const totalServed = useMemo(() => {
    return r.lines.reduce((acc, l) => acc + Number(quantities[l.id] ?? 0), 0);
  }, [r.lines, quantities]);

  const submit = useMutation({
    mutationFn: async () => {
      const lines = r.lines.map((l) => ({
        lineId: l.id,
        quantityFulfilled: Number(quantities[l.id] ?? 0),
      }));
      const res = await fetch(`/api/mag/material-requests/${r.id}/fulfill`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[640px] max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-2 border-b border-line bg-emerald-600 px-4 py-3 text-white">
          <div>
            <h2 className="text-[15px] font-semibold">Servir la demande</h2>
            <p className="text-[11.5px] text-white/80 font-mono">{r.reference}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/15"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 text-[12.5px] text-ink-2">
            <strong>{r.requester.fullName}</strong> · {r.site.name}
          </div>

          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
              <tr className="border-b border-line">
                <th className="py-1 text-left">Article</th>
                <th className="py-1 text-right">Demandé</th>
                <th className="py-1 text-right">Dispo</th>
                <th className="py-1 text-right">À servir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {r.lines.map((l) => {
                const v = Number(quantities[l.id] ?? 0);
                const overStock = v > l.availableInStock;
                const overRequest = v > l.quantityRequested;
                const insufficient = v < l.quantityRequested;
                return (
                  <tr key={l.id}>
                    <td className="py-2">
                      <div className="font-medium text-ink">{l.article.name}</div>
                      <div className="text-[10.5px] text-ink-3">{l.article.code}</div>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-ink-3">
                      {l.quantityRequested} {l.article.unit}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-ink-3">
                      {l.availableInStock} {l.article.unit}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={Math.min(l.quantityRequested, l.availableInStock)}
                          value={quantities[l.id] ?? "0"}
                          onChange={(e) =>
                            setQuantities((q) => ({ ...q, [l.id]: e.target.value }))
                          }
                          className={clsx(
                            "h-8 w-20 rounded-md border bg-white px-2 text-right font-mono text-[12px]",
                            overStock || overRequest
                              ? "border-danger"
                              : insufficient
                                ? "border-amber-400"
                                : "border-line",
                          )}
                        />
                        <span className="w-10 text-left text-[10.5px] text-ink-3">
                          {l.article.unit}
                        </span>
                      </div>
                      {overStock && (
                        <div className="text-[10px] text-danger">{">"} stock</div>
                      )}
                      {overRequest && (
                        <div className="text-[10px] text-danger">{">"} demandé</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-3 rounded-md border border-line bg-surface-alt p-2 text-[11.5px] text-ink-3">
            <strong className="text-ink-2">Total servi : {totalServed} unités</strong>
            {partial && (
              <span className="ml-2 text-amber-700">
                · Sortie partielle (demande sera marquée PARTIAL)
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="border-t border-line bg-danger/5 px-4 py-2 text-[12.5px] text-danger">
            {error}
          </div>
        )}
        <footer className="flex items-center justify-end gap-2 border-t border-line bg-white px-3 py-2.5">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submit.isPending ? "Envoi…" : "Confirmer la sortie"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Modal Refuser
// ════════════════════════════════════════════════════════════════════════

function RejectModal({
  request: r,
  onClose,
  onSuccess,
}: {
  request: Request;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/mag/material-requests/${r.id}/reject`, {
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
    onSuccess,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-2xl">
        <h2 className="text-[15px] font-semibold text-ink">Refuser la demande</h2>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {r.reference} · {r.requester.fullName} ({r.site.code})
        </p>
        <label className="mt-3 block text-[11.5px] font-semibold text-ink-2">
          Motif du refus (obligatoire, visible par le CC)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          maxLength={500}
          placeholder="Ex : stock insuffisant, attendre prochaine livraison vendredi..."
          className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12.5px]"
        />
        <p className="mt-1 text-[10.5px] text-ink-3">{reason.length}/500 caractères</p>
        {error && (
          <div className="mt-2 rounded-md border border-danger/30 bg-danger/5 px-2 py-1 text-[11.5px] text-danger">
            {error}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={reason.trim().length < 3 || submit.isPending}
            className="rounded-md bg-danger px-3 py-1.5 text-[13px] font-medium text-white hover:bg-danger/90 disabled:opacity-50"
          >
            {submit.isPending ? "Envoi…" : "Confirmer le refus"}
          </button>
        </div>
      </div>
    </div>
  );
}
