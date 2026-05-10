"use client";

import { useState } from "react";
import { ArrowRight, MoveRight, Star, Calendar } from "lucide-react";
import { clsx } from "clsx";
import type { AppStage } from "@prisma/client";
import { usePipeline, useUpdateStage, type PipelineColumn, type PipelineItem } from "@/hooks/useRhRecruitment";

interface Props {
  onSelect: (id: string) => void;
}

function fmtDate(s: string): string {
  const d = new Date(s);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 30) return `il y a ${days}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function scoreClass(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 65) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function CandidateCard({
  item,
  onSelect,
  onMove,
  draggable,
}: {
  item: PipelineItem;
  onSelect: () => void;
  onMove: () => void;
  draggable: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
      }}
      className={clsx(
        "group cursor-pointer rounded-lg border border-line bg-white p-2.5 shadow-sm transition hover:border-primary-300 hover:shadow",
        "focus:outline-none focus:ring-2 focus:ring-primary-300"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-ink truncate">{item.candidateName}</div>
          <div className="text-[11px] text-ink-3 truncate">{item.position}</div>
        </div>
        <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-bold", scoreClass(item.scoreOverall))}>
          <Star className="mr-0.5 inline h-2.5 w-2.5" />
          {item.scoreOverall}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-ink-3">
        <span className="truncate">{item.region}</span>
        <span className="inline-flex items-center gap-0.5">
          <Calendar className="h-2.5 w-2.5" /> {fmtDate(item.appliedAt)}
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMove();
        }}
        className="mt-2 inline-flex h-7 w-full items-center justify-center gap-1 rounded-md border border-line bg-white text-[11px] font-medium text-primary-700 hover:bg-surface-alt md:hidden"
      >
        <MoveRight className="h-3 w-3" /> Déplacer
      </button>
    </div>
  );
}

function MoveSheet({
  item,
  columns,
  onClose,
}: {
  item: PipelineItem;
  columns: PipelineColumn[];
  onClose: () => void;
}) {
  const update = useUpdateStage();
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={onClose}>
      <div className="w-full rounded-t-xl bg-white p-3 sm:max-w-sm sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line sm:hidden" />
        <h3 className="text-[13px] font-semibold text-ink">Déplacer {item.candidateName}</h3>
        <p className="text-[11.5px] text-ink-3">Colonne actuelle : {columns.find((c) => c.stage === item.stage)?.label}</p>
        <ul className="mt-2 space-y-1">
          {columns.map((c) => (
            <li key={c.stage}>
              <button
                type="button"
                disabled={c.stage === item.stage || update.isPending}
                onClick={() => update.mutate({ id: item.id, stage: c.stage }, { onSuccess: onClose })}
                className={clsx(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-[12.5px]",
                  c.stage === item.stage
                    ? "cursor-not-allowed bg-surface-alt text-ink-3"
                    : "border border-line bg-white text-ink hover:bg-surface-alt"
                )}
              >
                <span>{c.label}</span>
                {c.stage !== item.stage && <ArrowRight className="h-3.5 w-3.5 text-primary-600" />}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md border border-line bg-white text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

export function KanbanBoard({ onSelect }: Props) {
  const { data, isLoading } = usePipeline();
  const update = useUpdateStage();
  const [moveTarget, setMoveTarget] = useState<PipelineItem | null>(null);
  const [dragOver, setDragOver] = useState<AppStage | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-72 w-60 flex-shrink-0 animate-pulse rounded-xl bg-surface-alt" />
        ))}
      </div>
    );
  }

  const handleDrop = (stage: AppStage, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) update.mutate({ id, stage });
  };

  return (
    <>
      <div
        className="kanban-board flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {data.columns.map((col) => (
          <div
            key={col.stage}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.stage);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(col.stage, e)}
            className={clsx(
              "kanban-column flex-shrink-0 snap-start rounded-xl border bg-surface-alt/50 p-2",
              "w-[240px] md:w-[220px] lg:w-[260px]",
              dragOver === col.stage ? "border-primary-500 bg-primary-50" : "border-line"
            )}
            style={{ scrollSnapAlign: "start" }}
          >
            <header className="mb-2 flex items-center justify-between px-1">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">{col.label}</span>
              <span className="rounded-full bg-white px-1.5 text-[10.5px] font-bold text-ink-3 ring-1 ring-line">
                {col.count}
              </span>
            </header>
            <div className="space-y-1.5">
              {col.items.length === 0 ? (
                <div className="rounded-md border border-dashed border-line bg-white p-3 text-center text-[10.5px] text-ink-3">
                  Aucun candidat
                </div>
              ) : (
                col.items.map((it) => (
                  <CandidateCard
                    key={it.id}
                    item={it}
                    onSelect={() => onSelect(it.id)}
                    onMove={() => setMoveTarget(it)}
                    draggable
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {moveTarget && <MoveSheet item={moveTarget} columns={data.columns} onClose={() => setMoveTarget(null)} />}
    </>
  );
}
