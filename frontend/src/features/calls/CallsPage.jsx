import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStoredAccessToken } from "@/features/auth/authStorage";
import { socket } from "@/shared/realtime/socketClient";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";

function formatTimestamp(value, locale = "fr-FR") {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function CallsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  const { data, loading, error, refetch } = useApiQuery("/calls");
  const { data: contactsData } = useApiQuery("/chat/contacts", { params: { limit: 200 } });
  const { mutate, loading: mutating } = useApiMutation();

  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [callType, setCallType] = useState("audio");
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      return undefined;
    }

    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }

    const onEvent = (payload) => {
      setEvents((prev) => [JSON.stringify(payload), ...prev].slice(0, 10));
      void refetch();
    };

    socket.on("call:incoming", onEvent);
    socket.on("call:ended", onEvent);
    socket.on("call:participant-joined", onEvent);
    socket.on("call:participant-left", onEvent);

    return () => {
      socket.off("call:incoming", onEvent);
      socket.off("call:ended", onEvent);
      socket.off("call:participant-joined", onEvent);
      socket.off("call:participant-left", onEvent);
    };
  }, [refetch]);

  const items = data?.items || [];
  const contacts = contactsData?.items || [];
  const selectedContacts = useMemo(
    () => contacts.filter((contact) => selectedParticipantIds.includes(contact.id)),
    [contacts, selectedParticipantIds]
  );

  const toggleContact = (contactId) =>
    setSelectedParticipantIds((current) =>
      current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId]
    );

  const create = async (event) => {
    event.preventDefault();
    if (!selectedParticipantIds.length) {
      return;
    }
    await mutate({ method: "post", url: "/calls", data: { call_type: callType, participant_ids: selectedParticipantIds } });
    setSelectedParticipantIds([]);
    await refetch();
  };

  const callAction = async (callId, action) => {
    await mutate({ method: "post", url: `/calls/${callId}/${action}`, data: {} });
    await refetch();
  };

  return (
    <section className="space-y-4">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.92))]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t("pages.calls.title")}</h2>
        <p className="mt-2 text-sm text-slate-500">
          Lancez un appel audio ou video avec les collaborateurs de la meme entreprise et suivez l&apos;historique des sessions.
        </p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <form className="space-y-4" onSubmit={create}>
            <div className="grid gap-3 md:grid-cols-[180px_1fr]">
              <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm" value={callType} onChange={(e) => setCallType(e.target.value)}>
                <option value="audio">{t("enums.callType.audio")}</option>
                <option value="video">{t("enums.callType.video")}</option>
              </select>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {selectedContacts.length
                  ? `${selectedContacts.length} participant(s) selectionne(s)`
                  : "Selectionnez au moins un collegue pour demarrer l'appel."}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  onClick={() => toggleContact(contact.id)}
                >
                  {contact.display_name} x
                </button>
              ))}
            </div>
            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {contacts.map((contact) => {
                const selected = selectedParticipantIds.includes(contact.id);
                return (
                  <button
                    key={contact.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-slate-200 hover:border-primary/40 hover:bg-primary/5 dark:border-slate-700 dark:hover:bg-slate-900"
                    }`}
                    onClick={() => toggleContact(contact.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{contact.display_name}</p>
                      <p className="text-xs text-slate-500">{contact.job_title || contact.email}</p>
                    </div>
                    <span className="text-xs text-slate-500">{selected ? "Ajoute" : "Choisir"}</span>
                  </button>
                );
              })}
            </div>
            <Button type="submit" disabled={!selectedParticipantIds.length || mutating}>
              {mutating ? t("common.loading") : "Lancer l'appel"}
            </Button>
          </form>
        </Card>

        <Card className="space-y-4">
          {loading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !items.length && <p className="text-sm text-slate-500">{t("common.noData")}</p>}
          {!!items.length && (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        #{item.id} · {t(`enums.callType.${item.call_type}`)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.participants?.length || 0} participant(s) · {t(`enums.callStatus.${item.status}`)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Debut: {formatTimestamp(item.started_at, locale)} · Fin: {formatTimestamp(item.ended_at, locale)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.status === "ringing" || item.status === "ongoing" ? (
                        <Button type="button" variant="outline" disabled={mutating} onClick={() => callAction(item.id, "join")}>
                          Rejoindre
                        </Button>
                      ) : null}
                      {item.status === "ongoing" ? (
                        <Button type="button" variant="outline" disabled={mutating} onClick={() => callAction(item.id, "leave")}>
                          Quitter
                        </Button>
                      ) : null}
                      {item.status !== "ended" && item.status !== "rejected" ? (
                        <Button type="button" variant="outline" disabled={mutating} onClick={() => callAction(item.id, "end")}>
                          Cloturer
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <p className="mb-2 text-sm font-semibold text-slate-700">{t("pages.calls.realtime")}</p>
        {!events.length && <p className="text-sm text-slate-500">{t("common.noData")}</p>}
        {!!events.length && (
          <ul className="space-y-2 text-xs text-slate-600">
            {events.map((eventText, index) => (
              <li key={`${eventText}-${index}`} className="rounded-md bg-slate-50 px-2 py-1">
                {eventText}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
