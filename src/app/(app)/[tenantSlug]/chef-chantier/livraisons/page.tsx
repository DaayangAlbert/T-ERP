"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Edit3, Check, X, Truck } from "lucide-react";
import { clsx } from "clsx";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";
import { postOrQueue } from "@/lib/offline/db";

interface Delivery {
  id: string;
  scheduledAt: string;
  receivedAt: string | null;
  status: string;
  deliveryNoteRef: string | null;
  items: Array<{ articleCode: string; label?: string; expectedQty: number; receivedQty?: number }>;
}

export default function LivraisonsPage() {
  const qc = useQueryClient();
  const [manualReceipt, setManualReceipt] = useState<Delivery | null>(null);

  const { data } = useQuery({
    queryKey: ["cc", "deliveries-today"],
    queryFn: async () => {
      const res = await fetch("/api/cc/deliveries/today", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ today: Delivery[]; recent: Delivery[] }>;
    },
  });

  return (
    <div id="screen-cc-livraisons" className="space-y-3">
      <header className="-mx-3 sm:-mx-4 md:-mx-6 sticky top-14 z-20 bg-gradient-to-r from-primary-600 via-violet-700 to-primary-700 px-3 py-2 text-white shadow-md">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[14px] font-semibold">Livraisons du jour</h1>
          <SyncStatusBadge />
        </div>
      </header>

      <section className="space-y-2">
        {data?.today.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
            Aucune livraison attendue aujourd&apos;hui.
          </p>
        ) : (
          data?.today.map((d) => {
            const received = d.status === "RECEIVED" || d.status === "PARTIALLY_RECEIVED";
            const scheduled = new Date(d.scheduledAt);
            const minutesAway = Math.round((scheduled.getTime() - Date.now()) / 60_000);
            return (
              <article
                key={d.id}
                className={clsx(
                  "rounded-xl border-l-4 bg-white p-3 shadow-card",
                  received ? "border-l-success bg-success/5" : minutesAway < 120 ? "border-l-warning" : "border-l-primary-500"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-lg bg-surface-alt text-center">
                    <div>
                      <div className="text-[10px] uppercase text-ink-3">
                        {scheduled.toLocaleString("fr-FR", { weekday: "short" })}
                      </div>
                      <div className="text-xl font-bold text-ink">{scheduled.getDate()}</div>
                      <div className="text-[10px] text-ink-3">
                        {scheduled.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink">{d.deliveryNoteRef ?? "BL à scanner"}</div>
                    <div className="text-[11.5px] text-ink-3">
                      {received
                        ? `✓ Reçu ${d.receivedAt ? new Date(d.receivedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}`
                        : minutesAway > 0
                          ? `Dans ${Math.floor(minutesAway / 60)}h ${minutesAway % 60}`
                          : "Maintenant"}
                    </div>
                  </div>
                </div>

                {!received && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => alert("Scan BL — caméra non implémentée (stub PWA)")}
                      style={{ minHeight: 48 }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary-600 text-[13px] font-medium text-white"
                    >
                      <Camera className="h-4 w-4" /> Scanner BL
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualReceipt(d)}
                      style={{ minHeight: 48 }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line bg-white text-[13px] font-medium text-ink-2"
                    >
                      <Edit3 className="h-4 w-4" /> Saisir manuel
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Livraisons récentes
        </h2>
        <div className="rounded-xl border border-line bg-white shadow-card">
          {data?.recent.length === 0 ? (
            <p className="p-3 text-[12.5px] text-ink-3">Aucune livraison récente.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data?.recent.map((d) => (
                <li key={d.id} className="flex items-center gap-2 p-3 text-[12.5px]">
                  <Truck className="h-3.5 w-3.5 text-success" />
                  <span className="flex-1 truncate">{d.deliveryNoteRef ?? "—"}</span>
                  <span className="text-[11px] text-ink-3">
                    {d.receivedAt ? new Date(d.receivedAt).toLocaleDateString("fr-FR") : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {manualReceipt && (
        <ManualReceiptModal
          delivery={manualReceipt}
          onClose={() => setManualReceipt(null)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["cc", "deliveries-today"] })}
        />
      )}
    </div>
  );
}

function ManualReceiptModal({
  delivery,
  onClose,
  onCreated,
}: {
  delivery: Delivery;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [blNumber, setBlNumber] = useState(delivery.deliveryNoteRef ?? "");
  const [items, setItems] = useState(
    delivery.items.map((it) => ({
      articleCode: it.articleCode,
      label: it.label ?? it.articleCode,
      expectedQty: it.expectedQty,
      receivedQty: it.receivedQty ?? it.expectedQty,
      accepted: true,
    }))
  );
  const [notes, setNotes] = useState("");

  const submit = async () => {
    await postOrQueue("delivery-queue", `/api/cc/deliveries/${delivery.id}/receive`, {
      blNumber,
      items,
      notes,
      clientUuid: `${delivery.id}-${Date.now()}`,
    });
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-md flex-col rounded-t-xl bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line p-3">
          <h2 className="text-[14px] font-semibold text-ink">Réception manuelle</h2>
          <button type="button" onClick={onClose} className="text-ink-3"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          <label className="text-[12px] font-medium text-ink-2">
            N° BL
            <input
              value={blNumber}
              onChange={(e) => setBlNumber(e.target.value)}
              style={{ minHeight: 48, fontSize: 16 }}
              className="mt-1 w-full rounded-md border border-line bg-white px-2"
            />
          </label>

          <h3 className="mt-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Articles</h3>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="rounded-md border border-line bg-surface-alt p-2">
                <div className="font-medium text-ink">{it.label}</div>
                <div className="text-[11px] text-ink-3">Prévu : {it.expectedQty}</div>
                <div className="mt-1 flex items-center gap-2">
                  <label className="flex-1 text-[11px] font-medium text-ink-2">
                    Reçu
                    <input
                      type="number"
                      inputMode="decimal"
                      value={it.receivedQty}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setItems((cur) => cur.map((c, i) => (i === idx ? { ...c, receivedQty: v } : c)));
                      }}
                      style={{ minHeight: 48, fontSize: 16 }}
                      className="mt-0.5 w-full rounded-md border border-line bg-white px-2"
                    />
                  </label>
                  <div className="text-[12px]">
                    Écart :{" "}
                    <span
                      className={clsx(
                        "font-bold",
                        it.receivedQty - it.expectedQty < 0 ? "text-danger" :
                        it.receivedQty - it.expectedQty > 0 ? "text-warning" : "text-success"
                      )}
                    >
                      {it.receivedQty - it.expectedQty}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <label className="mt-3 block text-[12px] font-medium text-ink-2">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ fontSize: 16 }}
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1"
              placeholder="Ex : 2 sacs endommagés au transport"
            />
          </label>
        </div>
        <footer className="flex gap-2 border-t border-line p-3">
          <button type="button" onClick={onClose} style={{ minHeight: 56 }} className="flex-1 rounded-md border border-line bg-white text-[13px] font-medium">
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            style={{ minHeight: 56 }}
            className="flex-1 rounded-md bg-primary-600 text-[13px] font-bold text-white"
          >
            <Check className="mx-auto h-4 w-4" />
          </button>
        </footer>
      </div>
    </div>
  );
}
