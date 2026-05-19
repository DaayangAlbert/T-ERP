"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, AlertTriangle } from "lucide-react";

export interface NcSiteOption {
  id: string;
  code: string;
  name: string;
}

export interface NcStaffOption {
  id: string;
  fullName: string;
  role: string;
}

export interface NcDraft {
  id?: string;
  siteId: string;
  category: "QUALITY" | "SAFETY" | "ENVIRONMENT" | "REGULATORY" | "DOCUMENTATION";
  criticality: "MINOR" | "MAJOR" | "CRITICAL";
  description: string;
  correctiveAction: string | null;
  ownerId: string | null;
  dueDate: string | null;
  status: "OPEN" | "ACTION_PLANNED" | "IN_PROGRESS" | "CLOSED" | "REJECTED";
}

interface Props {
  initial: NcDraft;
  sites: NcSiteOption[];
  staff: NcStaffOption[];
  /** Si true, le sélecteur de chantier est masqué (cas Chef de Chantier sur son site). */
  lockSite?: boolean;
  /** Invalidations à déclencher en cas de succès. */
  invalidateKeys: Array<readonly unknown[]>;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

const CATEGORIES: Array<{ value: NcDraft["category"]; label: string }> = [
  { value: "QUALITY", label: "Qualité" },
  { value: "SAFETY", label: "Sécurité" },
  { value: "ENVIRONMENT", label: "Environnement" },
  { value: "REGULATORY", label: "Réglementaire" },
  { value: "DOCUMENTATION", label: "Documentation" },
];

const CRITICALITIES: Array<{ value: NcDraft["criticality"]; label: string; tone: string }> = [
  { value: "MINOR", label: "Mineure", tone: "border-ink-3/30 text-ink-3" },
  { value: "MAJOR", label: "Majeure", tone: "border-amber-400 text-amber-800" },
  { value: "CRITICAL", label: "Critique", tone: "border-rose-400 text-rose-700" },
];

const STATUSES: Array<{ value: NcDraft["status"]; label: string }> = [
  { value: "OPEN", label: "Ouverte" },
  { value: "ACTION_PLANNED", label: "Action planifiée" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "CLOSED", label: "Résolue / clôturée" },
  { value: "REJECTED", label: "Rejetée" },
];

export function NcEditorModal({
  initial,
  sites,
  staff,
  lockSite,
  invalidateKeys,
  onClose,
  onSaved,
}: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(initial.id);
  const [draft, setDraft] = useState<NcDraft>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setDraft(initial), [initial]);

  const save = useMutation({
    mutationFn: async () => {
      setError(null);
      const url = isEdit ? `/api/dt/qhse/ncs/${initial.id}` : `/api/dt/qhse/ncs`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? {} : { siteId: draft.siteId }),
          category: draft.category,
          criticality: draft.criticality,
          description: draft.description,
          correctiveAction: draft.correctiveAction || null,
          ownerId: draft.ownerId ?? undefined,
          dueDate: draft.dueDate ? new Date(draft.dueDate).toISOString() : null,
          status: draft.status,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: ({ id }) => {
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
      onSaved?.(id);
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const valid = draft.siteId && draft.description.trim().length >= 5 && draft.category && draft.criticality;
  const becomingClosed = draft.status === "CLOSED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">
              {isEdit ? "Modifier la non-conformité" : "Déclarer une non-conformité"}
            </h2>
            <p className="text-[11.5px] text-ink-3">
              {isEdit ? "Mise à jour de l'état, de l'action corrective ou clôture." : "Renseigner le problème observé et, si possible, l'action corrective."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="space-y-3 p-4 text-[12.5px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save.mutate();
          }}
        >
          {!lockSite && (
            <Field label="Chantier *">
              <select
                required
                value={draft.siteId}
                onChange={(e) => setDraft({ ...draft, siteId: e.target.value })}
                className="h-9 w-full rounded-md border border-line bg-white px-2"
                disabled={isEdit}
              >
                <option value="">— Sélectionner —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field label="Catégorie *">
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as NcDraft["category"] })}
                className="h-9 w-full rounded-md border border-line bg-white px-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Criticité *">
              <div className="flex gap-1.5">
                {CRITICALITIES.map((c) => {
                  const active = draft.criticality === c.value;
                  return (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => setDraft({ ...draft, criticality: c.value })}
                      className={`flex-1 rounded-md border px-2 py-1 text-[11.5px] font-medium ${active ? `${c.tone} bg-surface-alt` : "border-line text-ink-3 hover:bg-surface-alt"}`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <Field label="Description du problème *">
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Ex : Coffrage défectueux sur poutre P12 — fissures observées après décoffrage"
              className="w-full resize-none rounded-md border border-line bg-white p-2 text-[12.5px]"
            />
          </Field>

          <Field label="Action corrective (solution adoptée)">
            <textarea
              maxLength={2000}
              rows={3}
              value={draft.correctiveAction ?? ""}
              onChange={(e) => setDraft({ ...draft, correctiveAction: e.target.value })}
              placeholder="Ex : Démolition partielle, ré-armature, recoulage avec contrôle dimensionnel renforcé"
              className="w-full resize-none rounded-md border border-line bg-white p-2 text-[12.5px]"
            />
            <p className="mt-0.5 text-[11px] text-ink-3">
              Décrire ce qui a été (ou sera) fait pour résoudre le problème.
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Responsable">
              <select
                value={draft.ownerId ?? ""}
                onChange={(e) => setDraft({ ...draft, ownerId: e.target.value || null })}
                className="h-9 w-full rounded-md border border-line bg-white px-2"
              >
                <option value="">— Par défaut (déclarant) —</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} · {u.role}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Échéance">
              <input
                type="date"
                value={draft.dueDate ? draft.dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  setDraft({ ...draft, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
                className="h-9 w-full rounded-md border border-line bg-white px-2"
              />
            </Field>
          </div>

          <Field label="Statut">
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as NcDraft["status"] })}
              className="h-9 w-full rounded-md border border-line bg-white px-2"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {becomingClosed && (
              <p className="mt-0.5 text-[11px] text-emerald-700">
                La date de clôture sera enregistrée automatiquement.
              </p>
            )}
          </Field>

          {error && (
            <div className="flex items-start gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-[12px] text-rose-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!valid || save.isPending}
              className="h-9 rounded-md bg-primary-600 px-4 text-[12.5px] font-medium text-white disabled:opacity-50"
            >
              {save.isPending ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Déclarer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</span>
      {children}
    </label>
  );
}
