import { FolderKanban, Phone, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ConversationThread, FileAttachment } from "@/features/magasinier/types";

interface GroupInfoPanelProps {
  conversation: ConversationThread | null;
  sharedFiles: FileAttachment[];
}

export function GroupInfoPanel({ conversation, sharedFiles }: GroupInfoPanelProps) {
  if (!conversation) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-slate-200 bg-white/88 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-900">
            <Users className="h-5 w-5 text-slate-700 dark:text-slate-200" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{conversation.title}</p>
            <p className="mt-1 text-sm text-slate-500">{conversation.description}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {conversation.members.map((member) => (
            <span
              key={member.id}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {member.displayName}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white/88 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Fichiers partages</p>
        </div>
        <div className="mt-4 space-y-2">
          {sharedFiles.length ? (
            sharedFiles.map((file) => (
              <div
                key={file.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="font-medium text-slate-900 dark:text-slate-50">{file.name}</p>
                <p className="mt-1 text-xs text-slate-500">{file.sizeLabel}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Aucun fichier partage pour cette conversation.</p>
          )}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white/88 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Infos appel</p>
          </div>
          <Badge variant="info">{conversation.kind === "group" ? "Groupe" : "Prive"}</Badge>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Les appels audio et video sont limites a l'admin et aux responsables lies a vos projets affectes.
        </p>
      </div>
    </div>
  );
}
