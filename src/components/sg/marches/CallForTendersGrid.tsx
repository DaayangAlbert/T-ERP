"use client";

import { Inbox, CalendarClock, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type { CallForTenderCard } from "@/hooks/useSgContracts";

function fmtAmount(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} M`;
  return v.toLocaleString("fr-FR");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

interface Props {
  cards: CallForTenderCard[];
  onOpen: (id: string) => void;
}

export function CallForTendersGrid({ cards, onOpen }: Props) {
  if (cards.length === 0) return null;
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
          <Inbox className="h-4 w-4 text-amber-600" /> Appels d'offres en cours de réponse
        </h2>
        <span className="text-[11.5px] text-ink-3">{cards.length} AO</span>
      </header>
      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const urgencyTone =
            c.daysToClose === null
              ? "bg-slate-50 border-slate-200"
              : c.daysToClose <= 7
                ? "bg-rose-50 border-rose-200"
                : c.daysToClose <= 30
                  ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onOpen(c.id)}
              className={clsx("rounded-lg border p-3 text-left transition hover:border-violet-300 hover:bg-violet-50", urgencyTone)}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] font-bold text-violet-700">{c.reference}</span>
                {c.daysToClose !== null && (
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                      c.daysToClose <= 7 ? "bg-rose-100 text-rose-800" : c.daysToClose <= 30 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
                    )}
                  >
                    J-{c.daysToClose}
                  </span>
                )}
              </div>
              <div className="mt-1 line-clamp-2 text-[12.5px] font-semibold text-ink">{c.title}</div>
              <div className="mt-0.5 line-clamp-1 text-[11px] text-ink-3">{c.contractingAuthority}</div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="font-mono text-[13px] font-bold text-ink">{fmtAmount(c.amountHT)} FCFA</span>
                <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-3">
                  <CalendarClock className="h-3 w-3" /> {fmtDate(c.callForTendersCloseDate)}
                </span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700">
                Étudier le dossier <ChevronRight className="h-3 w-3" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
