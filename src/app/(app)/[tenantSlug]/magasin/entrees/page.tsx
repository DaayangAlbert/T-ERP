"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Camera, Pencil, Truck, Plus, X } from "lucide-react";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";
import { postOrQueue } from "@/lib/offline/db";
import { PageHelp } from "@/components/help/PageHelp";
import { MagEntreesTutorial } from "@/components/help/tutorials/MagEntreesTutorial";

interface ExpectedDelivery {
  id: string;
  scheduledAt: string;
  status: string;
  deliveryNoteRef: string | null;
  items: Array<{ articleCode: string; label: string; expectedQty: number; receivedQty?: number }>;
}

interface Article {
  id: string;
  code: string;
  name: string;
  unit: string;
}

export default function MagEntreesPage() {
  const [manualOpen, setManualOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["mag", "deliveries-today"],
    queryFn: async () => {
      const res = await fetch("/api/mag/deliveries/today", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: ExpectedDelivery[] }>;
    },
  });

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Entrées de stock</h1>
        <div className="flex items-center gap-2">
          <SyncStatusBadge />
          <PageHelp title="Aide — Entrées"><MagEntreesTutorial /></PageHelp>
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Livraisons attendues aujourd'hui
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-alt" />)}
          </div>
        ) : data?.items.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-ink-3">
            Aucune livraison planifiée aujourd'hui.
          </p>
        ) : (
          <div className="space-y-2">
            {data?.items.map((d) => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                onReceived={() => qc.invalidateQueries({ queryKey: ["mag"] })}
              />
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => setManualOpen(true)}
        style={{ minHeight: 56 }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-2 bg-white px-3 text-[13px] font-medium text-ink-3 hover:border-primary-300 hover:text-primary-700"
      >
        <Plus className="h-4 w-4" /> Entrée hors livraison planifiée
      </button>

      {manualOpen && (
        <ManualEntryModal onClose={() => setManualOpen(false)} onCreated={() => {
          qc.invalidateQueries({ queryKey: ["mag"] });
        }} />
      )}
    </div>
  );
}

function DeliveryCard({ delivery, onReceived }: { delivery: ExpectedDelivery; onReceived: () => void }) {
  const time = new Date(delivery.scheduledAt);
  const dayLabel = time.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const timeLabel = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <article className="rounded-xl border border-line bg-white p-3 shadow-card" style={{ minHeight: 80 }}>
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700">
          <Truck className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13.5px] font-semibold text-ink">{dayLabel} · {timeLabel}</div>
            <span className={clsx(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              delivery.status === "RECEIVED" ? "bg-success/10 text-success" : "bg-primary-50 text-primary-700"
            )}>
              {delivery.status}
            </span>
          </div>
          <div className="mt-0.5 text-[11.5px] text-ink-3">
            {delivery.deliveryNoteRef ?? "BL à venir"} · {delivery.items.length} article(s)
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          style={{ minHeight: 48 }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary-600 px-3 text-[13px] font-medium text-white hover:bg-primary-700"
          onClick={() => alert("Scan BL : stub — caméra ouverte sur device mobile")}
        >
          <Camera className="h-4 w-4" /> Scanner BL
        </button>
        <button
          type="button"
          style={{ minHeight: 48 }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[13px] font-medium text-ink-2"
          onClick={onReceived}
        >
          <Pencil className="h-4 w-4" /> Saisir manuel
        </button>
      </div>
    </article>
  );
}

function ManualEntryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [articleId, setArticleId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const articles = useQuery({
    queryKey: ["mag", "articles-light"],
    queryFn: async () => {
      const res = await fetch("/api/mag/articles?limit=200", { credentials: "same-origin" });
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
        unitPrice: Number(unitPrice),
        reference,
        notes,
        clientUuid: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined,
      };
      const result = await postOrQueue("stock-in-queue", "/api/mag/stock-movements/in", body, { priority: "NORMAL" });
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-md flex-col rounded-t-xl bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line p-3">
          <h2 className="text-[14px] font-semibold text-ink">Nouvelle entrée stock</h2>
          <button type="button" onClick={onClose} className="text-ink-3" style={{ minHeight: 40, minWidth: 40 }}>
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          <Field label="Article">
            <select
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              style={{ minHeight: 48, fontSize: 16 }}
              className="w-full rounded-md border border-line bg-white px-2"
            >
              <option value="">— Sélectionner —</option>
              {articles.data?.items.map((a) => (
                <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantité reçue">
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ minHeight: 48, fontSize: 16 }}
              className="w-full rounded-md border border-line bg-white px-2"
            />
          </Field>
          <Field label="Prix d'achat unitaire (FCFA)">
            <input
              type="number"
              inputMode="decimal"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              style={{ minHeight: 48, fontSize: 16 }}
              className="w-full rounded-md border border-line bg-white px-2"
            />
          </Field>
          <Field label="Référence BL/BC">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="BL-2026-0451"
              style={{ minHeight: 48, fontSize: 16 }}
              className="w-full rounded-md border border-line bg-white px-2"
            />
          </Field>
          <Field label="Notes (optionnel)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ fontSize: 16 }}
              className="w-full rounded-md border border-line bg-white p-2"
            />
          </Field>
          {error && <div className="rounded-md border border-danger/30 bg-danger/5 p-2 text-[12px] text-danger">{error}</div>}
        </div>
        <footer className="border-t border-line p-3">
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={!articleId || !quantity || !unitPrice || !reference || create.isPending}
            style={{ minHeight: 56 }}
            className="w-full rounded-md bg-primary-600 px-3 text-[14px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {create.isPending ? "Enregistrement…" : "Enregistrer l'entrée"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-medium text-ink-2">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
