"use client";

import { useState } from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import { useArbitrations, useDecideArbitration } from "@/hooks/usePlanning";
import { formatDate } from "@/lib/format";
import { clsx } from "clsx";

export function ArbitrationsTable() {
  const { data, isLoading } = useArbitrations();
  const decide = useDecideArbitration();
  const [noteFor, setNoteFor] = useState<Record<string, string>>({});

  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  const pending = data.items.filter((a) => a.arbitrationStatus === "PENDING");
  const decided = data.items.filter((a) => a.arbitrationStatus !== "PENDING");

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-ink">
        Arbitrages DG en attente
        {pending.length > 0 && (
          <span className="ml-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{pending.length}</span>
        )}
      </h2>

      {pending.length === 0 ? (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-[13px] text-success">
          ✓ Aucun arbitrage en attente.
        </div>
      ) : (
        <ul className="space-y-2">
          {pending.map((a) => (
            <li key={a.id} className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-[12.5px] font-semibold text-ink">{a.resourceLabel}</span>
                    <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10.5px] font-semibold text-warning">
                      {a.demandLevel}% de charge
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-ink-2">
                    Période <strong>{formatDate(a.periodStart)} → {formatDate(a.periodEnd)}</strong>
                    {" · "}{a.siteIds.length} chantier{a.siteIds.length > 1 ? "s" : ""} concerné{a.siteIds.length > 1 ? "s" : ""}
                  </p>
                  {a.arbitrationNote && (
                    <p className="mt-1 text-[12px] italic text-ink-3">« {a.arbitrationNote} »</p>
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={noteFor[a.id] ?? ""}
                  onChange={(e) => setNoteFor((s) => ({ ...s, [a.id]: e.target.value }))}
                  placeholder="Note d'arbitrage (optionnel)"
                  className="h-9 rounded-md border border-line bg-white px-2.5 text-[13px]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => decide.mutate({ id: a.id, status: "APPROVED", note: noteFor[a.id] })}
                    disabled={decide.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-success px-3 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" /> Valider
                  </button>
                  <button
                    type="button"
                    onClick={() => decide.mutate({ id: a.id, status: "REJECTED", note: noteFor[a.id] })}
                    disabled={decide.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-danger px-3 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" /> Refuser
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <details className="rounded-lg border border-line bg-white p-3 text-[12.5px]">
          <summary className="cursor-pointer text-ink-3">
            {decided.length} arbitrage{decided.length > 1 ? "s" : ""} décidé{decided.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {decided.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-2 rounded border border-line bg-surface-alt px-3 py-2">
                <div className="flex-1">
                  <div className="font-medium text-ink">{a.resourceLabel}</div>
                  {a.arbitrationNote && <div className="text-[11.5px] text-ink-3">{a.arbitrationNote}</div>}
                </div>
                <span
                  className={clsx(
                    "rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                    a.arbitrationStatus === "APPROVED" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  )}
                >
                  {a.arbitrationStatus}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
