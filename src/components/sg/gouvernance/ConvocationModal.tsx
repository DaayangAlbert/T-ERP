"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Mail, MessageCircle, MailCheck, Send, Plus, Trash2, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import {
  useBoardMembers,
  useSendConvocations,
  type BoardMember,
  type MeetingsListResponse,
} from "@/hooks/useSgGovernance";

type Channel = "EMAIL" | "WHATSAPP" | "REGISTERED_MAIL";

interface Recipient {
  name: string;
  email?: string;
  phone?: string;
}

interface Props {
  meeting: NonNullable<MeetingsListResponse["nextMeeting"]>;
  onClose: () => void;
  onSuccess: (info: { recipientsCount: number; channels: string[] }) => void;
}

const CHANNELS: { id: Channel; label: string; icon: typeof Mail }[] = [
  { id: "EMAIL", label: "Email", icon: Mail },
  { id: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { id: "REGISTERED_MAIL", label: "Courrier recommandé", icon: MailCheck },
];

function defaultRecipientsFromMembers(members: BoardMember[]): Recipient[] {
  return members.map((m) => ({ name: m.fullName }));
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function ConvocationModal({ meeting, onClose, onSuccess }: Props) {
  const membersQ = useBoardMembers();
  const send = useSendConvocations(meeting.id);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [channels, setChannels] = useState<Channel[]>(["EMAIL", "WHATSAPP", "REGISTERED_MAIL"]);
  const [message, setMessage] = useState<string>("");
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (membersQ.data?.items && recipients.length === 0 && !touched) {
      setRecipients(defaultRecipientsFromMembers(membersQ.data.items));
    }
  }, [membersQ.data, recipients.length, touched]);

  const requiredDelay = meeting.type === "BOARD_MEETING" ? 15 : 30;
  const daysUntil = useMemo(
    () => daysBetween(new Date(), new Date(meeting.scheduledAt)),
    [meeting.scheduledAt],
  );
  const delayOk = daysUntil >= requiredDelay;

  function toggleChannel(c: Channel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }
  function addRecipient() {
    const name = draftName.trim();
    if (!name) return;
    setRecipients((prev) => [
      ...prev,
      { name, email: draftEmail.trim() || undefined, phone: draftPhone.trim() || undefined },
    ]);
    setDraftName("");
    setDraftEmail("");
    setDraftPhone("");
    setTouched(true);
  }
  function removeRecipient(idx: number) {
    setRecipients((prev) => prev.filter((_, i) => i !== idx));
    setTouched(true);
  }

  async function submit() {
    try {
      const res = await send.mutateAsync({ recipients, channels, message: message.trim() || undefined });
      onSuccess({ recipientsCount: res.recipientsCount, channels: res.channels });
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Envoyer les convocations</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              Délai légal : {requiredDelay} jours · Réunion dans J-{daysUntil}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {!delayOk && (
            <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Délai légal non respecté.</strong> Les convocations doivent être envoyées au moins {requiredDelay} jours avant la séance (J-{daysUntil} actuellement).
              </div>
            </div>
          )}

          {/* Channels */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Canaux</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CHANNELS.map((c) => {
                const Icon = c.icon;
                const active = channels.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleChannel(c.id)}
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] font-semibold transition",
                      active
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-line bg-white text-ink-3 hover:bg-surface-alt",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                Destinataires ({recipients.length})
              </h3>
              {membersQ.data?.items && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipients(defaultRecipientsFromMembers(membersQ.data!.items));
                    setTouched(true);
                  }}
                  className="text-[11px] font-semibold text-violet-700 hover:underline"
                >
                  Recharger administrateurs
                </button>
              )}
            </div>
            <ul className="mt-1.5 space-y-1">
              {recipients.map((r, i) => (
                <li
                  key={`${r.name}-${i}`}
                  className="flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1.5 text-[11.5px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{r.name}</div>
                    <div className="truncate text-[10.5px] text-ink-3">
                      {r.email ?? "—"} · {r.phone ?? "—"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRecipient(i)}
                    className="grid h-6 w-6 place-items-center rounded text-rose-600 hover:bg-rose-50"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Nom"
                className="h-8 rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
              <input
                type="email"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                placeholder="email@ex.cm"
                className="h-8 rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
              <input
                type="tel"
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
                placeholder="+237 6 …"
                className="h-8 rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
              <button
                type="button"
                onClick={addRecipient}
                disabled={!draftName.trim()}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-violet-600 px-2.5 text-[11.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
          </div>

          {/* Message */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Message (optionnel)</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Note d'accompagnement, contexte, pièces jointes…"
              className="mt-1.5 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
            />
          </div>

          {send.isError && (
            <p className="text-[11.5px] text-rose-600">{(send.error as Error)?.message ?? "Erreur d'envoi"}</p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={send.isPending || recipients.length === 0 || channels.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Envoyer ({recipients.length})
          </button>
        </footer>
      </div>
    </div>
  );
}
