"use client";

import { useState } from "react";
import { PlusCircle, X, Trash2, Archive } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import {
  useCircuitTemplates,
  useCreateCircuitTemplate,
  useArchiveCircuitTemplate,
  type CircuitTemplate,
} from "@/hooks/usePaymentCircuits";
import { PageHelp } from "@/components/help/PageHelp";
import { DafCircuitsPaiementTutorial } from "@/components/help/tutorials/DafCircuitsPaiementTutorial";

interface StepDraft {
  order: number;
  label: string;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
  estimatedDays: string;
}

export default function CircuitsPaiementPage() {
  const { data, isLoading } = useCircuitTemplates();
  const create = useCreateCircuitTemplate();
  const archive = useArchiveCircuitTemplate();
  const canEdit = useAccess(MODULES.DAF).canEdit;

  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Circuits de paiement
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Templates par marché / client. Chaque dossier de paiement suit le circuit défini par
            son maître d&apos;ouvrage.
          </p>
        </div>
        <PageHelp title="Aide — Circuits de paiement"><DafCircuitsPaiementTutorial /></PageHelp>
        {canEdit && !creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-700"
          >
            <PlusCircle className="h-4 w-4" /> Nouveau circuit
          </button>
        )}
      </header>

      {creating && (
        <CreateForm
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            await create.mutateAsync(body);
            setCreating(false);
          }}
          pending={create.isPending}
        />
      )}

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13px] text-ink-3">
          Aucun circuit défini. Crée le premier pour démarrer le suivi des dossiers de paiement.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              canEdit={canEdit}
              onArchive={() => archive.mutate(t.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  canEdit,
  onArchive,
}: {
  template: CircuitTemplate;
  canEdit: boolean;
  onArchive: () => void;
}) {
  return (
    <li className="rounded-xl border border-line bg-white p-3 shadow-card sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-ink">{template.name}</h3>
            {template.archivedAt && (
              <span className="rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-2">
                Archivé
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-ink-3">
            Pour : <strong>{template.clientName}</strong> · {template.stepCount} étapes ·{" "}
            {template.trackCount} dossier{template.trackCount > 1 ? "s" : ""} en cours
          </p>
          {template.description && (
            <p className="mt-1 text-[11.5px] text-ink-3">{template.description}</p>
          )}
        </div>
        {canEdit && !template.archivedAt && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Archiver le circuit « ${template.name} » ?`)) onArchive();
            }}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11.5px] text-ink-3 hover:border-danger hover:text-danger"
          >
            <Archive className="h-3.5 w-3.5" /> Archiver
          </button>
        )}
      </div>

      <ol className="mt-3 space-y-1.5">
        {template.steps.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded border border-line bg-surface-alt/30 p-2 text-[12px]">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 font-mono text-[11px] font-semibold text-primary-700">
              {s.order}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-ink">{s.label}</div>
              {(s.contactName || s.contactRole) && (
                <div className="text-[11px] text-ink-3">
                  {s.contactName}
                  {s.contactRole && ` · ${s.contactRole}`}
                  {s.contactPhone && ` · ${s.contactPhone}`}
                </div>
              )}
            </div>
            {s.estimatedDays != null && (
              <span className="font-mono text-[11px] text-ink-3">~{s.estimatedDays} j</span>
            )}
          </li>
        ))}
      </ol>
    </li>
  );
}

function CreateForm({
  onCancel,
  onSubmit,
  pending,
}: {
  onCancel: () => void;
  onSubmit: (body: unknown) => Promise<void>;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([
    { order: 1, label: "", contactName: "", contactRole: "", contactPhone: "", contactEmail: "", estimatedDays: "" },
  ]);

  const updateStep = (idx: number, key: keyof StepDraft, value: string | number) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  };

  const addStep = () =>
    setSteps([
      ...steps,
      {
        order: steps.length + 1,
        label: "",
        contactName: "",
        contactRole: "",
        contactPhone: "",
        contactEmail: "",
        estimatedDays: "",
      },
    ]);
  const removeStep = (idx: number) =>
    setSteps(
      steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })),
    );

  const submit = async () => {
    const payload = {
      name: name.trim(),
      clientName: clientName.trim(),
      description: description.trim() || null,
      steps: steps
        .filter((s) => s.label.trim().length > 0)
        .map((s) => ({
          order: s.order,
          label: s.label.trim(),
          contactName: s.contactName.trim() || null,
          contactRole: s.contactRole.trim() || null,
          contactPhone: s.contactPhone.trim() || null,
          contactEmail: s.contactEmail.trim() || null,
          estimatedDays: s.estimatedDays ? parseInt(s.estimatedDays, 10) : null,
        })),
    };
    if (!payload.name || !payload.clientName || payload.steps.length === 0) {
      alert("Nom, client et au moins 1 étape requis.");
      return;
    }
    try {
      await onSubmit(payload);
    } catch (err) {
      alert(`Erreur : ${(err as Error).message}`);
    }
  };

  return (
    <section className="rounded-xl border border-primary-200 bg-primary-50/30 p-3 sm:p-4">
      <h2 className="text-[13px] font-semibold text-ink">Nouveau circuit</h2>
      <p className="mt-0.5 text-[11.5px] text-ink-3">
        Définis le parcours administratif chez ton client. Exemple Mincom : Comptable → Contrôleur
        Financier → Payeur Spécialisé → ACCT.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Nom du circuit
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Circuit Mincom"
            className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] font-normal normal-case"
          />
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Client / Maître d&apos;ouvrage
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ministère de la Communication"
            className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] font-normal normal-case"
          />
        </label>
      </div>
      <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        Description (optionnel)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Spécificités du circuit, contact principal, etc."
          className="mt-1 w-full rounded-md border border-line bg-white p-2 text-[12.5px] font-normal normal-case"
        />
      </label>

      <h3 className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-ink-2">
        Étapes ({steps.length})
      </h3>
      <ol className="mt-2 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="rounded-md border border-line bg-white p-2">
            <div className="flex flex-wrap items-start gap-2">
              <span className="mt-1.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 font-mono text-[11px] font-semibold text-primary-700">
                {s.order}
              </span>
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input
                  value={s.label}
                  onChange={(e) => updateStep(i, "label", e.target.value)}
                  placeholder="Libellé de l'étape (ex: Comptable MINCOM)"
                  className="h-8 rounded border border-line bg-white px-2 text-[12px]"
                />
                <input
                  value={s.contactName}
                  onChange={(e) => updateStep(i, "contactName", e.target.value)}
                  placeholder="Nom du contact (optionnel)"
                  className="h-8 rounded border border-line bg-white px-2 text-[12px]"
                />
                <input
                  value={s.contactRole}
                  onChange={(e) => updateStep(i, "contactRole", e.target.value)}
                  placeholder="Fonction (optionnel)"
                  className="h-8 rounded border border-line bg-white px-2 text-[12px]"
                />
                <input
                  value={s.contactPhone}
                  onChange={(e) => updateStep(i, "contactPhone", e.target.value)}
                  placeholder="Téléphone (optionnel)"
                  className="h-8 rounded border border-line bg-white px-2 text-[12px]"
                />
                <input
                  value={s.contactEmail}
                  onChange={(e) => updateStep(i, "contactEmail", e.target.value)}
                  placeholder="Email (optionnel)"
                  className="h-8 rounded border border-line bg-white px-2 text-[12px]"
                />
                <input
                  value={s.estimatedDays}
                  onChange={(e) => updateStep(i, "estimatedDays", e.target.value)}
                  placeholder="Délai estimé (j, optionnel)"
                  type="number"
                  className="h-8 rounded border border-line bg-white px-2 text-[12px]"
                />
              </div>
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded text-ink-3 hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={addStep}
        className="mt-2 inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11.5px] font-medium text-ink-2 hover:border-primary-300"
      >
        <PlusCircle className="h-3.5 w-3.5" /> Ajouter une étape
      </button>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-2"
        >
          <X className="h-3.5 w-3.5" /> Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary-600 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? "Création…" : "Créer le circuit"}
        </button>
      </div>
    </section>
  );
}
