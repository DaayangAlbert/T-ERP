import { useDeferredValue, useState } from "react";
import { MessageSquareMore, Phone, Users, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MagasinierHero } from "@/features/magasinier/components/MagasinierHero";
import { MagasinierSection } from "@/features/magasinier/components/MagasinierSection";
import { NotificationsPanel } from "@/features/magasinier/components/NotificationsPanel";
import { CallUI } from "@/features/magasinier/components/chat/CallUI";
import { ChatWindow } from "@/features/magasinier/components/chat/ChatWindow";
import { ConversationList } from "@/features/magasinier/components/chat/ConversationList";
import { GroupInfoPanel } from "@/features/magasinier/components/chat/GroupInfoPanel";
import { useMagasinierWorkspace } from "@/features/magasinier/hooks/useMagasinierWorkspace";

export function MagasinierChatPage() {
  const workspace = useMagasinierWorkspace();
  const [conversationSearch, setConversationSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [groupProjectId, setGroupProjectId] = useState(workspace.workspace.selectedProjectId);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const deferredConversationSearch = useDeferredValue(conversationSearch);
  const deferredMessageSearch = useDeferredValue(messageSearch);

  const filteredConversations = workspace.workspace.conversations.filter((conversation) => {
    const haystack = `${conversation.title} ${conversation.description}`.toLowerCase();
    return haystack.includes(deferredConversationSearch.trim().toLowerCase());
  });

  const filteredMessages = workspace.selectedConversation
    ? workspace.selectedConversation.messages.filter((message) => {
        const haystack = `${message.senderName} ${message.content}`.toLowerCase();
        return haystack.includes(deferredMessageSearch.trim().toLowerCase());
      })
    : [];

  const groupContacts = workspace.workspace.contacts.filter((contact) =>
    contact.projectIds.includes(groupProjectId) || contact.roleCode === "admin"
  );

  const toggleParticipant = (participantId: number) => {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId]
    );
  };

  return (
    <div className="space-y-5">
      <MagasinierHero
        eyebrow="Messagerie instantanee"
        title="Communication ciblee admin et responsables projet"
        description="Conversations privees, groupes limites aux membres autorises du projet, partage de fichiers et demarrage d'appels audio ou video depuis la meme interface."
        stats={[
          { label: "Conversations", value: String(workspace.workspace.conversations.length) },
          { label: "Contacts", value: String(workspace.workspace.contacts.length) },
          { label: "Non lus", value: String(workspace.workspace.conversations.reduce((sum, item) => sum + item.unreadCount, 0)) },
          { label: "Fichiers", value: String(workspace.sharedFiles.length) },
        ]}
        sideContent={<NotificationsPanel items={workspace.workspace.notifications.slice(0, 3)} />}
      />

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="space-y-4">
            <MagasinierSection
              eyebrow="Conversations"
              title="Mes canaux autorises"
              description="WhatsApp-like, mais borne a votre perimetre metier."
              action={<Badge variant="info">{workspace.workspace.conversations.length}</Badge>}
            />
            <ConversationList
              conversations={filteredConversations}
              activeConversationId={workspace.workspace.selectedConversationId}
              search={conversationSearch}
              onSearchChange={setConversationSearch}
              onSelect={workspace.actions.setSelectedConversationId}
            />
          </Card>

          <Card className="space-y-4">
            <MagasinierSection
              eyebrow="Nouveau groupe"
              title="Creer un groupe de discussion"
              description="Seulement avec l'admin et les membres projet autorises."
            />
            <div className="grid gap-3">
              <Input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="Nom du groupe" />
              <select
                value={groupProjectId}
                onChange={(event) => setGroupProjectId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                {workspace.workspace.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
              <div className="space-y-2">
                {groupContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => toggleParticipant(contact.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                      selectedParticipantIds.includes(contact.id)
                        ? "border-slate-950 bg-slate-950 text-white dark:border-teal-400 dark:bg-teal-500 dark:text-slate-950"
                        : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{contact.displayName}</p>
                      <p className="text-xs opacity-80">{contact.roleLabel}</p>
                    </div>
                    <Badge variant={contact.online ? "success" : "neutral"}>{contact.online ? "En ligne" : "Hors ligne"}</Badge>
                  </button>
                ))}
              </div>
              <Button
                className="gap-2"
                onClick={() => {
                  workspace.actions.createGroupConversation({
                    title: groupTitle,
                    projectId: groupProjectId,
                    participantIds: selectedParticipantIds,
                  });
                  setGroupTitle("");
                  setSelectedParticipantIds([]);
                }}
              >
                <Users className="h-4 w-4" />
                Creer le groupe
              </Button>
            </div>
          </Card>
        </div>

        <ChatWindow
          conversation={workspace.selectedConversation}
          messages={filteredMessages}
          messageSearch={messageSearch}
          onMessageSearchChange={setMessageSearch}
          onSend={(content, attachments) =>
            workspace.selectedConversation ? workspace.actions.sendMessage(workspace.selectedConversation.id, content, attachments) : null
          }
          onStartAudioCall={() =>
            workspace.selectedConversation ? workspace.actions.startCall(workspace.selectedConversation.id, "audio") : null
          }
          onStartVideoCall={() =>
            workspace.selectedConversation ? workspace.actions.startCall(workspace.selectedConversation.id, "video") : null
          }
        />

        <div className="space-y-4">
          <GroupInfoPanel conversation={workspace.selectedConversation} sharedFiles={workspace.sharedFiles} />

          <Card className="space-y-4">
            <MagasinierSection
              eyebrow="Acces rapides"
              title="Appels directs"
              description="Les appels restent limites a votre reseau autorise."
            />
            <div className="space-y-2">
              {workspace.workspace.contacts.slice(0, 4).map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{contact.displayName}</p>
                      <p className="text-xs text-slate-500">{contact.roleLabel}</p>
                    </div>
                    <Badge variant={contact.online ? "success" : "neutral"}>{contact.online ? "En ligne" : "Absent"}</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        const directConversation = workspace.workspace.conversations.find((conversation) =>
                          conversation.participantIds.includes(contact.id)
                        );
                        if (directConversation) {
                          workspace.actions.startCall(directConversation.id, "audio");
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
                        const directConversation = workspace.workspace.conversations.find((conversation) =>
                          conversation.participantIds.includes(contact.id)
                        );
                        if (directConversation) {
                          workspace.actions.startCall(directConversation.id, "video");
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
        </div>
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
