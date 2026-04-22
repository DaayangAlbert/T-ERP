import { Clock3, Phone, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MagasinierHero } from "@/features/magasinier/components/MagasinierHero";
import { MagasinierSection } from "@/features/magasinier/components/MagasinierSection";
import { ResponsiveDataTable } from "@/features/magasinier/components/ResponsiveDataTable";
import { CallUI } from "@/features/magasinier/components/chat/CallUI";
import { useMagasinierWorkspace } from "@/features/magasinier/hooks/useMagasinierWorkspace";
import { formatDateTime } from "@/features/magasinier/utils/format";

export function MagasinierCallsPage() {
  const workspace = useMagasinierWorkspace();

  return (
    <div className="space-y-5">
      <MagasinierHero
        eyebrow="Appels temps reel"
        title="Audio et video dans le perimetre magasinier"
        description="Le frontend est deja structure pour brancher plus tard WebSocket, Socket.io et WebRTC, tout en gardant des restrictions strictes sur les interlocuteurs autorises."
        stats={[
          { label: "Historique", value: String(workspace.workspace.callHistory.length) },
          { label: "Contacts", value: String(workspace.workspace.contacts.length) },
          { label: "Prives", value: String(workspace.workspace.conversations.filter((item) => item.kind === "private").length) },
          { label: "Groupes", value: String(workspace.workspace.conversations.filter((item) => item.kind === "group").length) },
        ]}
        sideContent={
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Rappel de securite</p>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Aucun appel vers des utilisateurs hors admin et responsables projet affectes n'apparait dans cette vue.
            </p>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="space-y-4">
          <MagasinierSection
            eyebrow="Lancer un appel"
            title="Contacts disponibles"
            description="Acces direct aux interlocuteurs deja scopes dans votre messagerie."
          />
          <div className="space-y-3">
            {workspace.workspace.contacts.map((contact) => (
              <div
                key={contact.id}
                className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{contact.displayName}</p>
                    <p className="text-sm text-slate-500">{contact.roleLabel}</p>
                  </div>
                  <Badge variant={contact.online ? "success" : "neutral"}>{contact.online ? "En ligne" : "Absent"}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const conversation = workspace.workspace.conversations.find((item) =>
                        item.participantIds.includes(contact.id)
                      );
                      if (conversation) {
                        workspace.actions.startCall(conversation.id, "audio");
                      }
                    }}
                  >
                    <Phone className="h-4 w-4" />
                    Audio
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const conversation = workspace.workspace.conversations.find((item) =>
                        item.participantIds.includes(contact.id)
                      );
                      if (conversation) {
                        workspace.actions.startCall(conversation.id, "video");
                      }
                    }}
                  >
                    <Video className="h-4 w-4" />
                    Video
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <MagasinierSection
            eyebrow="Historique recent"
            title="Sessions d'appel"
            description="Statuts previsibles pour une future integration temps reel complete."
            action={<Badge variant="info">{workspace.workspace.callHistory.length}</Badge>}
          />
          <ResponsiveDataTable
            rows={workspace.workspace.callHistory}
            emptyText="Aucun appel historise."
            columns={[
              {
                key: "titre",
                header: "Session",
                render: (call) => (
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{call.title}</p>
                    <p className="text-xs text-slate-500">{call.mode}</p>
                  </div>
                ),
              },
              {
                key: "participants",
                header: "Participants",
                render: (call) => call.participants.map((participant) => participant.displayName).join(", "),
              },
              {
                key: "etat",
                header: "Etat",
                render: (call) => <Badge variant={call.status === "ended" ? "success" : call.status === "missed" ? "warning" : "info"}>{call.status}</Badge>,
              },
              {
                key: "horodatage",
                header: "Horodatage",
                render: (call) => (
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    {formatDateTime(call.startedAt)}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <CallUI
        call={workspace.workspace.activeCall}
        onAnswer={workspace.actions.answerCall}
        onToggleMic={workspace.actions.toggleMic}
        onToggleCamera={workspace.actions.toggleCamera}
        onEnd={workspace.actions.endCall}
      />
    </div>
  );
}
