"use client";

import { ChevronRight, Phone, Mail, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import type { InstitutionListItem } from "@/hooks/useSgInstitutions";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  WATCH: "bg-violet-100 text-violet-700",
  SENSITIVE: "bg-amber-100 text-amber-700",
  INACTIVE: "bg-slate-200 text-slate-700",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  WATCH: "À surveiller",
  SENSITIVE: "Sensible",
  INACTIVE: "Inactif",
};

interface Props {
  title: string;
  icon: typeof ChevronRight;
  iconTone?: string;
  items: InstitutionListItem[];
  onOpen: (id: string) => void;
  emptyLabel?: string;
}

export function InstitutionsGroupCard({
  title,
  icon: Icon,
  iconTone = "text-violet-600 bg-violet-50",
  items,
  onOpen,
  emptyLabel = "Aucune institution enregistrée dans cette catégorie.",
}: Props) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-line bg-white">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <div className={clsx("grid h-7 w-7 place-items-center rounded-lg", iconTone)}>
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-[13.5px] font-semibold text-ink">
          {title} ({items.length})
        </h2>
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-[12px] text-ink-3">{emptyLabel}</p>
      ) : (
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {items.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => onOpen(i.id)}
                className="group flex w-full items-start gap-2 px-4 py-2 text-left transition hover:bg-surface-alt/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12.5px] font-semibold text-ink group-hover:text-violet-700">
                      {i.name}
                    </span>
                    <span
                      className={clsx(
                        "rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold",
                        STATUS_BADGE[i.relationshipStatus],
                      )}
                    >
                      {STATUS_LABEL[i.relationshipStatus]}
                    </span>
                  </div>
                  {i.primaryContactName && (
                    <div className="mt-0.5 truncate text-[11px] text-ink-3">
                      <span className="font-semibold text-ink">{i.primaryContactName}</span>
                      {i.primaryContactRole && <> · {i.primaryContactRole}</>}
                    </div>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-ink-3">
                    {i.primaryContactPhone && (
                      <span className="inline-flex items-center gap-0.5">
                        <Phone className="h-3 w-3" /> {i.primaryContactPhone}
                      </span>
                    )}
                    {i.primaryContactEmail && (
                      <span className="inline-flex items-center gap-0.5">
                        <Mail className="h-3 w-3" /> {i.primaryContactEmail}
                      </span>
                    )}
                  </div>
                  {i.relationshipStatus === "SENSITIVE" && i.relationshipNotes && (
                    <div className="mt-0.5 flex items-start gap-1 text-[10.5px] text-amber-700">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-1">{i.relationshipNotes}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-3/60 group-hover:text-violet-700" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
