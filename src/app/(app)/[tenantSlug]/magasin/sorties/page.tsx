"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, ArrowUpFromLine } from "lucide-react";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";
import { postOrQueue } from "@/lib/offline/db";

interface Article {
  id: string;
  code: string;
  name: string;
  unit: string;
  stockQuantity?: number;
}

interface Movement {
  id: string;
  reference: string;
  articleCode: string;
  articleName: string;
  quantity: number;
  unit: string;
  totalValue: number;
  destinationTeam: string | null;
  occurredAt: string;
}

export default function MagSortiesPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const qc = useQueryClient();

  const recent = useQuery({
    queryKey: ["mag", "movements", "OUT"],
    queryFn: async () => {
      const res = await fetch("/api/mag/stock-movements?direction=OUT&limit=20", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Movement[] }>;
    },
  });

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Sorties de stock</h1>
        <SyncStatusBadge />
      </header>

      <button
        type="button"
        onClick={() => setWizardOpen(true)}
        style={{ minHeight: 56 }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-violet-700 px-3 text-[14px] font-semibold text-white hover:opacity-95"
      >
        <Plus className="h-5 w-5" /> Nouveau bon de sortie
      </button>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Bons de sortie récents
        </h2>
        {recent.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-md bg-surface-alt" />)}
          </div>
        ) : recent.data?.items.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-ink-3">
            Aucune sortie enregistrée.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {recent.data?.items.map((m) => (
              <li
                key={m.id}
                style={{ minHeight: 68 }}
                className="flex items-center gap-2 rounded-lg border border-line bg-white p-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
                  <ArrowUpFromLine className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{m.reference}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {m.articleCode} · {m.articleName} · {m.quantity} {m.unit}
                  </div>
                  <div className="text-[10.5px] text-ink-3">
                    {new Date(m.occurredAt).toLocaleString("fr-FR")}
                  </div>
                </div>
                <div className="text-right text-[13px] font-semibold tabular-nums text-danger">
                  -{new Intl.NumberFormat("fr-FR").format(Math.round(m.totalValue))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {wizardOpen && <NewOutgoingWizard onClose={() => setWizardOpen(false)} onCreated={() => qc.invalidateQueries({ queryKey: ["mag"] })} />}
    </div>
  );
}

function NewOutgoingWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [articleId, setArticleId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [destinationUserId, setDestinationUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const articles = useQuery({
    queryKey: ["mag", "articles-out"],
    queryFn: async () => {
      const res = await fetch("/api/mag/articles?limit=200&inStockOnly=1", { credentials: "same-origin" });
      if (!res.ok) return { items: [] };
      return res.json() as Promise<{ items: Article[] }>;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      setError(null);
      const body = {
        articleId,
        quantity: Number(quantity),
        reference: reference || `BS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        destinationUserId: destinationUserId || null,
        notes,
        clientUuid: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined,
      };
      const result = await postOrQueue("stock-out-queue", "/api/mag/stock-movements/out", body, { priority: "NORMAL" });
      if (result.response && !result.response.ok) {
        const e = await result.response.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return result;
    },
    onSuccess: () => {
      onCreated();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const selectedArticle = articles.data?.items.find((a) => a.id === articleId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-md flex-col rounded-t-xl bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line p-3">
          <h2 className="text-[14px] font-semibold text-ink">Nouveau bon de sortie</h2>
          <button type="button" onClick={onClose} style={{ minHeight: 40, minWidth: 40 }} className="text-ink-3">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          <label className="block text-[12px] font-medium text-ink-2">
            Article
            <select
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              style={{ minHeight: 48, fontSize: 16 }}
              className="mt-1 w-full rounded-md border border-line bg-white px-2"
            >
              <option value="">— Sélectionner —</option>
              {articles.data?.items.map((a) => (
                <option key={a.id} value={a.id}>{a.code} · {a.name}{a.stockQuantity !== undefined ? ` (${a.stockQuantity} ${a.unit})` : ""}</option>
              ))}
            </select>
          </label>
          <label className="block text-[12px] font-medium text-ink-2">
            Quantité {selectedArticle && `(${selectedArticle.unit})`}
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ minHeight: 48, fontSize: 16 }}
              className="mt-1 w-full rounded-md border border-line bg-white px-2"
            />
          </label>
          <label className="block text-[12px] font-medium text-ink-2">
            Référence BS
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Auto BS-2026-XXXX"
              style={{ minHeight: 48, fontSize: 16 }}
              className="mt-1 w-full rounded-md border border-line bg-white px-2"
            />
          </label>
          <label className="block text-[12px] font-medium text-ink-2">
            Signataire (chef d'équipe — optionnel)
            <input
              value={destinationUserId}
              onChange={(e) => setDestinationUserId(e.target.value)}
              placeholder="ID utilisateur"
              style={{ minHeight: 48, fontSize: 16 }}
              className="mt-1 w-full rounded-md border border-line bg-white px-2"
            />
          </label>
          <label className="block text-[12px] font-medium text-ink-2">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ fontSize: 16 }}
              className="mt-1 w-full rounded-md border border-line bg-white p-2"
            />
          </label>
          {error && <div className="rounded-md border border-danger/30 bg-danger/5 p-2 text-[12px] text-danger">{error}</div>}
        </div>
        <footer className="border-t border-line p-3">
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={!articleId || !quantity || create.isPending}
            style={{ minHeight: 56 }}
            className="w-full rounded-md bg-primary-600 text-[14px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {create.isPending ? "Enregistrement…" : "Valider le bon de sortie"}
          </button>
        </footer>
      </div>
    </div>
  );
}
