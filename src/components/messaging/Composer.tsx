"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Paperclip, Send, Smile, Square, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { EmojiPicker } from "./EmojiPicker";

interface Props {
  onSend: (content: string) => Promise<void>;
  onSendAttachment?: (input: { file: File; kind?: "voice"; duration?: number }) => Promise<void>;
  disabled?: boolean;
}

const ALLOWED_ACCEPT = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "application/pdf",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv",
].join(",");

/**
 * Composer : zone de saisie d'un message.
 *
 * Fonctionnalités :
 *   - Texte avec auto-resize
 *   - Émoji : picker popover (150+ emojis catégorisés) inséré au curseur
 *   - Pièce jointe : input file → upload réel vers /api/conversations/[id]/attachments
 *   - Note vocale : MediaRecorder API (clic micro pour démarrer, clic Stop pour envoyer)
 *
 * Le bouton final change selon l'état :
 *   - Texte rempli → Send (envoie le message)
 *   - Recording → Stop (arrête + upload audio)
 *   - Vide → Micro (démarre l'enregistrement)
 */
export function Composer({ onSend, onSendAttachment, disabled }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ─── Recording (MediaRecorder) ───
  const [recording, setRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef<number>(0);
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [value]);

  // Auto-hide upload error
  useEffect(() => {
    if (!uploadError) return;
    const t = setTimeout(() => setUploadError(null), 4000);
    return () => clearTimeout(t);
  }, [uploadError]);

  const submit = async () => {
    const content = value.trim();
    if (!content || sending || disabled) return;
    setSending(true);
    setUploadError(null);
    try {
      await onSend(content);
      setValue("");
    } catch (e) {
      // Surface l'erreur dans le bandeau au-dessus du composer (idem upload)
      // pour que l'utilisateur sache pourquoi l'envoi a échoué.
      setUploadError((e as Error).message || "Envoi échoué");
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  };

  const insertEmoji = (emoji: string) => {
    const ta = taRef.current;
    if (!ta) return setValue((v) => v + emoji);
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    // Restaure le curseur après l'emoji inséré
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  // ─── Pièce jointe ───
  const handleFile = async (file: File) => {
    if (!onSendAttachment) return;
    setUploading(true);
    setUploadError(null);
    try {
      await onSendAttachment({ file });
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // ─── Note vocale ───
  const startRecording = async () => {
    if (!onSendAttachment) return;
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
        MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" :
        MediaRecorder.isTypeSupported("audio/ogg") ? "audio/ogg" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      mediaRecorderRef.current = rec;
      recStartRef.current = Date.now();
      setRecording(true);
      setRecDuration(0);
      recIntervalRef.current = setInterval(() => {
        setRecDuration(Math.floor((Date.now() - recStartRef.current) / 1000));
      }, 250);
    } catch (e) {
      setUploadError("Accès microphone refusé : " + (e as Error).message);
    }
  };

  const stopAndSend = async () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    const duration = Math.max(1, Math.floor((Date.now() - recStartRef.current) / 1000));
    if (recIntervalRef.current) clearInterval(recIntervalRef.current);

    await new Promise<void>((resolve) => {
      rec.onstop = () => {
        rec.stream.getTracks().forEach((t) => t.stop());
        resolve();
      };
      rec.stop();
    });

    const mime = rec.mimeType || "audio/webm";
    const ext = mime.includes("ogg") ? "ogg" : "webm";
    const blob = new Blob(audioChunksRef.current, { type: mime });
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mime });

    setRecording(false);
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    if (!onSendAttachment) return;
    setUploading(true);
    try {
      await onSendAttachment({ file, kind: "voice", duration });
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const cancelRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
      rec.stream.getTracks().forEach((t) => t.stop());
    }
    if (recIntervalRef.current) clearInterval(recIntervalRef.current);
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecDuration(0);
  };

  const hasContent = value.trim().length > 0;

  // ─── Mode enregistrement : barre dédiée ───
  if (recording) {
    return (
      <div className="flex items-center gap-2 border-t border-line bg-surface-alt px-3 py-2">
        <button
          type="button"
          onClick={cancelRecording}
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-rose-600 hover:bg-rose-50"
          aria-label="Annuler"
          title="Annuler"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
          <span className="grid h-2.5 w-2.5 place-items-center">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
          </span>
          <span className="text-[13px] font-medium text-ink">Enregistrement en cours…</span>
          <span className="ml-auto font-mono text-[13px] tabular-nums text-ink-2">
            {Math.floor(recDuration / 60)}:{String(recDuration % 60).padStart(2, "0")}
          </span>
        </div>
        <button
          type="button"
          onClick={stopAndSend}
          disabled={uploading}
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary-500 text-white shadow-sm hover:bg-primary-600 disabled:opacity-50"
          aria-label="Stopper et envoyer"
          title="Envoyer"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Square className="h-4 w-4" fill="currentColor" />}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative flex items-end gap-1.5 border-t border-line bg-surface-alt px-2 py-2"
    >
      {/* Erreur upload (overlay) */}
      {uploadError && (
        <div className="absolute inset-x-2 bottom-full mb-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11.5px] text-rose-800 shadow">
          {uploadError}
        </div>
      )}

      {/* Emoji */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          aria-label="Émoji"
          title="Émoji"
          className={clsx(
            "grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-ink-3 hover:bg-line/60",
            showEmoji && "bg-line/60 text-primary-700",
          )}
        >
          <Smile className="h-5 w-5" />
        </button>
        {showEmoji && (
          <EmojiPicker
            onPick={(e) => {
              insertEmoji(e);
            }}
            onClose={() => setShowEmoji(false)}
          />
        )}
      </div>

      {/* Pièce jointe */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || !onSendAttachment}
        aria-label="Pièce jointe"
        title="Pièce jointe"
        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-ink-3 hover:bg-line/60 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {/* Textarea */}
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
        placeholder={disabled ? "Sélectionnez une conversation" : "Écrire un message"}
        disabled={disabled}
        rows={1}
        className={clsx(
          "flex-1 resize-none rounded-3xl border border-line bg-white px-4 py-2 text-[13.5px] text-ink placeholder:text-ink-3 focus:border-primary-300 focus:outline-none",
          "max-h-40 min-h-[40px]"
        )}
      />

      {/* Bouton Send ou Mic */}
      {hasContent ? (
        <button
          type="submit"
          disabled={sending || disabled}
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary-500 text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-50"
          aria-label="Envoyer le message"
          title="Envoyer"
        >
          <Send className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          disabled={!onSendAttachment || disabled}
          aria-label="Enregistrer une note vocale"
          title="Maintenir pour enregistrer"
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary-500 text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-60"
        >
          <Mic className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
