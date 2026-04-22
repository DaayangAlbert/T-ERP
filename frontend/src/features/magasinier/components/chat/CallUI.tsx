import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CallSession } from "@/features/magasinier/types";

interface CallUIProps {
  call: CallSession | null;
  onAnswer: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onEnd: (status?: "ended" | "missed" | "rejected") => void;
}

export function CallUI({ call, onAnswer, onToggleMic, onToggleCamera, onEnd }: CallUIProps) {
  if (!call) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.3),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(15,23,42,0.97))] px-5 py-6 text-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/65">Appel en cours</p>
              <h3 className="mt-2 text-2xl font-semibold">{call.title}</h3>
              <p className="mt-1 text-sm text-white/70">{call.participants.length} participants autorises</p>
            </div>
            <Badge variant={call.status === "active" ? "success" : "warning"}>
              {call.status === "active" ? "Actif" : "Sonnerie"}
            </Badge>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {call.participants.map((participant) => (
              <div key={participant.id} className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-base font-semibold">{participant.displayName}</p>
                <p className="mt-1 text-sm text-white/70">{participant.roleLabel}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {call.status !== "active" ? (
              <Button className="gap-2" onClick={onAnswer}>
                Repondre
              </Button>
            ) : null}
            <Button variant="outline" className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={onToggleMic}>
              {call.micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {call.micEnabled ? "Couper micro" : "Activer micro"}
            </Button>
            {call.mode === "video" ? (
              <Button variant="outline" className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={onToggleCamera}>
                {call.cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                {call.cameraEnabled ? "Couper camera" : "Activer camera"}
              </Button>
            ) : null}
            <Button className="gap-2 bg-rose-600 hover:bg-rose-700" onClick={() => onEnd(call.status === "active" ? "ended" : "rejected")}>
              <PhoneOff className="h-4 w-4" />
              Terminer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
