"use client";

import { CheckCircle2, AlertTriangle, CalendarClock, BookCheck } from "lucide-react";
import { clsx } from "clsx";
import type { ComplianceDashboardResponse } from "@/hooks/useSgCompliance";

interface Props {
  data: ComplianceDashboardResponse;
}

export function ComplianceStatusCard({ data }: Props) {
  const score = data.complianceScore;
  const tone =
    score >= 95
      ? { bg: "from-emerald-500 to-emerald-600", icon: CheckCircle2, label: "Conformité globale à jour" }
      : score >= 80
        ? { bg: "from-amber-500 to-amber-600", icon: AlertTriangle, label: "Conformité à surveiller" }
        : { bg: "from-rose-500 to-rose-600", icon: AlertTriangle, label: "Conformité critique" };

  const Icon = tone.icon;
  const registersRatio = `${data.counts.registersUpToDate}/${data.counts.registers}`;

  return (
    <section className={clsx("rounded-xl bg-gradient-to-br p-4 text-white shadow-sm", tone.bg)}>
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white/20">
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[14px] font-semibold opacity-90">{tone.label}</span>
            <span className="text-[26px] font-extrabold leading-none">{score}%</span>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat icon={BookCheck} label="Registres" value={registersRatio} />
            <Stat
              icon={CalendarClock}
              label="Échéances 90 j"
              value={
                data.counts.deadlines90d.toString() +
                (data.counts.deadlinesUrgent > 0 ? ` · ${data.counts.deadlinesUrgent} urgent` : "")
              }
              urgent={data.counts.deadlinesUrgent > 0}
            />
            <Stat
              icon={CheckCircle2}
              label="Attestations"
              value={`${data.counts.approvalsValid}/${data.counts.approvalsTotal}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  urgent,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div className={clsx("rounded-md bg-white/15 px-2.5 py-1.5", urgent && "ring-1 ring-white/40")}>
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider opacity-90">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-[14px] font-bold">{value}</div>
    </div>
  );
}
