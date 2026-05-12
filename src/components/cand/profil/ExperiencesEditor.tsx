"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, Trash2, Pencil, X } from "lucide-react";
import { SectionCard } from "./SectionCard";

export interface ExperienceItem {
  id: string;
  position: string;
  company: string;
  location: string | null;
  startDate: string; // ISO
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  order: number;
}

interface FormState {
  position: string;
  company: string;
  location: string;
  startMonth: string; // YYYY-MM
  endMonth: string;
  isCurrent: boolean;
  description: string;
}

const EMPTY_FORM: FormState = {
  position: "",
  company: "",
  location: "",
  startMonth: "",
  endMonth: "",
  isCurrent: false,
  description: "",
};

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
  }).format(d);
}

function toIsoMonth(monthValue: string): string {
  // monthValue: "YYYY-MM" → ISO du premier jour
  const [y, m] = monthValue.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toISOString();
}

export function ExperiencesEditor({
  initialExperiences,
}: {
  initialExperiences: ExperienceItem[];
}) {
  const router = useRouter();
  const [experiences, setExperiences] = useState(initialExperiences);
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

  function openEdit(exp: ExperienceItem) {
    setForm({
      position: exp.position,
      company: exp.company,
      location: exp.location ?? "",
      startMonth: exp.startDate.slice(0, 7),
      endMonth: exp.endDate ? exp.endDate.slice(0, 7) : "",
      isCurrent: exp.isCurrent,
      description: exp.description ?? "",
    });
    setEditingId(exp.id);
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.position.trim() || !form.company.trim() || !form.startMonth) {
      setError("Poste, entreprise et date de début requis");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      position: form.position.trim(),
      company: form.company.trim(),
      location: form.location.trim() || null,
      startDate: toIsoMonth(form.startMonth),
      endDate:
        !form.isCurrent && form.endMonth ? toIsoMonth(form.endMonth) : null,
      isCurrent: form.isCurrent,
      description: form.description.trim() || null,
    };
    const url = editingId
      ? `/api/cand/profile/experiences/${editingId}`
      : "/api/cand/profile/experiences";
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
    const json = (await res.json()) as { experience: ExperienceItem };
    if (editingId) {
      setExperiences((arr) =>
        arr.map((e) => (e.id === editingId ? json.experience : e)),
      );
    } else {
      setExperiences((arr) => [...arr, json.experience]);
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette expérience ?")) return;
    const res = await fetch(`/api/cand/profile/experiences/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Erreur de suppression");
      return;
    }
    setExperiences((arr) => arr.filter((e) => e.id !== id));
    router.refresh();
  }

  return (
    <SectionCard
      title="Expérience professionnelle"
      icon={<Briefcase className="h-4 w-4" />}
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
            <Field label="Poste *">
              <input
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Entreprise *">
              <input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Lieu">
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Ex: Yaoundé"
                className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Début *">
              <input
                type="month"
                value={form.startMonth}
                onChange={(e) => setForm((f) => ({ ...f, startMonth: e.target.value }))}
                className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Fin">
              <input
                type="month"
                value={form.endMonth}
                disabled={form.isCurrent}
                onChange={(e) => setForm((f) => ({ ...f, endMonth: e.target.value }))}
                className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-ink-3/10"
              />
            </Field>
            <label className="flex items-center gap-2 self-end text-sm text-ink-2">
              <input
                type="checkbox"
                checked={form.isCurrent}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isCurrent: e.target.checked,
                    endMonth: e.target.checked ? "" : f.endMonth,
                  }))
                }
                className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
              />
              En cours
            </label>
          </div>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Missions, projets, résultats…"
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

      {experiences.length === 0 && !showForm ? (
        <p className="text-xs text-ink-3">
          Aucune expérience ajoutée. Cliquez sur « Ajouter » pour commencer.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {experiences.map((exp) => (
            <li
              key={exp.id}
              className="rounded-md border border-line bg-white p-3 transition-colors hover:bg-surface-alt"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">
                    {exp.position}
                  </div>
                  <div className="text-xs text-ink-3">
                    {exp.company}
                    {exp.location ? ` · ${exp.location}` : ""}
                    {" · "}
                    {formatMonth(exp.startDate)} —{" "}
                    {exp.isCurrent
                      ? "présent"
                      : exp.endDate
                        ? formatMonth(exp.endDate)
                        : "—"}
                  </div>
                  {exp.description ? (
                    <p className="mt-2 whitespace-pre-line text-xs text-ink-2">
                      {exp.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(exp)}
                    className="rounded p-1.5 text-ink-3 hover:bg-surface-alt hover:text-primary-700"
                    aria-label="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(exp.id)}
                    className="rounded p-1.5 text-ink-3 hover:bg-surface-alt hover:text-rose-600"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
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
