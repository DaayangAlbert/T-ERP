import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Image as ImageIcon, Mic, Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthContext";
import { getStoredAccessToken } from "@/features/auth/authStorage";
import { httpClient } from "@/shared/api/httpClient";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { socket } from "@/shared/realtime/socketClient";

function formatTimestamp(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function conversationLabel(conversation, currentUserId) {
  const participants = conversation?.participants || [];
  if (conversation?.type === "group") {
    return conversation?.title || `Groupe #${conversation?.id}`;
  }

  const target = participants.find((participant) => participant.id !== currentUserId);
  return target?.display_name || conversation?.title || `Conversation #${conversation?.id}`;
}

function conversationMeta(conversation) {
  const participants = conversation?.participants || [];
  if (conversation?.type === "group") {
    return `${participants.length} participants`;
  }
  const peer = participants[0];
  return peer?.job_title || peer?.department || "Conversation privee";
}

function stripApiPrefix(url) {
  return String(url || "").replace(/^\/api\/v1/, "");
}

function isAudioAttachment(filename) {
  return /\.(webm|ogg|mp3|wav|m4a)$/i.test(String(filename || ""));
}

function isImageAttachment(filename) {
  return /\.(png|jpe?g|gif|webp)$/i.test(String(filename || ""));
}

function getMessagePreview(message) {
  if (!message) {
    return "Aucun message";
  }

  if (message.content) {
    return message.content;
  }

  if (isAudioAttachment(message.attachment_name)) {
    return "Message vocal";
  }

  if (message.attachment_url) {
    return "Piece jointe";
  }

  return "Aucun message";
}

function MessageAttachment({ attachmentUrl, attachmentName }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const isAudio = isAudioAttachment(attachmentName);
  const isImage = isImageAttachment(attachmentName);
  const isMedia = isAudio || isImage;

  useEffect(() => {
    let cancelled = false;
    let localUrl = null;

    async function fetchAttachment() {
      if (!attachmentUrl || !isMedia) {
        setObjectUrl("");
        return;
      }

      setLoading(true);
      try {
        const response = await httpClient.get(stripApiPrefix(attachmentUrl), { responseType: "blob" });
        if (cancelled) {
          return;
        }
        localUrl = window.URL.createObjectURL(response.data);
        setObjectUrl(localUrl);
      } catch {
        if (!cancelled) {
          setObjectUrl("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAttachment();

    return () => {
      cancelled = true;
      if (localUrl) {
        window.URL.revokeObjectURL(localUrl);
      }
    };
  }, [attachmentUrl, isMedia]);

  const downloadAttachment = async () => {
    if (!attachmentUrl) {
      return;
    }
    const response = await httpClient.get(stripApiPrefix(attachmentUrl), { responseType: "blob" });
    const localUrl = window.URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = localUrl;
    anchor.download = attachmentName || "piece-jointe";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(localUrl);
  };

  if (isAudio) {
    return (
      <div className="mt-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-current/20 bg-white/10">
            <Mic className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            {loading ? <p className="text-[11px] opacity-80">Chargement...</p> : null}
            {objectUrl ? <audio className="w-full" controls src={objectUrl} /> : null}
          </div>
          <Button className="h-9 w-9 rounded-full p-0" type="button" variant="outline" onClick={downloadAttachment} title="Telecharger">
            <Download className="h-4 w-4" />
            <span className="sr-only">Telecharger</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-current/20 bg-white/10">
            {isImage ? <ImageIcon className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
          </span>
          <p className="truncate font-medium">{attachmentName || "Piece jointe"}</p>
        </div>
        <Button className="h-8 w-8 rounded-full p-0" type="button" variant="outline" onClick={downloadAttachment} title="Telecharger">
          <Download className="h-4 w-4" />
          <span className="sr-only">Telecharger</span>
        </Button>
      </div>
      {loading ? <p className="mt-2 opacity-80">Chargement...</p> : null}
      {isImage && objectUrl ? <img className="mt-2 max-h-56 rounded-xl object-cover" src={objectUrl} alt={attachmentName || "Piece jointe"} /> : null}
    </div>
  );
}

export function ChatPage() {
  const navigate = useNavigate();
  const { user, tenantId } = useAuth();
  const { mutate, loading: mutating } = useApiMutation();
  const { mutate: markReadMutate } = useApiMutation();

  const {
    data: conversationsData,
    loading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useApiQuery("/chat/conversations");

  const {
    data: contactsData,
    loading: contactsLoading,
    error: contactsError,
  } = useApiQuery("/chat/contacts", { params: { limit: 200 } });

  const [activeConversationId, setActiveConversationId] = useState(null);
  const [contactSearch, setContactSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [chatError, setChatError] = useState("");
  const [recordingVoice, setRecordingVoice] = useState(false);
  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const recorderChunksRef = useRef([]);
  const lastMarkedReadKeyRef = useRef("");

  const conversations = useMemo(() => conversationsData?.items || [], [conversationsData]);
  const contacts = useMemo(() => contactsData?.items || [], [contactsData]);
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const {
    data: messagesData,
    loading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages,
  } = useApiQuery(
    activeConversationId ? `/chat/conversations/${activeConversationId}/messages` : "/chat/conversations/0/messages",
    { enabled: Boolean(activeConversationId) }
  );

  const filteredContacts = useMemo(() => {
    const search = contactSearch.trim().toLowerCase();
    if (!search) {
      return contacts;
    }
    return contacts.filter((contact) => {
      const haystack = [contact.display_name, contact.email, contact.job_title, contact.department]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [contacts, contactSearch]);

  const adminContacts = useMemo(() => contacts.filter((contact) => contact.is_admin).slice(0, 4), [contacts]);
  const selectedGroupContacts = useMemo(
    () => contacts.filter((contact) => selectedGroupMembers.includes(contact.id)),
    [contacts, selectedGroupMembers]
  );
  const messages = messagesData?.items || [];
  const conversationCount = conversations.length;
  const unreadTotal = conversations.reduce((total, conversation) => total + Number(conversation.unread_count || 0), 0);
  const activeConversationUnreadCount = Number(activeConversation?.unread_count || 0);

  useEffect(() => {
    if (!activeConversationId && conversations.length) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      return undefined;
    }

    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }

    const onRealtimeUpdate = async (payload) => {
      const conversationId = Number(payload?.conversation_id);
      await refetchConversations();
      if (activeConversationId && conversationId === activeConversationId) {
        await refetchMessages();
      }
    };

    socket.on("chat:message", onRealtimeUpdate);
    socket.on("chat:notification", onRealtimeUpdate);

    return () => {
      socket.off("chat:message", onRealtimeUpdate);
      socket.off("chat:notification", onRealtimeUpdate);
    };
  }, [activeConversationId, refetchConversations, refetchMessages]);

  useEffect(() => {
    if (!activeConversationId || !socket.connected) {
      return undefined;
    }

    socket.emit("chat:join", { conversation_id: activeConversationId });
    return () => {
      socket.emit("chat:leave", { conversation_id: activeConversationId });
    };
  }, [activeConversationId]);

  useEffect(() => () => {
    recorderStreamRef.current?.getTracks()?.forEach((track) => track.stop());
    recorderStreamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => {
    lastMarkedReadKeyRef.current = "";
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId || !messages.length || activeConversationUnreadCount <= 0) {
      return undefined;
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.id) {
      return undefined;
    }
    if (Number(lastMessage.sender_user_id) === Number(user?.id)) {
      return undefined;
    }

    const readKey = `${activeConversationId}:${lastMessage.id}:${activeConversationUnreadCount}`;
    if (lastMarkedReadKeyRef.current === readKey) {
      return undefined;
    }
    lastMarkedReadKeyRef.current = readKey;

    let cancelled = false;

    async function markRead() {
      try {
        await markReadMutate({
          method: "post",
          url: `/chat/conversations/${activeConversationId}/read`,
          data: { until_message_id: lastMessage.id, company_id: tenantId || undefined },
        });
        if (!cancelled) {
          await refetchConversations();
        }
      } catch {
        if (!cancelled) {
          lastMarkedReadKeyRef.current = "";
        }
        // Read indicators should not block messaging.
      }
    }

    void markRead();

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, activeConversationUnreadCount, markReadMutate, messages, refetchConversations, tenantId, user?.id]);

  const openConversationWithContact = async (contact) => {
    setChatError("");
    try {
      if (contact.existing_conversation_id) {
        setActiveConversationId(contact.existing_conversation_id);
        return;
      }

      const response = await mutate({
        method: "post",
        url: "/chat/conversations",
        data: {
          type: "private",
          participant_ids: [contact.id],
          company_id: tenantId || undefined,
        },
      });

      await refetchConversations();
      if (response?.conversation?.id) {
        setActiveConversationId(response.conversation.id);
      }
    } catch (error) {
      setChatError(error?.response?.data?.message || "Impossible d'ouvrir la conversation.");
    }
  };

  const toggleGroupMember = (contactId) => {
    setSelectedGroupMembers((current) =>
      current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId]
    );
  };

  const createGroupConversation = async () => {
    if (selectedGroupMembers.length < 2) {
      setChatError("Choisissez au moins deux participants pour creer un groupe.");
      return;
    }

    setChatError("");
    try {
      const response = await mutate({
        method: "post",
        url: "/chat/conversations",
        data: {
          type: "group",
          title: groupTitle.trim() || undefined,
          participant_ids: selectedGroupMembers,
          company_id: tenantId || undefined,
        },
      });

      setGroupTitle("");
      setSelectedGroupMembers([]);
      await refetchConversations();
      if (response?.conversation?.id) {
        setActiveConversationId(response.conversation.id);
      }
    } catch (error) {
      setChatError(error?.response?.data?.message || "Creation du groupe impossible.");
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!activeConversationId || !messageText.trim()) {
      return;
    }

    setChatError("");
    try {
      await mutate({
        method: "post",
        url: `/chat/conversations/${activeConversationId}/messages`,
        data: {
          message_type: "text",
          content: messageText.trim(),
          company_id: tenantId || undefined,
        },
      });
      setMessageText("");
      await Promise.all([refetchMessages(), refetchConversations()]);
    } catch (error) {
      setChatError(error?.response?.data?.message || "Envoi du message impossible.");
    }
  };

  const sendAttachmentMessage = async (file, fallbackContent) => {
    if (!activeConversationId || !file) {
      return;
    }

    setChatError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await httpClient.post(`/chat/conversations/${activeConversationId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        params: { company_id: tenantId || undefined },
      });

      const attachment = uploadResponse.data?.data || {};
      await mutate({
        method: "post",
        url: `/chat/conversations/${activeConversationId}/messages`,
        data: {
          message_type: "file",
          content: fallbackContent || attachment.attachment_name || file.name || "Piece jointe",
          attachment_url: attachment.attachment_url,
          company_id: tenantId || undefined,
        },
      });
      await Promise.all([refetchMessages(), refetchConversations()]);
    } catch (error) {
      setChatError(error?.response?.data?.message || "Envoi de la piece jointe impossible.");
    }
  };

  const handleFileSelection = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }
    await sendAttachmentMessage(selectedFile);
    event.target.value = "";
  };

  const startVoiceRecording = async () => {
    if (!activeConversationId || recordingVoice) {
      return;
    }

    setChatError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderChunksRef.current = [];
      recorderStreamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          recorderChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp3") ? "mp3" : "webm";
        const voiceFile = new File(recorderChunksRef.current, `message-vocal-${Date.now()}.${extension}`, { type: mimeType });
        recorderStreamRef.current?.getTracks()?.forEach((track) => track.stop());
        recorderStreamRef.current = null;
        recorderRef.current = null;
        setRecordingVoice(false);
        if (voiceFile.size > 0) {
          await sendAttachmentMessage(voiceFile, "Message vocal");
        }
      };
      recorder.start();
      setRecordingVoice(true);
    } catch (error) {
      setChatError(error?.message || "Impossible d'acceder au microphone.");
    }
  };

  const stopVoiceRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const startCall = async (callType) => {
    if (!activeConversation) {
      return;
    }

    const participantIds = (activeConversation.participants || [])
      .map((participant) => participant.id)
      .filter((participantId) => participantId !== user?.id);

    if (!participantIds.length) {
      setChatError("Aucun participant disponible pour lancer un appel.");
      return;
    }

    setChatError("");
    try {
      await mutate({
        method: "post",
        url: "/calls",
        data: {
          call_type: callType,
          participant_ids: participantIds,
          conversation_id: activeConversation.id,
          company_id: tenantId || undefined,
        },
      });
      navigate("/app/calls");
    } catch (error) {
      setChatError(error?.response?.data?.message || "Impossible de lancer l'appel.");
    }
  };

  return (
    <section className="space-y-4">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.92))]">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">Communication</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">Messagerie interne terrain</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Contactez l'administration, coordonnez les operations et gardez un historique clair de vos echanges.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/60">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Conversations</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{conversationCount}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/60">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Non lus</p>
              <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-300">{unreadTotal}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/60">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Contacts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{contacts.length}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Contacter l'administration</p>
                <p className="text-xs text-slate-500">Ouvrez un canal direct avec les responsables.</p>
              </div>
              <Badge variant="info">Prioritaire</Badge>
            </div>
            <div className="grid gap-2">
              {adminContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className="rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-3 text-left transition hover:border-sky-400 hover:bg-sky-100/70 dark:border-sky-900/70 dark:bg-sky-950/30 dark:hover:bg-sky-950/45"
                  onClick={() => openConversationWithContact(contact)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{contact.display_name}</p>
                    <Badge variant="info">Admin</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{contact.email}</p>
                  {contact.job_title && <p className="mt-1 text-xs text-slate-500">{contact.job_title}</p>}
                </button>
              ))}
              {!adminContacts.length && !contactsLoading && <p className="text-xs text-slate-500">Aucun admin disponible.</p>}
            </div>
          </Card>

          <Card className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nouvelle conversation</p>
              <p className="text-xs text-slate-500">Rechercher un collegue pour demarrer un echange prive.</p>
            </div>
            <Input
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              placeholder="Rechercher un collegue ou un admin"
            />
            {contactsLoading && <p className="text-xs text-slate-500">Chargement des contacts...</p>}
            {contactsError && <p className="text-xs text-rose-600">{contactsError}</p>}
            <ul className="max-h-64 space-y-2 overflow-auto pr-1">
              {filteredContacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-primary/50 hover:bg-primary/5 dark:border-slate-700 dark:hover:bg-slate-900"
                    onClick={() => openConversationWithContact(contact)}
                  >
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{contact.display_name}</p>
                    <p className="text-xs text-slate-500">{contact.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {contact.is_admin && <Badge variant="info">Admin</Badge>}
                      {contact.department && <Badge variant="neutral">{contact.department}</Badge>}
                      {contact.job_title && <span className="text-xs text-slate-500">{contact.job_title}</span>}
                    </div>
                  </button>
                </li>
              ))}
              {!filteredContacts.length && !contactsLoading && (
                <li className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">
                  Aucun contact trouve.
                </li>
              )}
            </ul>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Creer un groupe</p>
                <p className="text-xs text-slate-500">Selectionnez plusieurs personnes pour une discussion collective.</p>
              </div>
              <Badge variant="neutral">Equipe</Badge>
            </div>
            <Input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="Nom du groupe (optionnel)" />
            <div className="flex flex-wrap gap-2">
              {selectedGroupContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  onClick={() => toggleGroupMember(contact.id)}
                >
                  {contact.display_name} x
                </button>
              ))}
              {!selectedGroupContacts.length && <p className="text-xs text-slate-500">Aucun membre selectionne.</p>}
            </div>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {filteredContacts.map((contact) => {
                const selected = selectedGroupMembers.includes(contact.id);
                return (
                  <button
                    key={contact.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-slate-200 hover:border-primary/40 hover:bg-primary/5 dark:border-slate-700 dark:hover:bg-slate-900"
                    }`}
                    onClick={() => toggleGroupMember(contact.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{contact.display_name}</p>
                      <p className="text-xs text-slate-500">{contact.job_title || contact.email}</p>
                    </div>
                    <Badge variant={selected ? "info" : "neutral"}>{selected ? "Ajoute" : "Choisir"}</Badge>
                  </button>
                );
              })}
            </div>
            <Button type="button" disabled={selectedGroupMembers.length < 2 || mutating} onClick={createGroupConversation}>
              Creer le groupe
            </Button>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Conversations</p>
              <Badge variant="neutral">{conversationCount}</Badge>
            </div>
            {conversationsLoading && <p className="text-xs text-slate-500">Chargement des conversations...</p>}
            {conversationsError && <p className="text-xs text-rose-600">{conversationsError}</p>}
            <ul className="max-h-80 space-y-2 overflow-auto pr-1">
              {conversations.map((conversation) => {
                const selected = conversation.id === activeConversationId;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-slate-200 hover:border-primary/40 hover:bg-primary/5 dark:border-slate-700 dark:hover:bg-slate-900"
                      }`}
                      onClick={() => setActiveConversationId(conversation.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {conversationLabel(conversation, user?.id)}
                        </p>
                        {conversation.unread_count > 0 && <Badge variant="warning">{conversation.unread_count}</Badge>}
                      </div>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        {conversationMeta(conversation)}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">{getMessagePreview(conversation.last_message)}</p>
                    </button>
                  </li>
                );
              })}
              {!conversations.length && !conversationsLoading && (
                <li className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">
                  Aucune conversation. Choisissez un contact pour commencer.
                </li>
              )}
            </ul>
          </Card>
        </div>

        <Card className="flex min-h-[680px] flex-col gap-4">
          <div className="border-b border-slate-200 pb-4 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {activeConversation
                    ? conversationLabel(activeConversation, user?.id)
                    : "Selectionnez une conversation"}
                </p>
                {activeConversation?.last_message?.created_at && (
                  <p className="mt-1 text-xs text-slate-500">
                    Dernier message: {formatTimestamp(activeConversation.last_message.created_at)}
                  </p>
                )}
              </div>
              {activeConversation && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={activeConversation.type === "group" ? "info" : "neutral"}>
                    {activeConversation.type === "group" ? "Groupe" : "Prive"}
                  </Badge>
                  {activeConversation.unread_count > 0 && <Badge variant="warning">{activeConversation.unread_count} non lus</Badge>}
                  <Button type="button" variant="outline" onClick={() => startCall("audio")}>
                    Appel audio
                  </Button>
                  <Button type="button" variant="outline" onClick={() => startCall("video")}>
                    Appel video
                  </Button>
                </div>
              )}
            </div>
            {activeConversation?.participants?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeConversation.participants.map((participant) => (
                  <span
                    key={participant.id}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      participant.id === user?.id
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    {participant.display_name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-auto rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.82),rgba(241,245,249,0.95))] p-4 dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.4),rgba(15,23,42,0.7))]">
            {messagesLoading && activeConversationId && <p className="text-sm text-slate-500">Chargement des messages...</p>}
            {messagesError && <p className="text-sm text-rose-600">{messagesError}</p>}
            {!activeConversationId && <p className="text-sm text-slate-500">Choisissez un contact pour commencer a discuter.</p>}
            {activeConversationId && !messages.length && !messagesLoading && (
              <p className="text-sm text-slate-500">Aucun message pour le moment.</p>
            )}

            {messages.map((item) => {
              const mine = item.sender_user_id === user?.id;
              return (
                <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm shadow-sm ${
                      mine
                        ? "bg-[linear-gradient(135deg,rgba(14,165,233,1),rgba(37,99,235,0.95))] text-white"
                        : "border border-slate-200 bg-white/90 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {item.content ? <p className="whitespace-pre-wrap">{item.content}</p> : null}
                    {!item.content && !item.attachment_url ? <p className="whitespace-pre-wrap">(message sans contenu)</p> : null}
                    {item.attachment_url ? (
                      <MessageAttachment attachmentUrl={item.attachment_url} attachmentName={item.attachment_name} />
                    ) : null}
                    <p className={`mt-1 text-[11px] ${mine ? "text-white/80" : "text-slate-500"}`}>
                      {formatTimestamp(item.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <form className="space-y-3 rounded-[24px] border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-950/50" onSubmit={sendMessage}>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.webm,.ogg,.mp3,.wav,.m4a" onChange={handleFileSelection} />
            <Textarea
              rows={3}
              placeholder="Ecrivez votre message..."
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              disabled={!activeConversationId || mutating}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" disabled={!activeConversationId || mutating} onClick={() => fileInputRef.current?.click()}>
                  Envoyer un fichier
                </Button>
                {!recordingVoice ? (
                  <Button type="button" variant="outline" disabled={!activeConversationId || mutating} onClick={startVoiceRecording}>
                    Message vocal
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={stopVoiceRecording}>
                    Arreter l'enregistrement
                  </Button>
                )}
                <p className="text-xs text-slate-500">
                  {recordingVoice ? "Enregistrement audio en cours..." : "Messages internes entre collaborateurs de la meme entreprise."}
                </p>
              </div>
              <Button type="submit" disabled={!activeConversationId || !messageText.trim() || mutating}>
                Envoyer
              </Button>
            </div>
          </form>

          {chatError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{chatError}</p>}
        </Card>
      </div>
    </section>
  );
}
