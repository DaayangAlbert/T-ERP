"use client";

import { clsx } from "clsx";
import { Check, CheckCheck } from "lucide-react";
import type { MessageItem } from "@/hooks/useMessaging";

interface Props {
  message: MessageItem;
  showAvatar: boolean;
  showSenderName: boolean;
  isGroup: boolean;
  /** Hex color used for the avatar disc. */
  avatarColor: string;
}

export function MessageBubble({ message, showAvatar, showSenderName, isGroup, avatarColor }: Props) {
  if (message.isSystem) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] text-ink-3">
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

  return (
    <div
      className={clsx(
        "flex items-end gap-1.5",
        message.isMe ? "justify-end" : "justify-start",
        !showAvatar && "ml-9"
      )}
    >
      {!message.isMe && showAvatar && (
        <div
          className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
          style={{ background: avatarColor }}
        >
          {initials}
        </div>
      )}

      <div
        className={clsx(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug shadow-sm",
          message.isMe
            ? "bg-primary-500 text-white rounded-br-sm"
            : "bg-white text-ink ring-1 ring-line rounded-bl-sm"
        )}
      >
        {!message.isMe && isGroup && showSenderName && (
          <div
            className="mb-0.5 text-[10.5px] font-semibold"
            style={{ color: avatarColor }}
          >
            {message.sender.firstName} {message.sender.lastName}
          </div>
        )}
        <p className="whitespace-pre-line break-words">{message.content}</p>
        <div
          className={clsx(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            message.isMe ? "text-white/75" : "text-ink-3"
          )}
        >
          {time}
          {message.isMe && <CheckCheck className="h-3 w-3" />}
        </div>
      </div>
    </div>
  );
}
