"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Smile } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function Composer({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [value]);

  const submit = async () => {
    const content = value.trim();
    if (!content || sending || disabled) return;
    setSending(true);
    try {
      await onSend(content);
      setValue("");
    } catch {
      // error surfaced by mutation hook in parent
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t border-line bg-white p-3"
    >
      <button
        type="button"
        disabled
        title="Pièce jointe (J6+)"
        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md text-ink-3 hover:bg-surface-alt disabled:opacity-50"
      >
        <Paperclip className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled
        title="Émoji (J6+)"
        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md text-ink-3 hover:bg-surface-alt disabled:opacity-50"
      >
        <Smile className="h-4 w-4" />
      </button>

      <textarea
        ref={taRef}
        value={value}
        aria-label="Écrire un message"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={disabled ? "Sélectionnez une conversation" : "Écrire un message…"}
        disabled={disabled}
        rows={1}
        className={clsx(
          "flex-1 resize-none rounded-md border border-line bg-surface-alt px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary-300",
          "max-h-40 min-h-[36px]"
        )}
      />

      <button
        type="submit"
        disabled={!value.trim() || sending || disabled}
        className={clsx(
          "grid h-9 w-9 flex-shrink-0 place-items-center rounded-md text-white transition",
          value.trim() && !disabled
            ? "bg-primary-500 hover:bg-primary-600 hover:shadow-brand"
            : "bg-primary-500/40 cursor-not-allowed"
        )}
        aria-label="Envoyer"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
