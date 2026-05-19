"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { CheckCheck, FileText, Download } from "lucide-react";
import type { MessageItem } from "@/hooks/useMessaging";

interface Props {
  message: MessageItem;
  showAvatar: boolean;
  showSenderName: boolean;
  isGroup: boolean;
  /** Hex color used for the avatar disc. */
  avatarColor: string;
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
}: Props) {
  if (message.isSystem) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-ink-3 shadow-sm ring-1 ring-line">
          {message.content}
        </span>
      </div>
    );
  }

  const initials = `${message.sender.firstName.charAt(0)}${message.sender.lastName.charAt(0)}`.toUpperCase();
  const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isMe = message.isMe;
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
        <div
          className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
          style={{ background: avatarColor }}
        >
          {initials}
        </div>
      )}

      <div className="relative max-w-[78%]">
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

          {/* Image attachée */}
          {hasImage && (
            <a href={message.attachmentUrl!} target="_blank" rel="noopener" className="block">
              <Image
                src={message.attachmentUrl!}
                alt={message.attachmentName ?? ""}
                width={320}
                height={240}
                className="rounded-xl object-cover"
                unoptimized
              />
            </a>
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

          {/* Texte (sauf si c'est juste le nom du fichier ou "🎤 Note vocale") */}
          {!hasOnlyAttachment && message.content && (
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
      </div>
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
