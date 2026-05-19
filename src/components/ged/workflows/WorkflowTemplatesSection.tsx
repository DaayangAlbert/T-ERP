"use client";

import { useState } from "react";
import { Plus, Pencil, Power, Trash2, AlertTriangle, GitBranch } from "lucide-react";
import { clsx } from "clsx";
import {
  useGedWorkflowTemplates,
  useDeleteWorkflowTemplate,
  type WorkflowTemplate,
} from "@/hooks/useGedWorkflows";
import { TemplateEditorModal } from "./TemplateEditorModal";

export function WorkflowTemplatesSection({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading, isError } = useGedWorkflowTemplates();
  const deleteMut = useDeleteWorkflowTemplate();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WorkflowTemplate | null>(null);

  function openCreate() {
    setEditingId(null);
    setEditorOpen(true);
  }
  function openEdit(id: string) {
    setEditingId(id);
    setEditorOpen(true);
  }
  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
  }

  async function handleDelete(force: boolean) {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync({ id: confirmDelete.id, force });
      setConfirmDelete(null);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <section>
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Templates de workflows {data && `(${data.templates.length})`}
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" /> Nouveau template
          </button>
        )}
      </header>

      {isError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          Erreur de chargement des templates.
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      )}

      {data && data.templates.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface-alt/30 px-4 py-8 text-center">
          <GitBranch className="h-8 w-8 text-ink-3" />
          <p className="text-[12.5px] text-ink-3">Aucun template défini pour ce tenant.</p>
          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" /> Créer le premier template
            </button>
          )}
        </div>
      )}

      {data && data.templates.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              canEdit={canEdit}
              onEdit={() => openEdit(t.id)}
              onDelete={() => setConfirmDelete(t)}
            />
          ))}
        </div>
      )}

      {editorOpen && <TemplateEditorModal templateId={editingId} onClose={closeEditor} />}

      {confirmDelete && (
        <DeleteConfirmModal
          template={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          pending={deleteMut.isPending}
        />
      )}
    </section>
  );
}

function TemplateCard({
  template: t,
  canEdit,
  onEdit,
  onDelete,
}: {
  template: WorkflowTemplate;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={clsx(
        "group relative rounded-xl border bg-white p-3 transition",
        t.active ? "border-line hover:border-violet-300" : "border-dashed border-line opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10.5px] text-violet-700">{t.code}</div>
          <div className="text-[13px] font-semibold text-ink">{t.name}</div>
          {t.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-3">{t.description}</p>
          )}
        </div>
        {!t.active && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
            Inactif
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
        <span>
          {t.steps.length} étape{t.steps.length > 1 ? "s" : ""} · {t.classificationsCount}{" "}
          classif.
        </span>
        {t.instancesCount > 0 && (
          <span className="rounded bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700">
            {t.instancesCount} en cours
          </span>
        )}
      </div>

      {canEdit && (
        <div className="mt-2 flex items-center gap-1 border-t border-line pt-2 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] font-semibold text-ink hover:bg-surface-alt"
          >
            <Pencil className="h-3 w-3" /> Modifier
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-rose-200 bg-white px-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
          >
            {t.active ? <Power className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
            {t.active ? "Désactiver" : "Supprimer"}
          </button>
        </div>
      )}
    </div>
  );
}

function DeleteConfirmModal({
  template,
  onCancel,
  onConfirm,
  pending,
}: {
  template: WorkflowTemplate;
  onCancel: () => void;
  onConfirm: (force: boolean) => void;
  pending: boolean;
}) {
  const hasInstances = template.instancesCount > 0;
  const canHardDelete = !template.active && template.instancesCount === 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <header className="border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            {canHardDelete ? "Supprimer définitivement" : "Désactiver le template"}
          </h2>
        </header>
        <div className="space-y-3 px-4 py-3 text-[12.5px] text-ink-2">
          <p>
            <span className="font-mono font-semibold text-violet-700">{template.code}</span> —{" "}
            <span className="font-semibold">{template.name}</span>
          </p>
          {hasInstances ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
              <strong>{template.instancesCount}</strong> workflow(s) actif(s) utilisent ce template.
              La désactivation empêche la création de nouveaux workflows mais conserve les instances
              en cours.
            </div>
          ) : canHardDelete ? (
            <p className="text-ink-3">
              Aucune instance liée. La suppression définitive est possible (cliquez sur
              "Supprimer définitivement").
            </p>
          ) : (
            <p className="text-ink-3">
              Le template sera désactivé. Vous pourrez le supprimer définitivement après l'avoir
              désactivé si aucune instance n'a été créée.
            </p>
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            Annuler
          </button>
          {template.active && (
            <button
              type="button"
              onClick={() => onConfirm(false)}
              disabled={pending}
              className="h-8 rounded-md bg-amber-600 px-3 text-[12px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Désactiver
            </button>
          )}
          {canHardDelete && (
            <button
              type="button"
              onClick={() => onConfirm(true)}
              disabled={pending}
              className="h-8 rounded-md bg-rose-600 px-3 text-[12px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Supprimer définitivement
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
