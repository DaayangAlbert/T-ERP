"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { PageHelp } from "@/components/help/PageHelp";
import { CcDemandesMaterielTutorial } from "@/components/help/tutorials/CcDemandesMaterielTutorial";

type Status = "PENDING" | "FULFILLED" | "PARTIAL" | "REJECTED" | "CANCELLED";
type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface RequestLine {
  id: string;
  article: { id: string; code: string; name: string; unit: string; category: string };
  quantityRequested: number;
  quantityFulfilled: number | null;
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
  fulfilledBy: string | null;
  fulfilledAt: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  createdAt: string;
  lines: RequestLine[];
}

const STATUS_BADGE: Record<Status, { label: string; tone: string }> = {
  PENDING: { label: "En attente", tone: "bg-amber-100 text-amber-800" },
  FULFILLED: { label: "Honorée", tone: "bg-emerald-100 text-emerald-700" },
  PARTIAL: { label: "Partielle", tone: "bg-blue-100 text-blue-700" },
  REJECTED: { label: "Refusée", tone: "bg-danger/10 text-danger" },
  CANCELLED: { label: "Annulée", tone: "bg-surface-alt text-ink-3" },
};

const PRIORITY_BADGE: Record<Priority, { label: string; tone: string }> = {
  LOW: { label: "Basse", tone: "bg-surface-alt text-ink-3" },
  NORMAL: { label: "Normale", tone: "bg-blue-50 text-blue-700" },
  HIGH: { label: "Élevée", tone: "bg-amber-50 text-amber-700" },
  URGENT: { label: "Urgent", tone: "bg-danger/10 text-danger" },
};

export default function CcMaterialRequestsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cc", "material-requests"],
    queryFn: async (): Promise<{ items: Request[] }> => {
      const res = await fetch("/api/cc/material-requests", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 20_000,
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cc/material-requests/${id}/cancel`, {
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
      setFeedback({ tone: "ok", msg: "Demande annulée." });
      qc.invalidateQueries({ queryKey: ["cc", "material-requests"] });
    },
    onError: (e: Error) => setFeedback({ tone: "err", msg: e.message }),
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
            Sollicitez le magasinier pour le matériel nécessaire à votre
            chantier. Vous serez notifié dès qu'une demande est traitée.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-500 px-3 py-2 text-[13px] font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" /> Nouvelle demande
          </button>
          <PageHelp title="Aide — Demandes matériel"><CcDemandesMaterielTutorial /></PageHelp>
        </div>
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

      {isLoading && <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />}

      {!isLoading && pending.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            <Clock className="h-3.5 w-3.5" /> En attente ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((r) => (
              <RequestCard key={r.id} request={r} onCancel={() => cancel.mutate(r.id)} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && history.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            <Package className="h-3.5 w-3.5" /> Historique ({history.length})
          </h2>
          <div className="space-y-3">
            {history.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-surface-alt p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-ink-3" />
          <h3 className="mt-2 text-sm font-semibold text-ink">Aucune demande</h3>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Cliquez sur "Nouvelle demande" pour solliciter du matériel.
          </p>
        </div>
      )}

      {modalOpen && (
        <NewRequestModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            setFeedback({ tone: "ok", msg: "Demande envoyée au magasinier." });
            qc.invalidateQueries({ queryKey: ["cc", "material-requests"] });
          }}
        />
      )}
    </>
  );
}

function RequestCard({ request: r, onCancel }: { request: Request; onCancel?: () => void }) {
  const status = STATUS_BADGE[r.status];
  const priority = PRIORITY_BADGE[r.priority];
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
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
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            priority.tone,
          )}
        >
          {priority.label}
        </span>
        <span className="ml-auto text-[11px] text-ink-3">
          {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
        </span>
      </header>
      <div className="space-y-2 p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-3">
          <span>
            Chantier : <strong className="text-ink-2">{r.site.name}</strong>
          </span>
          <span>·</span>
          <span>
            Magasin : <strong className="text-ink-2">{r.warehouse.name}</strong>
          </span>
        </div>
        {r.reason && (
          <p className="text-[12.5px] text-ink-2">
            <strong className="text-ink-3">Motif : </strong>
            {r.reason}
          </p>
        )}
        <table className="w-full text-[12px]">
          <thead className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
            <tr className="border-b border-line">
              <th className="py-1 text-left">Article</th>
              <th className="py-1 text-right">Demandé</th>
              <th className="py-1 text-right">Servi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {r.lines.map((l) => (
              <tr key={l.id}>
                <td className="py-1.5">
                  <div className="font-medium text-ink">{l.article.name}</div>
                  <div className="text-[10.5px] text-ink-3">{l.article.code}</div>
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">
                  {l.quantityRequested} {l.article.unit}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">
                  {l.quantityFulfilled !== null ? (
                    <span
                      className={clsx(
                        l.quantityFulfilled < l.quantityRequested
                          ? "text-amber-700"
                          : "text-emerald-700",
                      )}
                    >
                      {l.quantityFulfilled} {l.article.unit}
                    </span>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.rejectionReason && (
          <div className="rounded-md border border-danger/30 bg-danger/5 p-2 text-[11.5px] text-danger">
            <strong>Refusée :</strong> {r.rejectionReason}
          </div>
        )}
        {r.fulfilledBy && (
          <div className="text-[10.5px] text-ink-3">
            Traitée par {r.fulfilledBy} ·{" "}
            {r.fulfilledAt && new Date(r.fulfilledAt).toLocaleDateString("fr-FR")}
          </div>
        )}
      </div>
      {onCancel && (
        <footer className="flex justify-end border-t border-line px-3 py-2">
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11.5px] text-ink-3 hover:bg-surface-alt"
          >
            <Trash2 className="h-3 w-3" /> Annuler
          </button>
        </footer>
      )}
    </article>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Modal "Nouvelle demande"
// ════════════════════════════════════════════════════════════════════════

interface Article {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  site: { id: string; code: string; name: string } | null;
}

interface DraftLine {
  articleId: string;
  quantity: string;
  notes: string;
}

function NewRequestModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { articleId: "", quantity: "", notes: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  // Récupère les magasins accessibles
  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async (): Promise<{ items: Warehouse[] }> => {
      const res = await fetch("/api/warehouses", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Erreur magasins");
      return res.json();
    },
  });
  const warehouses = warehousesData?.items ?? [];

  // Récupère les articles du tenant (route mag/articles existe pour les keepers)
  // Plus simple : utilise les WarehouseStock du magasin sélectionné pour suggérer
  const { data: articlesData } = useQuery({
    queryKey: ["mag", "articles", warehouseId],
    queryFn: async (): Promise<{ items: Article[] }> => {
      // Fallback : on récupère via les warehouseStocks
      if (!warehouseId) return { items: [] };
      const res = await fetch(`/api/stocks/by-warehouse?warehouseId=${warehouseId}`, {
        credentials: "same-origin",
      });
      if (!res.ok) return { items: [] };
      const json = (await res.json()) as {
        items: Array<{ article: Article }>;
      };
      // dedup par article
      const map = new Map<string, Article>();
      for (const s of json.items) map.set(s.article.id, s.article);
      return { items: Array.from(map.values()) };
    },
    enabled: Boolean(warehouseId),
  });
  const articles = articlesData?.items ?? [];

  // Site du warehouse sélectionné (peut être null si DIRECTION/CENTRAL)
  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);
  const siteId = selectedWarehouse?.site?.id ?? "";

  const create = useMutation({
    mutationFn: async () => {
      const validLines = lines
        .filter((l) => l.articleId && Number(l.quantity) > 0)
        .map((l) => ({
          articleId: l.articleId,
          quantityRequested: Number(l.quantity),
          notes: l.notes || undefined,
        }));
      if (validLines.length === 0) throw new Error("Ajoutez au moins un article");
      if (!siteId) throw new Error("Le magasin sélectionné n'est pas rattaché à un chantier");
      const res = await fetch("/api/cc/material-requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          warehouseId,
          priority,
          reason: reason || undefined,
          lines: validLines,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: onCreated,
    onError: (e: Error) => setError(e.message),
  });

  const addLine = () =>
    setLines((ls) => [...ls, { articleId: "", quantity: "", notes: "" }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const canSubmit = useMemo(() => {
    return (
      warehouseId &&
      siteId &&
      lines.some((l) => l.articleId && Number(l.quantity) > 0)
    );
  }, [warehouseId, siteId, lines]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[700px] max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-2 border-b border-line bg-primary-500 px-4 py-3 text-white">
          <h2 className="text-[15px] font-semibold">Nouvelle demande de matériel</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/15"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Field label="Magasin sollicité *">
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] focus:border-primary-300 focus:outline-none"
            >
              <option value="">— Sélectionner —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                  {w.site ? ` · ${w.site.code}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priorité">
            <div className="flex flex-wrap gap-1">
              {(["LOW", "NORMAL", "HIGH", "URGENT"] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={clsx(
                    "rounded-md border px-3 py-1 text-[11.5px] font-medium",
                    priority === p
                      ? PRIORITY_BADGE[p].tone + " border-current"
                      : "border-line text-ink-3 hover:bg-surface-alt",
                  )}
                >
                  {PRIORITY_BADGE[p].label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Motif / contexte (optionnel)">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="Ex : Phase coffrage dalle 2e étage"
              className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] focus:border-primary-300 focus:outline-none"
            />
          </Field>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
                Articles demandés
              </span>
              <button
                type="button"
                onClick={addLine}
                disabled={!warehouseId}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[11.5px] text-ink-2 hover:bg-surface-alt disabled:opacity-50"
              >
                <Plus className="h-3 w-3" /> Ajouter une ligne
              </button>
            </div>

            {!warehouseId && (
              <p className="text-[12px] italic text-ink-3">
                Sélectionnez d'abord un magasin pour charger les articles.
              </p>
            )}

            {warehouseId && (
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-2 rounded-md border border-line bg-surface-alt p-2"
                  >
                    <select
                      value={l.articleId}
                      onChange={(e) => updateLine(i, { articleId: e.target.value })}
                      className="col-span-7 h-8 rounded-md border border-line bg-white px-2 text-[12px]"
                    >
                      <option value="">— Article —</option>
                      {articles.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.code})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={l.quantity}
                      onChange={(e) => updateLine(i, { quantity: e.target.value })}
                      placeholder="Qté"
                      className="col-span-3 h-8 rounded-md border border-line bg-white px-2 text-right text-[12px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={lines.length === 1}
                      className="col-span-2 grid h-8 place-items-center rounded-md border border-line bg-white text-ink-3 hover:bg-danger/5 hover:text-danger disabled:opacity-30"
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
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
            onClick={() => create.mutate()}
            disabled={!canSubmit || create.isPending}
            className="rounded-md bg-primary-500 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {create.isPending ? "Envoi…" : "Envoyer au magasinier"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {label}
      </span>
      {children}
    </label>
  );
}
