"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Plus, Trash2, Pencil } from "lucide-react";
import { SectionCard } from "./SectionCard";

export interface FormationItem {
  id: string;
  diploma: string;
  institution: string;
  year: number;
  description: string | null;
  order: number;
}

interface FormState {
  diploma: string;
  institution: string;
  year: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  diploma: "",
  institution: "",
  year: "",
  description: "",
};

export function FormationsEditor({
  initialFormations,
}: {
  initialFormations: FormationItem[];
}) {
  const router = useRouter();
  const [formations, setFormations] = useState(initialFormations);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
    setShowForm(true);
  }

  function openEdit(item: FormationItem) {
    setForm({
      diploma: item.diploma,
      institution: item.institution,
      year: String(item.year),
      description: item.description ?? "",
    });
    setEditingId(item.id);
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const year = parseInt(form.year, 10);
    if (!form.diploma.trim() || !form.institution.trim() || !year) {
      setError("Diplôme, établissement et année requis");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      diploma: form.diploma.trim(),
      institution: form.institution.trim(),
      year,
      description: form.description.trim() || null,
    };
    const url = editingId
      ? `/api/cand/profile/formations/${editingId}`
      : "/api/cand/profile/formations";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur de sauvegarde");
      return;
    }
    const json = (await res.json()) as { formation: FormationItem };
    if (editingId) {
      setFormations((arr) =>
        arr.map((f) => (f.id === editingId ? json.formation : f)),
      );
    } else {
      setFormations((arr) => [...arr, json.formation]);
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette formation ?")) return;
    const res = await fetch(`/api/cand/profile/formations/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Erreur de suppression");
      return;
    }
    setFormations((arr) => arr.filter((f) => f.id !== id));
    router.refresh();
  }

  return (
    <SectionCard
      title="Formation"
      icon={<GraduationCap className="h-4 w-4" />}
      action={
        !showForm ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-brand hover:bg-primary-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        ) : null
      }
    >
      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-md bg-surface-alt p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Diplôme *">
              <input
                value={form.diploma}
                onChange={(e) => setForm((f) => ({ ...f, diploma: e.target.value }))}
                placeholder="Ex: Bac+5 Génie Civil"
                className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Établissement *">
              <input
                value={form.institution}
                onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                placeholder="Ex: ENSP Yaoundé"
                className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Année *">
              <input
                type="number"
                min="1950"
                max={new Date().getFullYear() + 5}
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-brand hover:bg-primary-600 disabled:opacity-60"
            >
              {saving ? "Sauvegarde…" : editingId ? "Mettre à jour" : "Ajouter"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-alt"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      {formations.length === 0 && !showForm ? (
        <p className="text-xs text-ink-3">Aucune formation ajoutée.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {formations
            .slice()
            .sort((a, b) => b.year - a.year)
            .map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-line bg-white p-3 transition-colors hover:bg-surface-alt"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{f.diploma}</div>
                  <div className="text-xs text-ink-3">
                    {f.institution} · {f.year}
                  </div>
                  {f.description ? (
                    <p className="mt-1 text-xs text-ink-2">{f.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(f)}
                    className="rounded p-1.5 text-ink-3 hover:bg-surface-alt hover:text-primary-700"
                    aria-label="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id)}
                    className="rounded p-1.5 text-ink-3 hover:bg-surface-alt hover:text-rose-600"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </SectionCard>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
