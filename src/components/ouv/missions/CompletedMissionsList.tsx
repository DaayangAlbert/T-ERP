"use client";

import { CheckCircle2, Ban } from "lucide-react";
import type { MissionItem } from "@/hooks/useOuvMissions";

interface Props {
  history: MissionItem[];
}

// Liste compacte des missions terminées (ou annulées). Mirror du bloc
// "Missions terminées" : icône ✓ + titre + dates + durée.
export function CompletedMissionsList({ history }: Props) {
  if (!history.length) return null;
  const visible = history.slice(0, 6);
  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">Missions terminées</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {visible.map((m, idx) => (
          <Row key={m.id} mission={m} isLast={idx === visible.length - 1} />
        ))}
      </div>
    </section>
  );
}

function Row({ mission, isLast }: { mission: MissionItem; isLast: boolean }) {
  const isCancelled = mission.status === "CANCELLED";
  const start = new Date(mission.startDate);
  const end = mission.completedAt ? new Date(mission.completedAt) : mission.endDate ? new Date(mission.endDate) : null;
  const range = formatRange(start, end);
  const days =
    end != null
      ? Math.max(
          1,
          Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000))
        )
      : null;
  return (
    <div
      className={`flex min-h-[60px] items-center gap-3 px-4 py-3.5 ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <span
        className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg ${
          isCancelled ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
        }`}
      >
        {isCancelled ? <Ban className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-slate-900">{mission.title}</p>
        <p className="truncate text-[12px] text-slate-500">
          {range}
          {days ? ` · ${days} jour${days > 1 ? "s" : ""}` : ""}
          {mission.site.name ? ` · ${mission.site.name}` : ""}
        </p>
      </div>
    </div>
  );
}

function formatRange(start: Date, end: Date | null): string {
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  const sd = start.getDate();
  const sm = months[start.getMonth()];
  if (!end) return `${sd} ${sm}`;
  const ed = end.getDate();
  const em = months[end.getMonth()];
  if (sm === em) return `${sd} → ${ed} ${sm}`;
  return `${sd} ${sm} → ${ed} ${em}`;
}
