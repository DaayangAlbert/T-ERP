"use client";

import {
  Users,
  Crown,
  TrendingUp,
  Briefcase,
  HardHat,
  Handshake,
  Banknote,
  Hammer,
  ChevronRight,
  BookCheck,
} from "lucide-react";
import { clsx } from "clsx";
import type { RegisterListItem } from "@/hooks/useSgCompliance";
import type { RegisterType } from "@prisma/client";

const TYPE_ICON: Record<RegisterType, typeof Users> = {
  AG_DECISIONS: Users,
  SHAREHOLDERS: TrendingUp,
  BOARD_DECISIONS: Crown,
  PERSONNEL: Briefcase,
  HSE_SITES: HardHat,
  REGULATED_AGREEMENTS: Handshake,
  BANK_GUARANTEES: Banknote,
  PUBLIC_MARKETS: Hammer,
};

const STATUS_LABEL: Record<string, string> = {
  UP_TO_DATE: "À jour",
  TO_UPDATE: "À mettre à jour",
  OVERDUE: "En retard",
};

const BORDER: Record<string, string> = {
  emerald: "border-l-emerald-500",
  amber: "border-l-amber-500",
  rose: "border-l-rose-500",
};

const STATUS_BADGE: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  items: RegisterListItem[];
  onOpen: (id: string) => void;
}

export function RegistersGrid({ items, onOpen }: Props) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-white px-4 py-6 text-center">
        <BookCheck className="mx-auto h-8 w-8 text-ink-3/40" />
        <p className="mt-2 text-[12.5px] text-ink-3">Aucun registre configuré.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-2 text-[13.5px] font-semibold text-ink">
        Registres légaux obligatoires (Acte Uniforme OHADA)
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => {
          const Icon = TYPE_ICON[r.registerType] ?? BookCheck;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpen(r.id)}
              className={clsx(
                "group flex flex-col rounded-xl border border-line border-l-4 bg-white p-3 text-left transition hover:shadow-sm",
                BORDER[r.severity],
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 text-[12.5px] font-semibold text-ink group-hover:text-violet-700">
                      {r.name}
                    </h3>
                    <p className="text-[10.5px] text-ink-3">{r.legalBasis}</p>
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-3/60 group-hover:text-violet-700" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                <span className={clsx("rounded-full px-2 py-0.5 font-semibold", STATUS_BADGE[r.severity])}>
                  {STATUS_LABEL[r.status]}
                </span>
                <span className="text-ink-3">
                  {r.entriesCount} entrée{r.entriesCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10.5px] text-ink-3">
                <span>Délégué : {r.responsible.fullName}</span>
                <span className="font-mono">Revue {fmtDate(r.nextReviewDate)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
