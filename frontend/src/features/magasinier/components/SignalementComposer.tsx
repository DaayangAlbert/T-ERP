import { useState } from "react";
import { Paperclip, Send, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FileAttachment, MagasinierProject, PriorityLevel, SignalementType } from "@/features/magasinier/types";
import { formatFileSize, inferAttachmentKind } from "@/features/magasinier/utils/format";

interface SignalementComposerProps {
  projects: MagasinierProject[];
  selectedProjectId: string;
  onSaveDraft: (draft: {
    projectId: string;
    type: SignalementType;
    title: string;
    description: string;
    priority: PriorityLevel;
    attachments: FileAttachment[];
  }) => void;
  onSend: (draft: {
    projectId: string;
    type: SignalementType;
    title: string;
    description: string;
    priority: PriorityLevel;
    attachments: FileAttachment[];
  }) => void;
}

export function SignalementComposer({
  projects,
  selectedProjectId,
  onSaveDraft,
  onSend,
}: SignalementComposerProps) {
  const [projectId, setProjectId] = useState(selectedProjectId || projects[0]?.id || "");
  const [type, setType] = useState<SignalementType>("rupture");
  const [priority, setPriority] = useState<PriorityLevel>("high");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const buildPayload = () => ({
    projectId,
    type,
    title,
    description,
    priority,
    attachments,
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAttachments([]);
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setAttachments((current) => [
      ...current,
      ...selectedFiles.map((file, index) => ({
        id: `${file.name}-${index}-${Date.now()}`,
        name: file.name,
        kind: inferAttachmentKind(file.name),
        sizeLabel: formatFileSize(file.size),
      })),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projet concerne</span>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as SignalementType)}
            className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
          >
            <option value="rupture">Rupture</option>
            <option value="anomaly">Anomalie</option>
            <option value="loss">Perte</option>
            <option value="breakage">Casse</option>
            <option value="replenishment">Approvisionnement</option>
            <option value="urgent">Urgence</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre du signalement" />
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as PriorityLevel)}
          className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
        >
          <option value="low">Priorite basse</option>
          <option value="medium">Priorite moyenne</option>
          <option value="high">Priorite haute</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <Textarea
        rows={5}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Decrivez la situation, l'impact chantier et le besoin attendu."
      />

      <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-4 dark:border-slate-700">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          <Paperclip className="h-4 w-4" />
          Joindre photos, videos ou documents
          <input type="file" multiple className="hidden" onChange={handleFiles} />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {attachments.length ? (
            attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {attachment.name} · {attachment.sizeLabel}
              </span>
            ))
          ) : (
            <p className="text-xs text-slate-500">Aucune piece jointe pour le moment.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            onSaveDraft(buildPayload());
            resetForm();
          }}
        >
          <Save className="h-4 w-4" />
          Enregistrer en brouillon
        </Button>
        <Button
          className="gap-2"
          onClick={() => {
            onSend(buildPayload());
            resetForm();
          }}
        >
          <Send className="h-4 w-4" />
          Envoyer a la hierarchie
        </Button>
      </div>
    </div>
  );
}
