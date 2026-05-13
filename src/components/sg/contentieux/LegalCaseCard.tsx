"use client";

import { Scale, MapPin, User, Banknote, CalendarClock, ChevronRight, Building2 } from "lucide-react";
import { clsx } from "clsx";
import type { LegalCaseListItem } from "@/hooks/useSgLegalCases";

const POSITION_LABEL: Record<string, string> = {
  DEMANDEUR: "Demandeur",
  DEFENDEUR: "Défendeur",
  MEDIATION: "Médiation",
  ARBITRATION: "Arbitrage",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Ouvert",
  MEDIATION: "Médiation",
  COURT_PENDING: "En instance",
  APPEAL: "Appel",
  SUPREME_COURT: "Cassation",
  SETTLED: "Transigé",
  WON: "Gagné",
  LOST: "Perdu",
  ABANDONED: "Abandonné",
};

const BORDER: Record<string, string> = {
  rose: "border-l-rose-500",
  amber: "border-l-amber-500",
  violet: "border-l-violet-500",
  slate: "border-l-slate-400",
};

const BADGE: Record<string, string> = {
  rose: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
};

function fmtFcfa(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k`;
  return n.toString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  item: LegalCaseListItem;
  onOpen: (id: string) => void;
}

export function LegalCaseCard({ item, onOpen }: Props) {
  const provisionPct = item.amountAtStake > 0 ? Math.round((item.provisionAmount / item.amountAtStake) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className={clsx(
        "group flex w-full flex-col rounded-xl border border-line border-l-4 bg-white p-3 text-left transition hover:shadow-sm",
        BORDER[item.urgencyTone],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10.5px] font-bold text-ink-3">{item.reference}</span>
            <span className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", BADGE[item.urgencyTone])}>
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
              {POSITION_LABEL[item.ourPosition] ?? item.ourPosition}
            </span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold text-ink group-hover:text-violet-700">
            {item.title}
          </h3>
        </div>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-3/60 group-hover:text-violet-700" />
      </div>

      <dl className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 text-[11.5px] sm:grid-cols-2">
        <div className="flex items-center gap-1 text-ink-3">
          <Building2 className="h-3 w-3 shrink-0" />
          <dt className="sr-only">Partie adverse</dt>
          <dd className="truncate">{item.opposingParty}</dd>
        </div>
        <div className="flex items-center gap-1 text-ink-3">
          <MapPin className="h-3 w-3 shrink-0" />
          <dt className="sr-only">Juridiction</dt>
          <dd className="truncate">{item.jurisdiction}</dd>
        </div>
        <div className="flex items-center gap-1 text-ink-3">
          <User className="h-3 w-3 shrink-0" />
          <dt className="sr-only">Avocat</dt>
          <dd className="truncate">{item.lawyerName}</dd>
        </div>
        <div className="flex items-center gap-1 text-ink-3">
          <CalendarClock className="h-3 w-3 shrink-0" />
          <dt className="sr-only">Prochaine audience</dt>
          <dd className="truncate">
            {item.nextHearingDate ? (
              <>
                {fmtDate(item.nextHearingDate)}
                {item.daysToHearing !== null && (
                  <span className={clsx("ml-1 font-semibold", item.daysToHearing <= 7 ? "text-rose-600" : item.daysToHearing <= 30 ? "text-amber-600" : "text-ink-3")}>
                    J-{item.daysToHearing}
                  </span>
                )}
              </>
            ) : (
              <span className="text-ink-3/70">aucune date</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-surface-alt/50 px-2 py-1.5">
        <div className="flex items-center gap-1 text-[11px] text-ink-3">
          <Banknote className="h-3 w-3" />
          <span>
            Enjeu <strong className="text-ink">{fmtFcfa(item.amountAtStake)} FCFA</strong>
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-ink-3">
          <Scale className="h-3 w-3" />
          <span>
            Provision <strong className="text-ink">{fmtFcfa(item.provisionAmount)} FCFA</strong>
            <span className="ml-1 text-ink-3">({provisionPct}%)</span>
          </span>
        </div>
      </div>
    </button>
  );
}
