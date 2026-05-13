"use client";

import { useState } from "react";
import { X, CalendarPlus, Plus, Trash2, ArrowDown, ArrowUp } from "lucide-react";
import type { MeetingType } from "@prisma/client";
import { useCreateMeeting, type AgendaItem } from "@/hooks/useSgGovernance";

interface Props {
  onClose: () => void;
  onSuccess: (id: string) => void;
}

const TYPES: { id: MeetingType; label: string; hint: string }[] = [
  { id: "BOARD_MEETING", label: "Conseil d'Administration", hint: "Convocation 15 jours min." },
  { id: "ORDINARY_AG", label: "AG Ordinaire", hint: "6 mois après clôture · 30 jours convoc." },
  { id: "EXTRAORDINARY_AG", label: "AG Extraordinaire", hint: "Modifications statutaires" },
];

export function CreateMeetingModal({ onClose, onSuccess }: Props) {
  const create = useCreateMeeting();
  const [type, setType] = useState<MeetingType>("BOARD_MEETING");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [location, setLocation] = useState("Salle du Conseil — Siège social");
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDuration, setDraftDuration] = useState("");

  function renumber(list: AgendaItem[]): AgendaItem[] {
    return list.map((it, i) => ({ ...it, num: i + 1 }));
  }
  function addItem() {
    const title = draftTitle.trim();
    if (!title) return;
    setItems((prev) =>
      renumber([...prev, { num: prev.length + 1, title, duration: draftDuration.trim() || undefined }]),
    );
    setDraftTitle("");
    setDraftDuration("");
  }
  function removeAt(idx: number) {
    setItems((prev) => renumber(prev.filter((_, i) => i !== idx)));
  }
  function move(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const arr = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= arr.length) return prev;
      [arr[idx], arr[t]] = [arr[t], arr[idx]];
      return renumber(arr);
    });
  }

  async function submit() {
    if (!date || !time || !location.trim() || items.length === 0) return;
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      const res = await create.mutateAsync({
        type,
        scheduledAt,
        location: location.trim(),
        agenda: { items },
      });
      onSuccess(res.id);
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const valid = Boolean(date && time && location.trim() && items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Programmer une nouvelle réunion</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">CA, AGO ou AGE · ordre du jour requis</p>
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
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Type *</label>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {TYPES.map((t) => {
                const active = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={
                      active
                        ? "rounded-md border border-violet-500 bg-violet-50 px-2.5 py-2 text-left text-[12px] font-semibold text-violet-700"
                        : "rounded-md border border-line bg-white px-2.5 py-2 text-left text-[12px] text-ink hover:bg-surface-alt"
                    }
                  >
                    <div>{t.label}</div>
                    <div className="text-[10.5px] font-normal text-ink-3">{t.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_1.5fr]">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Heure *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Lieu *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Ordre du jour ({items.length}) *
            </h3>
            {items.length === 0 ? (
              <p className="mt-1.5 rounded-md border border-dashed border-line bg-surface-alt/40 px-3 py-3 text-center text-[11.5px] text-ink-3">
                Ajoutez au moins un point ci-dessous.
              </p>
            ) : (
              <ol className="mt-1.5 space-y-1">
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
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        className="grid h-6 w-6 place-items-center rounded text-ink-3 hover:bg-surface-alt disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(idx, 1)}
                        disabled={idx === items.length - 1}
                        className="grid h-6 w-6 place-items-center rounded text-ink-3 hover:bg-surface-alt disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAt(idx)}
                        className="grid h-6 w-6 place-items-center rounded text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
                placeholder="Nouveau point"
                className="h-8 flex-1 min-w-[180px] rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
              <input
                type="text"
                value={draftDuration}
                onChange={(e) => setDraftDuration(e.target.value)}
                placeholder="Durée"
                className="h-8 w-28 rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
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
          </div>

          {create.isError && (
            <p className="text-[11.5px] text-rose-600">{(create.error as Error)?.message ?? "Erreur"}</p>
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
            disabled={!valid || create.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Programmer
          </button>
        </footer>
      </div>
    </div>
  );
}
