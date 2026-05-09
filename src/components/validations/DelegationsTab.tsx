"use client";

import { useState } from "react";
import { Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useDelegations, useToggleDelegation } from "@/hooks/useValidations";
import { DelegateModal } from "./DelegateModal";
import { formatDate, formatFCFA } from "@/lib/format";
import { ValidationType } from "@prisma/client";

const TYPE_LABEL: Record<ValidationType, string> = {
  PAYROLL: "Paie",
  EXPENSE: "Dépense",
  PURCHASE: "Achat",
  HIRING: "Embauche",
  CONTRACT: "Marché",
  LEAVE: "Congé",
  OTHER: "Autre",
};

export function DelegationsTab() {
  const { data, isLoading } = useDelegations();
  const toggle = useToggleDelegation();
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Délégations permanentes</h2>
          <p className="text-[12px] text-ink-3">
            Désigner qui peut valider en votre absence, sur quels types et jusqu'à quel montant.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvelle délégation
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-alt" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center text-[13px] text-ink-3">
          Aucune délégation active.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.items.map((d) => (
            <li
              key={d.id}
              className="rounded-lg border border-line bg-white px-4 py-3 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">{d.from.name}</span>
                    <span className="text-[12px] text-ink-3">→</span>
                    <span className="text-[13px] font-semibold text-primary-700">{d.to.name}</span>
                    <span className="text-[10.5px] uppercase tracking-wider text-ink-3">
                      {d.to.role}
                    </span>
                    {!d.active && (
                      <span className="rounded bg-ink-3/10 px-1.5 py-0.5 text-[10px] font-semibold text-ink-3">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {d.types.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700"
                      >
                        {TYPE_LABEL[t]}
                      </span>
                    ))}
                  </div>
                  {d.maxAmount && (
                    <div className="mt-1 text-[12px] text-ink-2">
                      Plafond : <span className="font-mono">{formatFCFA(BigInt(d.maxAmount))}</span>
                    </div>
                  )}
                  <div className="mt-0.5 text-[11.5px] text-ink-3">
                    Du {formatDate(d.startDate)}{" "}
                    {d.endDate ? `au ${formatDate(d.endDate)}` : "(permanente)"}
                  </div>
                  {d.reason && (
                    <p className="mt-1 text-[12px] italic text-ink-3">« {d.reason} »</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggle.mutate({ id: d.id, active: !d.active })}
                  disabled={toggle.isPending}
                  className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
                >
                  {d.active ? (
                    <>
                      <ToggleRight className="h-5 w-5 text-success" /> Activée
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-5 w-5" /> Désactivée
                    </>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DelegateModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
