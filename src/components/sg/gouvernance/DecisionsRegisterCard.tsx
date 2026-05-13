"use client";

import { useState } from "react";
import { Gavel, Download, Filter, BookOpen } from "lucide-react";
import { clsx } from "clsx";
import { useDecisionsRegister } from "@/hooks/useSgGovernance";

const TYPE_LABEL: Record<string, string> = {
  APPROVAL: "Approbation",
  RATIFICATION: "Ratification",
  AUTHORIZATION: "Autorisation",
  NOMINATION: "Nomination",
  REVOCATION: "Révocation",
  OTHER: "Autre",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  onExport: () => void;
}

export function DecisionsRegisterCard({ onExport }: Props) {
  const [source, setSource] = useState<"ALL" | "BOARD" | "AG">("ALL");
  const sourceParam = source === "ALL" ? undefined : source;
  const { data, isLoading } = useDecisionsRegister(sourceParam);

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-violet-600" />
          <h2 className="text-[13.5px] font-semibold text-ink">
            Registre des décisions ({data?.total ?? "…"})
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex overflow-hidden rounded-md border border-line">
            {(["ALL", "BOARD", "AG"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={clsx(
                  "px-2 py-1 text-[11px] font-semibold",
                  source === s ? "bg-violet-600 text-white" : "bg-white text-ink-3 hover:bg-surface-alt",
                )}
              >
                {s === "ALL" ? "Tous" : s === "BOARD" ? "CA" : "AG"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] font-semibold text-ink hover:bg-surface-alt"
          >
            <Download className="h-3 w-3" /> Export PDF
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="px-4 py-6 text-center text-[12px] text-ink-3">Chargement du registre…</div>
      ) : !data || data.items.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <Gavel className="mx-auto h-8 w-8 text-ink-3/40" />
          <p className="mt-2 text-[12.5px] text-ink-3">Aucune décision enregistrée pour cette catégorie.</p>
        </div>
      ) : (
        <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
          {data.items.map((d) => {
            const isAg = d.meeting.type !== "BOARD_MEETING";
            return (
              <li key={d.id} className="px-4 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded bg-violet-100 text-[10.5px] font-bold text-violet-700">
                    {d.decisionNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12.5px] font-semibold text-ink">{d.title}</span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        {TYPE_LABEL[d.decisionType] ?? d.decisionType}
                      </span>
                      <span
                        className={clsx(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                          isAg ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700",
                        )}
                      >
                        {isAg ? "AG" : "CA"} · {fmtDate(d.meeting.scheduledAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-3">{d.description}</p>
                    {d.followUpStatus && (
                      <div className="mt-0.5 text-[10.5px] text-ink-3">
                        Suivi : <span className="font-semibold text-ink">{d.followUpStatus}</span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
