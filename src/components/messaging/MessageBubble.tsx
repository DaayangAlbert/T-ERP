"use client";

import { useState } from "react";
import { clsx } from "clsx";
import Image from "next/image";
import { CheckCheck, FileText, Download, X, Ban, Trash2, ChevronDown } from "lucide-react";
import type { MessageItem } from "@/hooks/useMessaging";
import { MsgAvatar } from "./MsgAvatar";

interface Props {
  message: MessageItem;
  showAvatar: boolean;
  showSenderName: boolean;
  isGroup: boolean;
  /** Hex color used for the avatar disc. */
  avatarColor: string;
  /** Supprime le message "pour tout le monde" (uniquement sur ses propres messages). */
  onDelete?: (id: string) => void;
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isImageType(t: string | null): boolean {
  return Boolean(t?.startsWith("image/"));
}
function isAudioType(t: string | null): boolean {
  return Boolean(t?.startsWith("audio/"));
}

/**
 * WhatsApp-style bubble.
 * Affiche selon le type :
 *   - VoiceNote → player audio compact avec durée
 *   - Image → preview cliquable + texte optionnel
 *   - Document → icône + nom + taille + lien téléchargement
 *   - Texte simple → bulle classique
 */
export function MessageBubble({
  message,
  showAvatar,
  showSenderName,
  isGroup,
  avatarColor,
  onDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (message.isSystem) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-ink-3 shadow-sm ring-1 ring-line">
          {message.content}
        </span>
      </div>
    );
  }

  const [lightbox, setLightbox] = useState(false);
  const initials = `${message.sender.firstName.charAt(0)}${message.sender.lastName.charAt(0)}`.toUpperCase();
  const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isMe = message.isMe;
  const canDelete = isMe && !message.deleted;
  const withTail = showSenderName;

  const hasImage = isImageType(message.attachmentType) && message.attachmentUrl;
  const hasAudio = message.voiceNote && message.attachmentUrl;
  const hasDoc = message.attachmentUrl && !hasImage && !hasAudio && !isAudioType(message.attachmentType);
  const hasOnlyAttachment = (hasImage || hasAudio || hasDoc) && (!message.content || message.content === message.attachmentName || message.content === "🎤 Note vocale");

  return (
    <div
      className={clsx(
        "flex items-end gap-1.5",
        isMe ? "justify-end" : "justify-start",
        !showAvatar && !isMe && "ml-9"
      )}
    >
      {!isMe && showAvatar && (
        <MsgAvatar
          url={message.sender.avatarUrl}
          initials={initials}
          color={avatarColor}
          sizeClass="h-7 w-7"
          textClass="text-[10px]"
        />
      )}

      <div className="group relative max-w-[78%]">
        <div
          className={clsx(
            "text-[13px] leading-snug shadow-sm overflow-hidden",
            isMe ? "bg-primary-500 text-white" : "bg-white text-ink ring-1 ring-line",
            isMe
              ? withTail ? "rounded-l-2xl rounded-tr-2xl rounded-br-md" : "rounded-2xl"
              : withTail ? "rounded-r-2xl rounded-tl-md rounded-bl-2xl" : "rounded-2xl",
            hasImage ? "p-1" : "px-3 py-2",
          )}
        >
          {!isMe && isGroup && showSenderName && (
            <div
              className={clsx("text-[10.5px] font-semibold", hasImage ? "px-2 pt-1" : "mb-0.5")}
              style={{ color: avatarColor }}
            >
              {message.sender.firstName} {message.sender.lastName}
            </div>
          )}

          {/* Image attachée — clic = lightbox, bouton = téléchargement */}
          {hasImage && (
            <div className="group relative">
              <button type="button" onClick={() => setLightbox(true)} className="block w-full" title="Agrandir">
                <Image
                  src={message.attachmentUrl!}
                  alt={message.attachmentName ?? ""}
                  width={320}
                  height={240}
                  className="rounded-xl object-cover"
                  unoptimized
                />
              </button>
              <a
                href={message.attachmentUrl!}
                download={message.attachmentName ?? undefined}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/65"
                title="Télécharger"
                aria-label="Télécharger l'image"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Note vocale */}
          {hasAudio && (
            <AudioPlayer
              url={message.attachmentUrl!}
              durationSec={message.voiceNote!.durationSec}
              isMe={isMe}
            />
          )}

          {/* Document (non-image, non-audio) */}
          {hasDoc && (
            <a
              href={message.attachmentUrl!}
              target="_blank"
              rel="noopener"
              download={message.attachmentName ?? undefined}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-2 py-1.5",
                isMe ? "bg-white/15 hover:bg-white/25" : "bg-surface-alt hover:bg-line/60",
              )}
            >
              <FileText className={clsx("h-7 w-7 flex-shrink-0", isMe ? "text-white" : "text-primary-600")} />
              <div className="min-w-0 flex-1">
                <div className={clsx("truncate text-[12.5px] font-medium", isMe ? "text-white" : "text-ink")}>
                  {message.attachmentName ?? "Document"}
                </div>
                <div className={clsx("text-[10.5px]", isMe ? "text-white/75" : "text-ink-3")}>
                  {fmtSize(message.attachmentSize)}
                </div>
              </div>
              <Download className={clsx("h-4 w-4 flex-shrink-0", isMe ? "text-white/80" : "text-ink-3")} />
            </a>
          )}

          {/* Message supprimé : tombstone */}
          {message.deleted && (
            <p className={clsx("flex items-center gap-1.5 italic", isMe ? "text-white/75" : "text-ink-3")}>
              <Ban className="h-3.5 w-3.5" /> Message supprimé
            </p>
          )}

          {/* Texte (sauf si c'est juste le nom du fichier ou "🎤 Note vocale") */}
          {!message.deleted && !hasOnlyAttachment && message.content && (
            <p className={clsx("whitespace-pre-line break-words", hasImage && "px-2 pt-1")}>
              {message.content}
            </p>
          )}

          <div
            className={clsx(
              "flex items-center justify-end gap-1 text-[10px]",
              isMe ? "text-white/75" : "text-ink-3",
              hasImage ? "px-2 pb-1" : "mt-1",
            )}
          >
            <span>{time}</span>
            {isMe && <CheckCheck className="h-3 w-3" aria-label="Envoyé" />}
          </div>
        </div>

        {withTail && (
          <svg
            aria-hidden
            viewBox="0 0 8 12"
            className={clsx(
              "absolute bottom-0 h-3 w-2",
              isMe ? "right-[-6px] text-primary-500" : "left-[-6px] -scale-x-100 text-white"
            )}
          >
            <path d="M0 0 C 0 8 4 12 8 12 L 0 12 Z" fill="currentColor" />
          </svg>
        )}

        {/* Menu (suppression) — uniquement sur ses propres messages */}
        {canDelete && onDelete && (
          <div className="absolute right-1 top-1 z-10">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-5 w-5 place-items-center rounded-full bg-black/15 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/35"
              aria-label="Options du message"
              title="Options"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-6 z-20 w-56 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      if (window.confirm("Supprimer ce message pour tout le monde ?")) {
                        onDelete(message.id);
                      }
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer pour tout le monde
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Lightbox plein écran pour les images */}
      {lightbox && hasImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-label="Aperçu de l'image"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.attachmentUrl!}
            alt={message.attachmentName ?? ""}
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={message.attachmentUrl!}
            download={message.attachmentName ?? undefined}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30"
            title="Télécharger"
            aria-label="Télécharger l'image"
          >
            <Download className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30"
            title="Fermer"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Player audio compact (style WhatsApp) pour les notes vocales
// ════════════════════════════════════════════════════════════════════════

function AudioPlayer({ url, durationSec, isMe }: { url: string; durationSec: number; isMe: boolean }) {
  return (
    <audio
      src={url}
      controls
      preload="metadata"
      className={clsx("w-[260px] max-w-full", isMe && "filter invert")}
      style={{ height: 32 }}
      aria-label={`Note vocale de ${fmtDuration(durationSec)}`}
    />
  );
}
