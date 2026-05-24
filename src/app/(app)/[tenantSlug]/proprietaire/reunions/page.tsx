"use client";

import { clsx } from "clsx";
import { Landmark, CalendarClock, MapPin } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useOwnerReunions } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, Explain, Loading, ErrorBox } from "@/components/owner/ui";

export default function OwnerReunionsPage() {
  const { data, isLoading, isError } = useOwnerReunions();
  const head = <OwnerHeader title="Agenda" subtitle="Vos réunions de gouvernance (conseil, assemblées) programmées et passées." />;

  if (isError) return <div className="space-y-4">{head}<ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4">{head}<Loading /></div>;

  return (
    <div className="space-y-4">
      {head}

      <Section title="Réunions à venir" icon={<CalendarClock className="h-4 w-4" />}>
        <Explain>Les réunions du conseil et assemblées générales déjà programmées. Un rappel vous est envoyé à l&apos;approche de la date.</Explain>
        {data.aVenir.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-ink-3">Aucune réunion programmée.</p>
        ) : (
          <ul className="space-y-2">
            {data.aVenir.map((m) => {
              const soon = (m.joursRestants ?? 99) <= 7;
              return (
                <li key={m.id} className={clsx("flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3", soon ? "border-warning/40 bg-warning/5" : "border-line")}>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-ink">{m.type}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-ink-3">
                      <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {formatDate(m.date, "EEEE d MMMM yyyy")}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.lieu}</span>
                      <span>{m.nbPoints} point(s) à l&apos;ordre du jour</span>
                    </div>
                  </div>
                  <span className={clsx("rounded-full px-3 py-1 text-[12px] font-semibold", soon ? "bg-warning/15 text-warning" : "bg-primary-50 text-primary-700")}>
                    {m.joursRestants === 0 ? "Aujourd'hui" : m.joursRestants === 1 ? "Demain" : `Dans ${m.joursRestants} jours`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Réunions passées" icon={<Landmark className="h-4 w-4" />}>
        {data.passees.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-ink-3">Aucune réunion passée enregistrée.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.passees.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[12.5px]">
                <span className="font-medium text-ink">{m.type}</span>
                <span className="text-ink-3">{formatDate(m.date)} · {m.lieu}</span>
                <span className="text-ink-2">{m.nbDecisions ?? 0} décision(s) prise(s)</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
