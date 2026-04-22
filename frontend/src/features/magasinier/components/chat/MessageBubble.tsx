import { FileText, Image as ImageIcon, Video } from "lucide-react";

import type { ChatMessage } from "@/features/magasinier/types";
import { formatHour } from "@/features/magasinier/utils/format";
import { cn } from "@/shared/utils/cn";

interface MessageBubbleProps {
  message: ChatMessage;
  mine: boolean;
}

export function MessageBubble({ message, mine }: MessageBubbleProps) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-[24px] px-4 py-3 shadow-sm",
          mine
            ? "bg-[linear-gradient(135deg,#0f766e,#0ea5e9)] text-white"
            : "border border-slate-200 bg-white/92 text-slate-900 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50"
        )}
      >
        <p className={cn("mb-1 text-xs font-medium", mine ? "text-white/80" : "text-slate-500")}>
          {message.senderName} · {message.senderRole}
        </p>
        {message.content ? <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p> : null}

        {message.attachments.length ? (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3 py-2",
                  mine ? "border-white/20 bg-white/10" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                )}
              >
                <div className="rounded-xl bg-white/10 p-2">
                  {attachment.kind === "image" ? (
                    <ImageIcon className="h-4 w-4" />
                  ) : attachment.kind === "video" ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{attachment.name}</p>
                  <p className={cn("text-xs", mine ? "text-white/70" : "text-slate-500")}>{attachment.sizeLabel}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className={cn("mt-2 flex items-center justify-end gap-2 text-[11px]", mine ? "text-white/75" : "text-slate-500")}>
          <span>{formatHour(message.createdAt)}</span>
          <span>{message.readByCount} lus</span>
        </div>
      </div>
    </div>
  );
}
