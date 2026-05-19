"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DashboardValidation } from "@/hooks/useDashboardDg";
import { useTenantHref } from "@/hooks/useTenantHref";
import { formatDate, formatFCFA } from "@/lib/format";

interface Props {
  validations: DashboardValidation[];
}

export function ValidationsList({ validations }: Props) {
  const tenantHref = useTenantHref();
  const listHref = tenantHref("/direction-generale/validations");

  return (
    <div className="rounded-xl border border-line bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">Mes validations en attente</h3>
        <Link
          href={listHref}
          className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700 hover:bg-primary-200"
          aria-label="Voir toutes les validations N3"
        >
          {validations.length}
        </Link>
      </header>
      {validations.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-3">
          Rien à valider pour le moment.
        </p>
      ) : (
        <ul>
          {validations.map((v, i) => (
            <li
              key={v.id}
              className={i < validations.length - 1 ? "border-b border-line" : ""}
            >
              <Link
                href={`${listHref}?focus=${v.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{v.ref}</div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    {v.type} · échéance {formatDate(v.deadline)}
                  </div>
                </div>
                <div className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">
                  {formatFCFA(v.amount)}
                </div>
                <ChevronRight className="h-4 w-4 text-ink-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
