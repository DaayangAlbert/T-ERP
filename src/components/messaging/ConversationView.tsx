"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, Phone, Search, Video } from "lucide-react";
import { useMessages, useSendMessage, type ConversationItem } from "@/hooks/useMessaging";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";

interface Props {
  conversation: ConversationItem;
  onBack?: () => void;
}

const TONES = ["#2A1B3D", "#0F766E", "#9F580A", "#7C3AED", "#7C2D12", "#9333EA"];
function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return TONES[Math.abs(hash) % TONES.length];
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isSameDay) return "AUJOURD'HUI";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "HIER";
  }
  return d
    .toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();
}

export function ConversationView({ conversation, onBack }: Props) {
  const { data, isLoading } = useMessages(conversation.id);
  const send = useSendMessage(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever new messages land
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [data?.items.length]);

  const headerInitials = conversation.isGroup
    ? conversation.name
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2)
    : conversation.otherUsers[0]
      ? `${conversation.otherUsers[0].firstName.charAt(0)}${conversation.otherUsers[0].lastName.charAt(0)}`.toUpperCase()
      : "??";
  const tone = avatarColor(conversation.id);

  // Group messages by day for separators
  const items = data?.items ?? [];

  return (
    <div className="flex h-full flex-col bg-surface-alt">
      <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-2.5">
        {onBack && (
          <button
            onClick={onBack}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt md:hidden"
            aria-label="Retour à la liste"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[11.5px] font-semibold text-white"
          style={{ background: tone }}
        >
          {headerInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-ink">{conversation.name}</div>
          <div className="text-[11px] text-ink-3">
            {conversation.isGroup
              ? `${conversation.otherUsers.length + 1} membres`
              : conversation.otherUsers[0]
                ? `${conversation.otherUsers[0].role}`
                : ""}
          </div>
        </div>
        <div className="flex items-center gap-1 text-ink-3">
          <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-surface-alt" disabled title="Appel (J6+)">
            <Phone className="h-4 w-4" />
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-surface-alt" disabled title="Vidéo (J6+)">
            <Video className="h-4 w-4" />
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-surface-alt" disabled title="Recherche (J6+)">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 w-2/3 animate-pulse rounded-2xl bg-line/60" />
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <p className="my-12 text-center text-sm text-ink-3">
            Aucun message — soyez le premier à dire bonjour.
          </p>
        )}

        {!isLoading &&
          items.map((m, i) => {
            const prev = items[i - 1];
            const showDaySep = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            const sameSender = prev && prev.senderId === m.senderId && !prev.isSystem && !m.isSystem;
            const senderTone = avatarColor(m.senderId);
            return (
              <div key={m.id} className="space-y-1">
                {showDaySep && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-3 ring-1 ring-line">
                      {dayLabel(m.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={m}
                  showAvatar={!m.isMe && !sameSender}
                  showSenderName={!sameSender}
                  isGroup={conversation.isGroup}
                  avatarColor={senderTone}
                />
              </div>
            );
          })}
      </div>

      <Composer
        disabled={!conversation.id}
        onSend={async (content) => {
          await send.mutateAsync(content);
        }}
      />
    </div>
  );
}
