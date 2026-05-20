"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { ArrowLeft, BellOff, BellRing, Info, MoreVertical, Phone, Search, Video, X } from "lucide-react";
import {
  useDeleteMessage,
  useMessages,
  useSendAttachment,
  useSendMessage,
  useUpdateConversationSettings,
  type ConversationItem,
} from "@/hooks/useMessaging";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { JitsiCall } from "./JitsiCall";
import { MsgAvatar } from "./MsgAvatar";

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
  /** Nom de l'utilisateur courant (affiché dans l'appel Jitsi). */
  meLabel?: string;
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
  meLabel,
}: Props) {
  const { data, isLoading } = useMessages(conversation.id);
  const send = useSendMessage(conversation.id);
  const sendAttachment = useSendAttachment(conversation.id);
  const deleteMessage = useDeleteMessage(conversation.id);
  const updateSettings = useUpdateConversationSettings(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [callKind, setCallKind] = useState<"audio" | "video" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  // Group messages by day for separators ; filtre si recherche active.
  const allItems = data?.items ?? [];
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((m) => !m.deleted && !m.isSystem && m.content.toLowerCase().includes(q));
  }, [allItems, query]);
  const roomName = `terp-${conversation.id}`;

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
        <MsgAvatar
          url={conversation.isGroup ? conversation.avatarUrl : conversation.otherUsers[0]?.avatarUrl}
          initials={headerInitials}
          color={tone}
          sizeClass="h-9 w-9"
          textClass="text-[11.5px]"
          square={conversation.isGroup}
          ring="ring-2 ring-white/30"
        />
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
            onClick={() => {
              setSearchOpen((v) => {
                if (v) setQuery("");
                return !v;
              });
              setMenuOpen(false);
            }}
            className={clsx(
              "grid h-8 w-8 place-items-center rounded-full hover:bg-white/15",
              searchOpen && "bg-white/20",
            )}
            title="Rechercher dans la conversation"
            aria-label="Rechercher"
          >
            <Search className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={clsx(
                "grid h-8 w-8 place-items-center rounded-full hover:bg-white/15",
                menuOpen && "bg-white/20",
              )}
              title="Plus d'options"
              aria-label="Plus d'options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-9 z-20 w-60 overflow-hidden rounded-lg border border-line bg-white py-1 text-ink shadow-lg">
                  <MenuItem
                    icon={<Info className="h-4 w-4" />}
                    label={conversation.isGroup ? "Infos du groupe" : "Infos du contact"}
                    onClick={() => {
                      setInfoOpen(true);
                      setMenuOpen(false);
                    }}
                  />
                  <MenuItem
                    icon={<Search className="h-4 w-4" />}
                    label="Rechercher"
                    onClick={() => {
                      setSearchOpen(true);
                      setMenuOpen(false);
                    }}
                  />
                  <MenuItem
                    icon={conversation.isMuted ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    label={conversation.isMuted ? "Réactiver le son" : "Couper le son"}
                    onClick={() => {
                      updateSettings.mutate({ isMuted: !conversation.isMuted });
                      setMenuOpen(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-line bg-white px-3 py-2">
          <Search className="h-4 w-4 flex-shrink-0 text-ink-3" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher dans la conversation…"
            className="h-8 flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          {query.trim() && (
            <span className="flex-shrink-0 text-[11px] text-ink-3">
              {items.length} résultat{items.length > 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={() => {
              setSearchOpen(false);
              setQuery("");
            }}
            className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-ink-3 hover:bg-line/60"
            aria-label="Fermer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {infoOpen && (
        <ContactInfoPanel conversation={conversation} subtitle={subtitle} tone={tone} initials={headerInitials} onClose={() => setInfoOpen(false)} />
      )}

      {callKind && (
        <JitsiCall
          kind={callKind}
          roomName={roomName}
          displayName={meLabel ?? "Utilisateur"}
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
            {query.trim()
              ? "Aucun message ne correspond à votre recherche."
              : "Aucun message — soyez le premier à dire bonjour."}
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
                  onDelete={(id) => deleteMessage.mutate(id)}
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

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-alt"
    >
      <span className="text-ink-3">{icon}</span>
      {label}
    </button>
  );
}

function ContactInfoPanel({
  conversation,
  subtitle,
  tone,
  initials,
  onClose,
}: {
  conversation: ConversationItem;
  subtitle: string;
  tone: string;
  initials: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose} role="dialog">
      <div
        className="flex h-full w-full max-w-sm flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line bg-primary-500 px-4 py-3 text-white">
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-[14px] font-semibold">
            {conversation.isGroup ? "Infos du groupe" : "Infos du contact"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 border-b border-line px-4 py-6">
          <MsgAvatar
            url={conversation.isGroup ? conversation.avatarUrl : conversation.otherUsers[0]?.avatarUrl}
            initials={initials}
            color={tone}
            sizeClass="h-20 w-20"
            textClass="text-2xl"
            square={conversation.isGroup}
          />
          <div className="mt-1 text-center">
            <div className="text-[16px] font-semibold text-ink">{conversation.name}</div>
            <div className="text-[12.5px] text-ink-3">{subtitle}</div>
          </div>
        </div>

        {conversation.isGroup && (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              {conversation.otherUsers.length + 1} membres
            </div>
            <ul className="space-y-1.5">
              {conversation.otherUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-2.5">
                  <MsgAvatar
                    url={u.avatarUrl}
                    initials={`${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase()}
                    color={avatarColor(u.id)}
                    sizeClass="h-8 w-8"
                    textClass="text-[10px]"
                  />
                  <span className="text-[13px] text-ink">
                    {u.firstName} {u.lastName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
