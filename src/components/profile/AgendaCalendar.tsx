"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAgenda, useCreateAgendaEvent } from "@/hooks/useDgProfile";
import { EventType } from "@prisma/client";
import { formatDate } from "@/lib/format";
import { clsx } from "clsx";

const TYPE_DOT: Record<EventType, string> = {
  MEETING: "bg-info",
  BOARD: "bg-primary-500",
  AUDIT: "bg-warning",
  VALIDATION_DEADLINE: "bg-danger",
  PERSONAL: "bg-ink-3",
  OTHER: "bg-success",
};

const TYPE_LABEL: Record<EventType, string> = {
  MEETING: "RDV",
  BOARD: "Conseil",
  AUDIT: "Audit",
  VALIDATION_DEADLINE: "Échéance valid.",
  PERSONAL: "Personnel",
  OTHER: "Autre",
};

export function AgendaCalendar() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 16));
  const [end, setEnd] = useState(new Date(Date.now() + 3600_000).toISOString().slice(0, 16));
  const [eventType, setEventType] = useState<EventType>(EventType.MEETING);
  const [location, setLocation] = useState("");

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

  const { data } = useAgenda(monthStart.toISOString(), monthEnd.toISOString());
  const create = useCreateAgendaEvent();

  const startDay = (monthStart.getDay() + 6) % 7;
  const days: Array<Date | null> = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= monthEnd.getDate(); d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (days.length % 7 !== 0) days.push(null);

  const eventsByDay: Record<string, Array<{ id: string; title: string; type: EventType; startAt: string }>> = {};
  data?.items.forEach((e) => {
    const k = e.startAt.slice(0, 10);
    if (!eventsByDay[k]) eventsByDay[k] = [];
    eventsByDay[k].push(e);
  });

  const submit = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      startAt: new Date(start).toISOString(),
      endAt: new Date(end).toISOString(),
      type: eventType,
      location: location || undefined,
    });
    setTitle("");
    setLocation("");
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-line bg-white p-3 shadow-card">
        <h2 className="text-sm font-semibold text-ink">
          {monthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="grid h-8 w-8 place-items-center rounded border border-line bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            className="rounded border border-line bg-white px-3 py-1 text-[12px]"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="grid h-8 w-8 place-items-center rounded border border-line bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="ml-2 inline-flex h-8 items-center gap-1 rounded-md bg-primary-500 px-2.5 text-[12px] font-medium text-white"
          >
            <Plus className="h-3 w-3" /> Nouveau RDV
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[11.5px] font-semibold text-ink-2">Titre</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]" />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink-2">Début</span>
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]" />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink-2">Fin</span>
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]" />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink-2">Type</span>
              <select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]">
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink-2">Lieu</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]" />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="inline-flex h-9 items-center rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2">Annuler</button>
            <button type="button" onClick={submit} disabled={create.isPending} className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60">
              {create.isPending ? "Création…" : "Créer le RDV"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-line">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="bg-surface-alt p-2 text-center text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
            {d}
          </div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={i} className="bg-white p-2 min-h-[90px]" />;
          const k = d.toISOString().slice(0, 10);
          const events = eventsByDay[k] ?? [];
          const isToday = k === new Date().toISOString().slice(0, 10);
          return (
            <div key={i} className={clsx("bg-white p-2 min-h-[90px]", isToday && "ring-2 ring-primary-300")}>
              <div className={clsx("text-[11px] font-semibold", isToday ? "text-primary-700" : "text-ink-3")}>
                {d.getDate()}
              </div>
              <ul className="mt-1 space-y-0.5">
                {events.slice(0, 3).map((e) => (
                  <li key={e.id} className="flex items-center gap-1 truncate text-[10.5px]">
                    <span className={clsx("h-1.5 w-1.5 flex-shrink-0 rounded-full", TYPE_DOT[e.type])} />
                    <span className="truncate text-ink">{e.title}</span>
                  </li>
                ))}
                {events.length > 3 && (
                  <li className="text-[10px] text-ink-3">+{events.length - 3}</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Prochains rendez-vous
        </h3>
        {!data || data.items.length === 0 ? (
          <p className="text-[12.5px] text-ink-3">Aucun événement ce mois-ci.</p>
        ) : (
          <ul className="space-y-1.5 text-[12.5px]">
            {data.items.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-md border border-line bg-surface-alt px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={clsx("h-2 w-2 rounded-full", TYPE_DOT[e.type])} />
                  <span className="font-medium text-ink">{e.title}</span>
                  {e.location && <span className="text-[11px] text-ink-3">· {e.location}</span>}
                </div>
                <span className="text-[11px] text-ink-3">{formatDate(e.startAt, "dd/MM HH:mm")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="rounded-lg border border-dashed border-line bg-surface-alt p-3 text-center text-[12px] text-ink-3">
        Synchronisation Google Calendar / Outlook — disponible en V2.
      </div>
    </div>
  );
}
