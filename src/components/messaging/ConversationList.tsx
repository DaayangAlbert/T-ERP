"use client";

import { Search, Pin, BellOff } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import type { ConversationItem } from "@/hooks/useMessaging";

interface Props {
  items: ConversationItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

const TONES = ["#2A1B3D", "#0F766E", "#9F580A", "#7C3AED", "#7C2D12", "#9333EA"];

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return TONES[Math.abs(hash) % TONES.length];
}

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return formatDistanceToNowStrict(d, { locale: fr });
}

type FilterTab = "all" | "unread" | "groups";

export function ConversationList({ items, activeId, onSelect, loading }: Props) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  const filtered = items.filter((c) => {
    if (tab === "unread" && c.unread === 0) return false;
    if (tab === "groups" && !c.isGroup) return false;
    if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-line p-3">
        <div className="flex items-center gap-2 rounded-md border border-line bg-surface-alt px-3">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            type="search"
            placeholder="Rechercher une conversation…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-md bg-surface-alt p-1">
          <Tab active={tab === "all"} onClick={() => setTab("all")}>
            Tous
          </Tab>
          <Tab active={tab === "unread"} onClick={() => setTab("unread")}>
            Non lus
          </Tab>
          <Tab active={tab === "groups"} onClick={() => setTab("groups")}>
            Groupes
          </Tab>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <ul className="divide-y divide-line">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-surface-alt" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-surface-alt" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-alt" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && filtered.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-ink-3">Aucune conversation.</p>
        )}

        <ul className="divide-y divide-line">
          {filtered.map((conv) => {
            const initials = conv.isGroup
              ? conv.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((s) => s.charAt(0).toUpperCase())
                  .join("")
                  .slice(0, 2)
              : conv.otherUsers[0]
                ? `${conv.otherUsers[0].firstName.charAt(0)}${conv.otherUsers[0].lastName.charAt(0)}`.toUpperCase()
                : "??";
            const tone = avatarColor(conv.id);
            const isActive = conv.id === activeId;
            const isUnread = conv.unread > 0;
            return (
              <li key={conv.id}>
                <button
                  onClick={() => onSelect(conv.id)}
                  className={clsx(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                    isActive ? "bg-primary-50" : "hover:bg-surface-alt"
                  )}
                >
                  <div
                    className={clsx(
                      "grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white",
                      conv.isGroup && "rounded-md"
                    )}
                    style={{ background: tone }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={clsx("truncate text-[13px]", isUnread ? "font-semibold text-ink" : "font-medium text-ink")}>
                        {conv.name}
                      </span>
                      <span className="flex-shrink-0 text-[10.5px] text-ink-3">
                        {timeLabel(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={clsx(
                          "truncate text-[11.5px]",
                          isUnread ? "text-ink-2 font-medium" : "text-ink-3"
                        )}
                      >
                        {conv.lastMessage
                          ? conv.lastMessage.isMe
                            ? `Vous : ${conv.lastMessage.content}`
                            : conv.isGroup
                              ? `${conv.lastMessage.senderName} : ${conv.lastMessage.content}`
                              : conv.lastMessage.content
                          : "Pas encore de message"}
                      </span>
                      <span className="flex flex-shrink-0 items-center gap-1.5">
                        {conv.isMuted && <BellOff className="h-3 w-3 text-ink-4" />}
                        {conv.isPinned && <Pin className="h-3 w-3 text-ink-4" />}
                        {isUnread && (
                          <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-primary-500 px-1 text-[9.5px] font-semibold text-white">
                            {conv.unread > 99 ? "99+" : conv.unread}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded text-[12px] font-medium transition h-7",
        active ? "bg-white text-ink shadow-card" : "bg-transparent text-ink-3 hover:text-ink-2"
      )}
    >
      {children}
    </button>
  );
}
