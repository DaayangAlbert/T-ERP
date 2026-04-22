import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ConversationThread } from "@/features/magasinier/types";
import { formatDateTime } from "@/features/magasinier/utils/format";
import { cn } from "@/shared/utils/cn";

interface ConversationListProps {
  conversations: ConversationThread[];
  activeConversationId: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (conversationId: string) => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  search,
  onSearchChange,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rechercher une conversation"
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {conversations.length ? (
          conversations.map((conversation) => {
            const active = conversation.id === activeConversationId;
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "w-full rounded-[22px] border px-4 py-3 text-left transition",
                  active
                    ? "border-slate-950 bg-slate-950 text-white shadow-[0_20px_45px_-34px_rgba(15,23,42,0.85)] dark:border-teal-400 dark:bg-[linear-gradient(135deg,_rgba(20,184,166,0.28),_rgba(2,6,23,0.96))]"
                    : "border-slate-200 bg-white/85 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-900"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{conversation.title}</p>
                      {conversation.kind === "group" ? <Badge variant="info">Groupe</Badge> : null}
                    </div>
                    <p className={cn("mt-1 text-xs", active ? "text-white/70" : "text-slate-500")}>
                      {conversation.description}
                    </p>
                    <p className={cn("mt-2 truncate text-sm", active ? "text-white/80" : "text-slate-600 dark:text-slate-300")}>
                      {lastMessage?.content || "Aucun message"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-[11px]", active ? "text-white/70" : "text-slate-500")}>
                      {formatDateTime(conversation.lastActivityAt)}
                    </p>
                    {conversation.unreadCount ? (
                      <span className="mt-2 inline-flex rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700">
            Aucune conversation autorisee dans votre perimetre.
          </div>
        )}
      </div>
    </div>
  );
}
