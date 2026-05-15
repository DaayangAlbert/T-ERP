"use client";

import { MapPin, Check, MessageSquare, Loader2 } from "lucide-react";
import type { MissionItem } from "@/hooks/useOuvMissions";
import { MissionPriorityChip } from "@/components/ouv/missions/MissionPriorityChip";

interface Props {
  mission: MissionItem;
  onAccept: (id: string) => void;
  onAskQuestions: (mission: MissionItem) => void;
  accepting?: boolean;
  acceptDisabled?: boolean;
}

// Card "Nouvelle mission" : border amber 2px, badge 🔔 NOUVELLE,
// 2 colonnes démarrage/durée, callout "Affecté par X" jaune,
// 2 boutons côte-à-côte (Accepter vert + Questions blanc).
export function NewMissionCard({
  mission,
  onAccept,
  onAskQuestions,
  accepting,
  acceptDisabled,
}: Props) {
  const isAccepted = mission.status === "ACCEPTED";
  return (
    <article className="mb-3.5 rounded-2xl border-2 border-amber-200 bg-white p-[18px]">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold text-white ${
                isAccepted ? "bg-emerald-500" : "bg-amber-500"
              }`}
            >
              {isAccepted ? "✓ ACCEPTÉE" : "🔔 NOUVELLE · à accepter"}
            </span>
            <MissionPriorityChip priority={mission.priority} size="sm" />
          </div>
          <p className="mt-2 text-[17px] font-bold text-slate-900">{mission.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            {mission.site.name}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3">
        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-500">Démarrage</p>
          <p className="text-[14px] font-bold text-slate-900">
            {new Date(mission.startDate).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-500">
            {mission.estimatedDays ? "Durée estimée" : "Échéance"}
          </p>
          <p className="text-[14px] font-bold text-slate-900">
            {mission.estimatedDays
              ? `${mission.estimatedDays} jour${mission.estimatedDays > 1 ? "s" : ""}`
              : mission.endDate
                ? new Date(mission.endDate).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                  })
                : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
        📝 <strong className="font-bold">Affecté par :</strong> {mission.assignedBy.fullName}
      </div>

      {mission.description && (
        <p className="mt-3 text-[13px] text-slate-700">{mission.description}</p>
      )}

      {mission.workerQuestionsRaised && (
        <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2.5 text-[12.5px] text-blue-900">
          ❓ <strong className="font-bold">Questions envoyées :</strong>{" "}
          {lastEntry(mission.workerQuestionsRaised)}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {!isAccepted && (
          <button
            type="button"
            onClick={() => onAccept(mission.id)}
            disabled={accepting || acceptDisabled}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-[14px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
            Accepter
          </button>
        )}
        <button
          type="button"
          onClick={() => onAskQuestions(mission)}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white text-[14px] font-bold text-slate-700 transition active:scale-[0.98]"
        >
          <MessageSquare className="h-5 w-5" />
          Questions
        </button>
      </div>
    </article>
  );
}

function lastEntry(raised: string): string {
  const entries = raised.split("\n\n").filter(Boolean);
  return entries[entries.length - 1] ?? raised;
}
