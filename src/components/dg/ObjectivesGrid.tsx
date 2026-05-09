"use client";

import type { ObjectiveItem } from "@/hooks/useDgObjectives";
import { ObjectiveCard } from "./ObjectiveCard";

interface Props {
  objectives: ObjectiveItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit?: (o: ObjectiveItem) => void;
  onDelete?: (o: ObjectiveItem) => void;
  emptyText?: string;
}

export function ObjectivesGrid({ objectives, selectedId, onSelect, onEdit, onDelete, emptyText }: Props) {
  if (objectives.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-ink-3">
        {emptyText ?? "Aucun objectif sur cette période."}
      </div>
    );
  }
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      {objectives.map((o) => (
        <ObjectiveCard
          key={o.id}
          objective={o}
          selected={selectedId === o.id}
          onSelect={() => onSelect(o.id)}
          onEdit={onEdit ? () => onEdit(o) : undefined}
          onDelete={onDelete ? () => onDelete(o) : undefined}
        />
      ))}
    </div>
  );
}
