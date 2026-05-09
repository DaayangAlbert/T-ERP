"use client";

import { Mic } from "lucide-react";

interface Props {
  conversationId: string;
}

// Placeholder UI : enregistrement réel via MediaRecorder en V2.
export function VoiceNoteRecorder({ conversationId }: Props) {
  void conversationId;
  return (
    <button
      type="button"
      disabled
      title="Enregistrement vocal — disponible en V2"
      className="grid h-9 w-9 place-items-center rounded-md border border-dashed border-line-2 text-ink-3 disabled:cursor-not-allowed"
    >
      <Mic className="h-4 w-4" />
    </button>
  );
}
