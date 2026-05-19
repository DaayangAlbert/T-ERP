"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle, Save, GitBranch } from "lucide-react";
import { clsx } from "clsx";
import {
  useCreateWorkflowTemplate,
  useUpdateWorkflowTemplate,
  useGedWorkflowTemplate,
  type WorkflowStepInput,
  type WorkflowStepRole,
} from "@/hooks/useGedWorkflows";
import { useGedClassifications } from "@/hooks/useGedClassifications";

interface Props {
  /** id du template à éditer ; null = création */
  templateId: string | null;
  onClose: () => void;
}

const ROLE_OPTIONS: Array<{ value: WorkflowStepRole; label: string }> = [
  { value: "DG", label: "DG — Directeur Général" },
  { value: "DAF", label: "DAF — Directeur Administratif et Financier" },
  { value: "SECRETARY_GENERAL", label: "SG — Secrétaire Général" },
  { value: "HR", label: "RH — Responsable RH" },
  { value: "TECH_DIRECTOR", label: "DT — Directeur Technique" },
  { value: "WORKS_DIRECTOR", label: "DTrav — Directeur de travaux" },
  { value: "WORKS_MANAGER", label: "CDT — Conducteur de travaux" },
  { value: "SITE_MANAGER", label: "CC — Chef de chantier" },
  { value: "ACCOUNTANT", label: "CPT — Comptable" },
  { value: "ARCHIVIST", label: "ARCHIVISTE — Référent documentaire" },
  { value: "LOGISTICS", label: "LOG — Logistique" },
  { value: "WAREHOUSE", label: "MAG — Magasinier" },
  { value: "EMPLOYEE", label: "Employé" },
  { value: "WORKER", label: "Ouvrier" },
  { value: "EXTERNAL", label: "EXTERNAL — MOA / MOE / Externe" },
];

function emptyStep(index: number): WorkflowStepInput {
  return {
    stepIndex: index,
    name: "",
    role: "DAF",
    mandatory: true,
    slaHours: 48,
  };
}

export function TemplateEditorModal({ templateId, onClose }: Props) {
  const isEdit = Boolean(templateId);
  const tplQ = useGedWorkflowTemplate(templateId);
  const classifQ = useGedClassifications();
  const createMut = useCreateWorkflowTemplate();
  const updateMut = useUpdateWorkflowTemplate(templateId ?? "noop");

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStepInput[]>([emptyStep(0)]);
  const [classificationIds, setClassificationIds] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && tplQ.data) {
      setCode(tplQ.data.code);
      setName(tplQ.data.name);
      setDescription(tplQ.data.description ?? "");
      setSteps(tplQ.data.steps);
      setClassificationIds(tplQ.data.classifications.map((c) => c.id));
      setActive(tplQ.data.active);
    }
  }, [isEdit, tplQ.data]);

  function updateStep(index: number, patch: Partial<WorkflowStepInput>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep(prev.length)]);
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepIndex: i })),
    );
  }

  function moveStep(index: number, dir: -1 | 1) {
    setSteps((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, stepIndex: i }));
    });
  }

  function toggleClassif(id: string) {
    setClassificationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function validateForm(): string | null {
    if (!isEdit && !/^[A-Z][A-Z0-9_-]+$/.test(code)) {
      return "Code invalide : MAJUSCULES, chiffres, tirets et underscores uniquement (ex: WF-CCTP)";
    }
    if (!name.trim() || name.trim().length < 3) {
      return "Nom : minimum 3 caractères";
    }
    if (steps.length === 0) {
      return "Au moins 1 étape requise";
    }
    for (const s of steps) {
      if (!s.name.trim() || s.name.trim().length < 2) {
        return `Étape ${s.stepIndex + 1} : nom requis (min 2 caractères)`;
      }
      if (s.slaHours < 1 || s.slaHours > 720) {
        return `Étape ${s.stepIndex + 1} : SLA entre 1 et 720h`;
      }
    }
    return null;
  }

  async function submit() {
    setError(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      if (isEdit) {
        await updateMut.mutateAsync({
          name,
          description: description.trim() || null,
          steps,
          classificationIds,
          active,
        });
      } else {
        await createMut.mutateAsync({
          code,
          name,
          description: description.trim() || null,
          steps,
          classificationIds: classificationIds.length > 0 ? classificationIds : undefined,
        });
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-start justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink">
              <GitBranch className="h-4 w-4 text-violet-600" />
              {isEdit ? "Modifier le template" : "Nouveau template de workflow"}
            </h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              Définissez les étapes de validation et les classifications à rattacher.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* En-tête */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label required>Code *</Label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isEdit}
                placeholder="WF-CCTP"
                maxLength={40}
                className={clsx(
                  "h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[12px] outline-none focus:border-violet-400",
                  isEdit && "cursor-not-allowed bg-surface-alt text-ink-3",
                )}
              />
              {isEdit ? (
                <p className="mt-0.5 text-[10.5px] text-ink-3">Le code n'est pas modifiable.</p>
              ) : (
                <p className="mt-0.5 text-[10.5px] text-ink-3">
                  MAJ + chiffres + tirets. Ex: WF-CCTP, WF-AVENANT-V2
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label required>Nom affiché *</Label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Validation CCTP marché public"
                maxLength={160}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="À quoi sert ce workflow et quand le déclencher…"
              className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
            />
          </div>

          {/* Étapes */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Étapes du workflow *</Label>
              <button
                type="button"
                onClick={addStep}
                disabled={steps.length >= 10}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 text-[11.5px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter une étape
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-line bg-surface-alt/30 p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(idx, { name: e.target.value })}
                      placeholder="Nom de l'étape (ex: Revue technique)"
                      maxLength={120}
                      className="h-8 flex-1 rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                    />
                    <button
                      type="button"
                      onClick={() => moveStep(idx, -1)}
                      disabled={idx === 0}
                      className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-surface-alt disabled:opacity-30"
                      aria-label="Monter"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(idx, 1)}
                      disabled={idx === steps.length - 1}
                      className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-surface-alt disabled:opacity-30"
                      aria-label="Descendre"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      disabled={steps.length === 1}
                      className="grid h-7 w-7 place-items-center rounded-md text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 pl-8">
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-ink-3">
                        Rôle assigné
                      </span>
                      <select
                        value={step.role}
                        onChange={(e) =>
                          updateStep(idx, { role: e.target.value as WorkflowStepRole })
                        }
                        className="mt-0.5 h-7 w-full rounded-md border border-line bg-white px-1 text-[11.5px] outline-none focus:border-violet-400"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-ink-3">
                        SLA (heures)
                      </span>
                      <input
                        type="number"
                        value={step.slaHours}
                        onChange={(e) =>
                          updateStep(idx, { slaHours: Math.max(1, Number(e.target.value) || 1) })
                        }
                        min={1}
                        max={720}
                        className="mt-0.5 h-7 w-full rounded-md border border-line bg-white px-2 text-[11.5px] outline-none focus:border-violet-400"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 pt-3.5 text-[11.5px]">
                      <input
                        type="checkbox"
                        checked={step.mandatory}
                        onChange={(e) => updateStep(idx, { mandatory: e.target.checked })}
                      />
                      Obligatoire
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Classifications à rattacher */}
          {classifQ.data?.items && classifQ.data.items.length > 0 && (
            <div>
              <Label>Classifications déclenchant ce workflow</Label>
              <p className="mb-1.5 text-[10.5px] text-ink-3">
                Tout document importé avec une de ces classifications instanciera automatiquement
                ce workflow.
              </p>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-line bg-surface-alt/30 p-2">
                {classifQ.data.items.map((c) => {
                  const checked = classificationIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={clsx(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[11.5px]",
                        checked ? "bg-violet-100" : "hover:bg-white",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClassif(c.id)}
                      />
                      <span className="font-mono font-semibold text-violet-700">{c.prefix}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-[10px] text-ink-3">DUA {c.dua}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active toggle (édition seulement) */}
          {isEdit && (
            <label className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span>Template actif (décocher pour désactiver sans supprimer)</span>
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le template"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
      {children}
      {required && <span className="ml-0.5 text-rose-600">*</span>}
    </label>
  );
}
