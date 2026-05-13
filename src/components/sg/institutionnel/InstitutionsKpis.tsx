"use client";

import { Users, ShieldCheck, Handshake, AlertOctagon } from "lucide-react";
import { clsx } from "clsx";
import type { InstitutionsListResponse } from "@/hooks/useSgInstitutions";

interface Props {
  counts: InstitutionsListResponse["counts"];
  approvalsCount: { total: number; valid: number; expiringSoon: number; expired: number };
}

const TONE: Record<string, string> = {
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
};

export function InstitutionsKpis({ counts, approvalsCount }: Props) {
  const cards = [
    {
      icon: Users,
      label: "Institutions",
      value: counts.total.toString(),
      sub: `${counts.partners} partenaires clés`,
      tone: "violet" as const,
    },
    {
      icon: ShieldCheck,
      label: "Agréments BTP",
      value: approvalsCount.valid.toString(),
      sub:
        approvalsCount.expired > 0
          ? `${approvalsCount.expired} expiré${approvalsCount.expired > 1 ? "s" : ""}`
          : approvalsCount.expiringSoon > 0
            ? `${approvalsCount.expiringSoon} à renouveler`
            : "tous valides",
      tone:
        approvalsCount.expired > 0 ? "rose" : approvalsCount.expiringSoon > 0 ? "amber" : "emerald",
    },
    {
      icon: Handshake,
      label: "Adhésions pro",
      value: counts.associations.toString(),
      sub: "associations actives",
      tone: "violet" as const,
    },
    {
      icon: AlertOctagon,
      label: "Relations sensibles",
      value: counts.sensitive.toString(),
      sub: counts.sensitive > 0 ? "à surveiller" : "RAS",
      tone: counts.sensitive > 0 ? "amber" : ("emerald" as const),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <div className={clsx("grid h-10 w-10 place-items-center rounded-lg border", TONE[c.tone])}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-bold leading-none tracking-tight text-ink">{c.value}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">{c.label}</div>
              <div className="text-[11px] text-ink-3/80">{c.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
