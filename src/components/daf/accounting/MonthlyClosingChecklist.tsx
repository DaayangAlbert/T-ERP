"use client";

import { CheckCircle2, Clock, Lock } from "lucide-react";
import { useMonthlyClosing, useCloseMonth } from "@/hooks/useDafAccounting";
import { useAuth } from "@/hooks/useAuth";
import { clsx } from "clsx";

interface Props {
  period: string;
}

export function MonthlyClosingChecklist({ period }: Props) {
  const { user } = useAuth();
  const { data, isLoading } = useMonthlyClosing(period);
  const close = useCloseMonth(period);
  const canAct = user?.role === "DAF";

  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  const items = data.items;
  const done = items.filter((i) => i.status === "DONE").length;
  const total = items.length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const allDone = done === total;
  const isClosed = data.status === "CLOSED";

  const onClose = async () => {
    if (!confirm(`Lancer la clôture mensuelle ${period} ? Cette action verrouille la période.`)) return;
    try {
      await close.mutateAsync();
      alert("Clôture mensuelle effectuée. Période verrouillée.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Préparation clôture mensuelle
        </h3>
        <span className="text-[12px] font-semibold text-ink-2">
          {done} / {total}
        </span>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-surface-alt">
        <div
          className={clsx("h-full transition-all", allDone ? "bg-success" : "bg-primary-500")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-2">
        {items.map((i) => (
          <li
            key={i.key}
            className={clsx(
              "flex items-start gap-3 rounded-md border p-2.5 text-[12.5px]",
              i.status === "DONE" ? "border-success/30 bg-success/5" : "border-line bg-surface-alt"
            )}
          >
            {i.status === "DONE" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
            ) : (
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
            )}
            <span className={clsx("flex-1", i.status === "DONE" ? "text-ink" : "text-ink-2")}>{i.label}</span>
          </li>
        ))}
      </ul>

      {canAct && !isClosed && (
        <button
          type="button"
          onClick={onClose}
          disabled={!allDone || close.isPending}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50 sm:w-auto"
        >
          <Lock className="h-4 w-4" />
          {close.isPending ? "Clôture…" : "Lancer la clôture mensuelle"}
        </button>
      )}
      {isClosed && (
        <div className="mt-4 inline-flex items-center gap-1 rounded bg-success/10 px-2 py-1 text-[12px] font-semibold text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Période clôturée
        </div>
      )}
    </section>
  );
}
