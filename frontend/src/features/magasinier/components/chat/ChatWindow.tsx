import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Mic, Paperclip, Phone, Search, Send, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ConversationThread, FileAttachment } from "@/features/magasinier/types";
import { formatFileSize, inferAttachmentKind } from "@/features/magasinier/utils/format";
import { MessageBubble } from "@/features/magasinier/components/chat/MessageBubble";

interface ChatWindowProps {
  conversation: ConversationThread | null;
  messages: ConversationThread["messages"];
  messageSearch: string;
  onMessageSearchChange: (value: string) => void;
  onSend: (content: string, attachments: FileAttachment[]) => void;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
}

export function ChatWindow({
  conversation,
  messages,
  messageSearch,
  onMessageSearchChange,
  onSend,
  onStartAudioCall,
  onStartVideoCall,
}: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useEffectEvent(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || []).map((file, index) => ({
      id: `${file.name}-${index}-${Date.now()}`,
      name: file.name,
      kind: inferAttachmentKind(file.name),
      sizeLabel: formatFileSize(file.size),
    }));
    setAttachments((current) => [...current, ...nextFiles]);
  };

  if (!conversation) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
        Selectionnez une conversation pour commencer.
      </div>
    );
  }

  return (
    <div className="flex min-h-[42rem] flex-col rounded-[28px] border border-slate-200 bg-white/88 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{conversation.title}</h3>
            <p className="text-sm text-slate-500">{conversation.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={onStartAudioCall}>
              <Phone className="h-4 w-4" />
              Audio
            </Button>
            <Button variant="outline" className="gap-2" onClick={onStartVideoCall}>
              <Video className="h-4 w-4" />
              Video
            </Button>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={messageSearch}
            onChange={(event) => onMessageSearchChange(event.target.value)}
            placeholder="Rechercher dans les messages"
            className="pl-9"
          />
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.8),rgba(241,245,249,0.9))] px-4 py-4 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.82),rgba(15,23,42,0.95))]"
      >
        {messages.length ? (
          messages.map((item) => <MessageBubble key={item.id} message={item} mine={item.senderRole === "Magasinier"} />)
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700">
            Aucun message dans cette conversation.
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
        {attachments.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {attachment.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3">
          <Textarea
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ecrire un message, joindre une photo, une video ou un document..."
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                <Paperclip className="h-4 w-4" />
                Fichiers
                <input type="file" multiple className="hidden" onChange={handleFiles} />
              </label>
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                <Mic className="h-4 w-4" />
                Lecture en direct
              </span>
            </div>

            <Button
              className="gap-2"
              onClick={() => {
                onSend(message, attachments);
                setMessage("");
                setAttachments([]);
              }}
            >
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
