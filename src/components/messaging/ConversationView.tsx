"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreVertical, Phone, Search, Video } from "lucide-react";
import { useMessages, useSendAttachment, useSendMessage, type ConversationItem } from "@/hooks/useMessaging";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { CallSimulator } from "./CallSimulator";

const ROLE_LABEL: Record<string, string> = {
  DG: "Directeur Général",
  DAF: "Directeur Admin. & Financier",
  HR: "Responsable RH",
  SECRETARY_GENERAL: "Secrétaire Général",
  TECH_DIRECTOR: "Directeur Technique",
  WORKS_DIRECTOR: "Directeur Travaux",
  WORKS_MANAGER: "Conducteur Travaux",
  SITE_MANAGER: "Chef Chantier",
  ACCOUNTANT: "Comptable",
  LOGISTICS: "Logistique",
  WAREHOUSE: "Magasinier",
  ARCHIVIST: "Archiviste",
  EMPLOYEE: "Employé",
  WORKER: "Ouvrier",
  TENANT_ADMIN: "Administrateur",
};

interface Props {
  conversation: ConversationItem;
  onBack?: () => void;
  /** Si true, démarre automatiquement un appel audio à l'ouverture
   *  (utilisé par les liens externes `/messagerie?call=<userId>`). */
  autoStartCall?: boolean;
  /** Callback appelé une fois l'auto-start consommé (pour reset le flag). */
  onCallStartConsumed?: () => void;
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

export function ConversationView({
  conversation,
  onBack,
  autoStartCall,
  onCallStartConsumed,
}: Props) {
  const { data, isLoading } = useMessages(conversation.id);
  const send = useSendMessage(conversation.id);
  const sendAttachment = useSendAttachment(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [callKind, setCallKind] = useState<"audio" | "video" | null>(null);

  // Scroll to bottom whenever new messages land
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [data?.items.length]);

  // Auto-start d'appel quand le parent passe le flag (lien externe
  // /messagerie?call=<userId> qui veut déclencher l'appel direct).
  useEffect(() => {
    if (autoStartCall && !callKind) {
      setCallKind("audio");
      onCallStartConsumed?.();
    }
  }, [autoStartCall, callKind, onCallStartConsumed]);

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

  const subtitle = conversation.isGroup
    ? `${conversation.otherUsers.length + 1} membres`
    : conversation.otherUsers[0]
      ? ROLE_LABEL[conversation.otherUsers[0].role] ?? conversation.otherUsers[0].role
      : "";

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-primary-500 px-3 py-2.5 text-white">
        {onBack && (
          <button
            onClick={onBack}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/15 md:hidden"
            aria-label="Retour à la liste"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[11.5px] font-semibold text-white ring-2 ring-white/30"
          style={{ background: tone }}
        >
          {headerInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{conversation.name}</div>
          <div className="truncate text-[11px] text-white/75">{subtitle}</div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCallKind("audio")}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15"
            title="Appel audio"
            aria-label="Appel audio"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCallKind("video")}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15"
            title="Appel vidéo"
            aria-label="Appel vidéo"
          >
            <Video className="h-4 w-4" />
          </button>
          <button
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-50"
            disabled
            title="Rechercher dans la conversation (à venir)"
            aria-label="Rechercher"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-50"
            disabled
            title="Plus d'options (à venir)"
            aria-label="Plus d'options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </header>

      {callKind && (
        <CallSimulator
          kind={callKind}
          contactName={conversation.name}
          contactInitials={headerInitials}
          contactColor={tone}
          onHangup={() => setCallKind(null)}
        />
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4 chat-bg"
      >
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
        onSendAttachment={async (input) => {
          await sendAttachment.mutateAsync(input);
        }}
      />
    </div>
  );
}
