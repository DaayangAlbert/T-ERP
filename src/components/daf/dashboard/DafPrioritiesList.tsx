"use client";

import Link from "next/link";
import { ArrowRight, AlertCircle, Calendar, CheckCircle2, Receipt } from "lucide-react";
import { clsx } from "clsx";

const ICON_BY_TYPE: Record<string, React.ReactNode> = {
  VALIDATION: <CheckCircle2 className="h-4 w-4" />,
  TAX: <Calendar className="h-4 w-4" />,
  RECOVERY: <Receipt className="h-4 w-4" />,
  TREASURY: <AlertCircle className="h-4 w-4" />,
};

export function DafPrioritiesList({
  items,
}: {
  items: Array<{ type: string; title: string; urgency: string; link: string }>;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-success/30 bg-success/5 p-4 text-[13px] text-success">
        ✓ Aucune action urgente aujourd'hui.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-primary-800">
        Mes priorités du jour
      </h3>
      <ul className="space-y-2">
        {items.map((p, i) => (
          <li key={i}>
            <Link
              href={p.link}
              className={clsx(
                "flex items-center gap-3 rounded-lg border bg-white p-3 transition active:scale-[0.99]",
                p.urgency === "HIGH"
                  ? "border-danger/40 hover:border-danger/60"
                  : "border-line hover:border-primary-300"
              )}
            >
              <span
                className={clsx(
                  "grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-white",
                  p.urgency === "HIGH" ? "bg-danger" : "bg-primary-500"
                )}
              >
                {ICON_BY_TYPE[p.type] ?? <CheckCircle2 className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-ink">{p.title}</div>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-ink-3" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
