"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  MapPin,
  Mail,
  FileText,
  Gavel,
  Plus,
  ArrowDown,
  ArrowUp,
  Trash2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { clsx } from "clsx";
import type { AgendaItem, MeetingsListResponse } from "@/hooks/useSgGovernance";
import { useUpdateAgenda } from "@/hooks/useSgGovernance";

interface Props {
  meeting: NonNullable<MeetingsListResponse["nextMeeting"]>;
  readOnly: boolean;
  isDg: boolean;
  onSendConvocations: () => void;
  onUploadPv: () => void;
  onAddDecision: () => void;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

function typeLabel(t: string): string {
  if (t === "BOARD_MEETING") return "Conseil d'Administration";
  if (t === "ORDINARY_AG") return "Assemblée Générale Ordinaire";
  return "Assemblée Générale Extraordinaire";
}

export function NextMeetingFocusCard({
  meeting,
  readOnly,
  isDg,
  onSendConvocations,
  onUploadPv,
  onAddDecision,
}: Props) {
  const initialItems = useMemo<AgendaItem[]>(
    () => (meeting.agenda?.items?.length ? meeting.agenda.items : []),
    [meeting.agenda],
  );
  const [items, setItems] = useState<AgendaItem[]>(initialItems);
  const [dirty, setDirty] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDuration, setDraftDuration] = useState("");
  const update = useUpdateAgenda(meeting.id);

  useEffect(() => {
    setItems(initialItems);
    setDirty(false);
  }, [initialItems]);

  function renumber(list: AgendaItem[]): AgendaItem[] {
    return list.map((it, i) => ({ ...it, num: i + 1 }));
  }

  function addItem() {
    const title = draftTitle.trim();
    if (!title) return;
    const next = renumber([...items, { num: items.length + 1, title, duration: draftDuration.trim() || undefined }]);
    setItems(next);
    setDirty(true);
    setDraftTitle("");
    setDraftDuration("");
  }
  function removeAt(idx: number) {
    setItems((prev) => renumber(prev.filter((_, i) => i !== idx)));
    setDirty(true);
  }
  function move(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const arr = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= arr.length) return prev;
      [arr[idx], arr[t]] = [arr[t], arr[idx]];
      return renumber(arr);
    });
    setDirty(true);
  }
  async function save(approve = false) {
    await update.mutateAsync({ items, approveByDg: approve });
    setDirty(false);
  }

  const isCompleted = meeting.status === "COMPLETED";
  const convocationsSent = Boolean(meeting.convocationsSentAt);
  const pvSigned = Boolean(meeting.pvSignedAt);

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/30">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-violet-200 bg-violet-50 px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-violet-600 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-white">
              Prochaine séance
            </span>
            <h2 className="text-[13.5px] font-semibold text-ink">{typeLabel(meeting.type)}</h2>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-ink-3">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> {fmtDateTime(meeting.scheduledAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {meeting.location}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
              convocationsSent ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
            )}
          >
            Convocations {convocationsSent ? "envoyées" : "à envoyer"}
          </span>
          {isCompleted && (
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                pvSigned ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
              )}
            >
              PV {pvSigned ? "signé" : "à téléverser"}
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_280px]">
        {/* Agenda editor */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[12.5px] font-semibold text-ink">
              Ordre du jour ({items.length} point{items.length > 1 ? "s" : ""})
            </h3>
            {dirty && !readOnly && !isCompleted && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => save(false)}
                  disabled={update.isPending}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] font-semibold text-ink hover:bg-surface-alt disabled:opacity-50"
                >
                  <Save className="h-3 w-3" /> Enregistrer brouillon
                </button>
                {isDg && (
                  <button
                    type="button"
                    onClick={() => save(true)}
                    disabled={update.isPending}
                    className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-3 w-3" /> Approuver (DG)
                  </button>
                )}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <p className="rounded-md border border-dashed border-line bg-white px-3 py-4 text-center text-[11.5px] text-ink-3">
              Aucun point à l'ordre du jour. Ajoutez le premier ci-dessous.
            </p>
          ) : (
            <ol className="space-y-1">
              {items.map((it, idx) => (
                <li
                  key={`${it.num}-${idx}`}
                  className="flex items-start gap-2 rounded-md border border-line bg-white px-2.5 py-1.5"
                >
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-violet-100 text-[10.5px] font-bold text-violet-700">
                    {it.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] text-ink">{it.title}</div>
                    {it.duration && <div className="text-[10.5px] text-ink-3">{it.duration}</div>}
                  </div>
                  {!readOnly && !isCompleted && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        className="grid h-6 w-6 place-items-center rounded text-ink-3 hover:bg-surface-alt disabled:opacity-30"
                        aria-label="Monter"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(idx, 1)}
                        disabled={idx === items.length - 1}
                        className="grid h-6 w-6 place-items-center rounded text-ink-3 hover:bg-surface-alt disabled:opacity-30"
                        aria-label="Descendre"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAt(idx)}
                        className="grid h-6 w-6 place-items-center rounded text-rose-600 hover:bg-rose-50"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          {!readOnly && !isCompleted && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Nouveau point (ex : Approbation comptes 2025)"
                className="h-8 flex-1 min-w-[180px] rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
              <input
                type="text"
                value={draftDuration}
                onChange={(e) => setDraftDuration(e.target.value)}
                placeholder="Durée (ex : 30 min)"
                className="h-8 w-32 rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
              <button
                type="button"
                onClick={addItem}
                disabled={!draftTitle.trim()}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-600 px-2.5 text-[11.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
          )}

          {update.isError && (
            <p className="mt-1.5 text-[11px] text-rose-600">
              {(update.error as Error)?.message ?? "Erreur de sauvegarde"}
            </p>
          )}
        </div>

        {/* Actions sidebar */}
        <aside className="space-y-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Actions</h3>
          <button
            type="button"
            onClick={onSendConvocations}
            disabled={readOnly || isCompleted || items.length === 0}
            className="flex w-full items-start gap-2 rounded-md border border-line bg-white px-2.5 py-2 text-left hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mail className="mt-0.5 h-4 w-4 text-violet-600" />
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-ink">
                {convocationsSent ? "Renvoyer convocations" : "Envoyer convocations"}
              </div>
              <div className="text-[10.5px] text-ink-3">Email + WhatsApp + recommandé</div>
            </div>
          </button>
          <button
            type="button"
            onClick={onUploadPv}
            disabled={readOnly || pvSigned}
            className="flex w-full items-start gap-2 rounded-md border border-line bg-white px-2.5 py-2 text-left hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="mt-0.5 h-4 w-4 text-violet-600" />
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-ink">Téléverser PV signé</div>
              <div className="text-[10.5px] text-ink-3">
                {pvSigned ? "PV déjà signé" : "Après séance, archive Registre"}
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={onAddDecision}
            disabled={readOnly}
            className="flex w-full items-start gap-2 rounded-md border border-line bg-white px-2.5 py-2 text-left hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Gavel className="mt-0.5 h-4 w-4 text-violet-600" />
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-ink">Ajouter décision</div>
              <div className="text-[10.5px] text-ink-3">
                {meeting.decisionsCount} déjà enregistrée{meeting.decisionsCount > 1 ? "s" : ""}
              </div>
            </div>
          </button>
        </aside>
      </div>
    </section>
  );
}
