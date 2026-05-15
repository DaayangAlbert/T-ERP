"use client";

import { MapPin } from "lucide-react";
import type { MissionItem } from "@/hooks/useOuvMissions";
import { MissionPriorityChip } from "@/components/ouv/missions/MissionPriorityChip";

interface Props {
  mission: MissionItem;
  onOpenProgress: (mission: MissionItem) => void;
}

// Card mission active : border violet 2px, badge EN COURS, titre/sous-titre,
// 2 colonnes démarrage/échéance, progress bar, callout consigne chef violet.
// Mirror direct du bloc "Mission en cours" du prototype.
export function ActiveMissionCard({ mission, onOpenProgress }: Props) {
  return (
    <article
      className="mb-3.5 cursor-pointer rounded-2xl border-2 border-purple-500 bg-white p-[18px] transition active:scale-[0.99]"
      onClick={() => onOpenProgress(mission)}
      role="button"
      tabIndex={0}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-500 px-2.5 py-1 text-[11px] font-bold text-white">
              EN COURS
            </span>
            <MissionPriorityChip priority={mission.priority} size="sm" />
          </div>
          <p className="mt-2 text-[17px] font-bold text-slate-900">{mission.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            {mission.site.name} · affecté par {mission.assignedBy.fullName}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3">
        <DateItem label="Démarrage" date={mission.startDate} tone="neutral" />
        <DateItem
          label="Échéance"
          date={mission.endDate ?? mission.startDate}
          tone={isOverdue(mission.endDate) ? "danger" : "neutral"}
        />
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[12px]">
          <span className="font-semibold text-slate-500">Avancement</span>
          <span className="font-bold text-slate-900">{mission.progressPercent} %</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-purple-500 transition-all"
            style={{ width: `${mission.progressPercent}%` }}
          />
        </div>
      </div>

      {mission.instructions && (
        <div className="mt-3 rounded-xl bg-purple-50 px-3 py-2.5 text-[12.5px] text-slate-700">
          📝 <strong className="font-bold">Consigne chef :</strong> {mission.instructions}
        </div>
      )}

      <p className="mt-2 text-center text-[11px] font-semibold text-purple-600">
        Tape pour mettre à jour l'avancement
      </p>
    </article>
  );
}

function DateItem({
  label,
  date,
  tone,
}: {
  label: string;
  date: string;
  tone: "neutral" | "danger";
}) {
  const formatted = new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p
        className={`text-[14px] font-bold ${tone === "danger" ? "text-rose-600" : "text-slate-900"}`}
      >
        {formatted}
      </p>
    </div>
  );
}

function isOverdue(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate).getTime() < Date.now();
}
