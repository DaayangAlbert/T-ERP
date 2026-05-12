"use client";

import { Shield, Plus } from "lucide-react";

interface Props {
  spacesTotal: number;
  documentsTotal: number;
  volumeBytes: number;
  readOnly: boolean;
  onOpenAccessPolicy: () => void;
  onCreate: () => void;
}

function formatVolume(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} Go`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} Mo`;
  return `${(bytes / 1_000).toFixed(0)} Ko`;
}

export function SpacesHeader({ spacesTotal, documentsTotal, volumeBytes, readOnly, onOpenAccessPolicy, onCreate }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Espaces documentaires</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {spacesTotal} espaces actifs · {documentsTotal.toLocaleString("fr-FR")} documents · {formatVolume(volumeBytes)} · architecture transverse
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenAccessPolicy}
          disabled={readOnly}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt disabled:opacity-50"
        >
          <Shield className="h-4 w-4" /> Politique d'accès
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={readOnly}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nouvel espace
        </button>
      </div>
    </div>
  );
}
