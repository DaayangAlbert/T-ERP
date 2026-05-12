"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Confidentiality, SpaceType } from "@prisma/client";
import { useCreateSpace } from "@/hooks/useGedSpaces";

const SPACE_TYPE_LABEL: Record<SpaceType, string> = {
  CONSTRUCTION_SITE: "Chantier",
  MARKETS_CONTRACTS: "Marchés & contrats",
  HR: "Ressources humaines",
  ACCOUNTING: "Comptable & fiscal",
  LEGAL: "Juridique",
  QSE: "Qualité Sécurité Env.",
  OTHER: "Autre",
};

const CONF_LABEL: Record<Confidentiality, string> = {
  PUBLIC: "Public",
  INTERNAL: "Interne",
  RESTRICTED: "Restreint",
  CONFIDENTIAL: "Confidentiel",
};

interface Props {
  onClose: () => void;
  onCreated?: (id: string) => void;
}

export function NewSpaceModal({ onClose, onCreated }: Props) {
  const create = useCreateSpace();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [description, setDescription] = useState("");
  const [spaceType, setSpaceType] = useState<SpaceType>("OTHER");
  const [confidentiality, setConfidentiality] = useState<Confidentiality>("INTERNAL");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    create.mutate(
      {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
        spaceType,
        confidentiality,
      },
      {
        onSuccess: ({ id }) => {
          onCreated?.(id);
          onClose();
        },
        onError: (e: Error) => setErr(e.message),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-bold text-ink">Nouvel espace documentaire</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <form onSubmit={submit} className="space-y-3 px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Code *</span>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="EX. RH_FORMATIONS"
                pattern="[A-Z0-9_]{2,60}"
                className="h-9 rounded-lg border border-line bg-white px-2 font-mono text-[12.5px] uppercase outline-none focus:border-violet-400"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Icône</span>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                placeholder="📁"
                className="h-9 rounded-lg border border-line bg-white px-2 text-[14px] outline-none focus:border-violet-400"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Nom *</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Formations professionnelles"
              className="h-9 rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              className="rounded-lg border border-line bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-violet-400"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Type *</span>
              <select
                value={spaceType}
                onChange={(e) => setSpaceType(e.target.value as SpaceType)}
                className="h-9 rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
              >
                {(Object.keys(SPACE_TYPE_LABEL) as SpaceType[]).map((t) => (
                  <option key={t} value={t}>
                    {SPACE_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Confidentialité *</span>
              <select
                value={confidentiality}
                onChange={(e) => setConfidentiality(e.target.value as Confidentiality)}
                className="h-9 rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
              >
                {(Object.keys(CONF_LABEL) as Confidentiality[]).map((c) => (
                  <option key={c} value={c}>
                    {CONF_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {err && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11.5px] text-rose-700">
              {err}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="inline-flex h-9 items-center rounded-lg bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {create.isPending ? "Création…" : "Créer l'espace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
