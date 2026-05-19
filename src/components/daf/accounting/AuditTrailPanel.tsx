"use client";

import { ScrollText, User as UserIcon } from "lucide-react";
import { useAccountingAuditTrail } from "@/hooks/useDafAccounting";
import { formatDate } from "@/lib/format";

export function AuditTrailPanel() {
  const { data, isLoading } = useAccountingAuditTrail(30);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  if (data.items.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-ink-3 shadow-card">
        Aucune action sensible enregistrée sur les {data.sinceDays} derniers jours.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <header className="mb-3">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          <ScrollText className="mr-1 inline h-3.5 w-3.5" />
          Journal d&apos;audit — {data.items.length} action{data.items.length > 1 ? "s" : ""} sensible{data.items.length > 1 ? "s" : ""} ({data.sinceDays} j)
        </h3>
      </header>

      <ul className="divide-y divide-line">
        {data.items.map((l) => {
          const ref = ((l.metadata as { reference?: string } | null)?.reference) ?? l.entityId ?? "—";
          return (
            <li key={l.id} className="flex items-start gap-3 py-2 text-[12.5px]">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">{l.actionLabel}</div>
                <div className="text-[11px] text-ink-3">
                  <UserIcon className="mr-0.5 inline h-3 w-3" />
                  {l.user}
                  {l.userRole && <span className="ml-1 rounded bg-ink-3/10 px-1 py-0.5 text-[9.5px] font-semibold uppercase text-ink-2">{l.userRole}</span>}
                  <span className="ml-2 font-mono">{ref}</span>
                </div>
              </div>
              <span className="flex-shrink-0 text-[11px] text-ink-3">
                {formatDate(l.createdAt, "dd/MM HH:mm")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
