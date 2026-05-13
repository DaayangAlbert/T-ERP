"use client";

import {
  FileText,
  Gavel,
  MessageSquare,
  Lightbulb,
  Banknote,
  CheckCircle2,
  AlertOctagon,
  Mail,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import type { LegalCaseEventEntry } from "@/hooks/useSgLegalCases";

const ICON: Record<string, typeof FileText> = {
  OPENING: Lightbulb,
  STRATEGY: Lightbulb,
  HEARING: Gavel,
  DECISION: Gavel,
  MEMORANDUM_FILED: FileText,
  CORRESPONDENCE: Mail,
  COMMUNICATION: MessageSquare,
  STATUS_CHANGE: RefreshCw,
  PROVISION_ADJUSTMENT: Banknote,
  CLOSURE: CheckCircle2,
  INCIDENT: AlertOctagon,
};

const EVENT_LABEL: Record<string, string> = {
  OPENING: "Ouverture",
  STRATEGY: "Stratégie",
  HEARING: "Audience",
  DECISION: "Décision",
  MEMORANDUM_FILED: "Mémoire déposé",
  CORRESPONDENCE: "Courrier",
  COMMUNICATION: "Échange",
  STATUS_CHANGE: "Changement statut",
  PROVISION_ADJUSTMENT: "Ajustement provision",
  CLOSURE: "Clôture",
  INCIDENT: "Incident",
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

interface Props {
  events: LegalCaseEventEntry[];
}

export function LegalEventTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center text-[12px] text-ink-3">
        <FileText className="mx-auto h-8 w-8 text-ink-3/40" />
        <p className="mt-2">Aucun événement procédural enregistré.</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-3 border-l-2 border-violet-200 pl-5">
      {events.map((e, idx) => {
        const Icon = ICON[e.eventType] ?? FileText;
        const isLast = idx === events.length - 1;
        return (
          <li key={e.id} className="relative">
            <span
              className={clsx(
                "absolute -left-[26px] grid h-6 w-6 place-items-center rounded-full border-2 border-white shadow-sm",
                isLast ? "bg-slate-100 text-slate-600" : "bg-violet-600 text-white",
              )}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="rounded-md border border-line bg-white px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[12px] font-semibold text-ink">
                  {EVENT_LABEL[e.eventType] ?? e.eventType}
                </span>
                <span className="font-mono text-[10.5px] text-ink-3">{fmtDateTime(e.eventDate)}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[11.5px] text-ink-3">{e.description}</p>
              {e.documentUrl && (
                <a
                  href={e.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:underline"
                >
                  <FileText className="h-3 w-3" /> Document joint
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
