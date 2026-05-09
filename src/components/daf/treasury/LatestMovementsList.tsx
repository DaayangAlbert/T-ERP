"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { MovementDirection } from "@prisma/client";
import { formatFCFA, formatRelativeDate } from "@/lib/format";
import { clsx } from "clsx";

interface MovementItem {
  id: string;
  direction: MovementDirection;
  amount: string;
  label: string;
  counterparty: string | null;
  bank: string;
  occurredAt: string;
}

export function LatestMovementsList({ items }: { items: MovementItem[] }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Derniers mouvements
      </h3>
      {items.length === 0 ? (
        <p className="text-[12.5px] text-ink-3">Aucun mouvement récent.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => {
            const isInbound = m.direction === "INBOUND";
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-md border border-line bg-surface-alt px-3 py-2"
              >
                <span
                  className={clsx(
                    "grid h-9 w-9 flex-shrink-0 place-items-center rounded-full",
                    isInbound ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                  )}
                >
                  {isInbound ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">{m.label}</div>
                  <div className="text-[11px] text-ink-3">
                    {m.counterparty && <span>{m.counterparty} · </span>}
                    {m.bank} · {formatRelativeDate(m.occurredAt)}
                  </div>
                </div>
                <div className={clsx("font-mono text-[13px] font-semibold tabular-nums", isInbound ? "text-success" : "text-danger")}>
                  {isInbound ? "+" : "−"}
                  {formatFCFA(BigInt(m.amount))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
