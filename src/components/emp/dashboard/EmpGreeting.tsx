"use client";

import { useEffect, useState } from "react";

interface Props {
  firstName: string;
}

const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * Salutation contextualisée — jour de la semaine, date, heure, indication
 * d'avancement du cycle de paie (jour N du mois). Évite le calcul météo
 * (placeholder ☀ 26° en attendant l'intégration Météo Cameroun).
 */
export function EmpGreeting({ firstName }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <p className="mt-3 text-sm text-ink-3">
        Bonjour {firstName}…
      </p>
    );
  }

  const dayName = DAYS[now.getDay()];
  const day = now.getDate();
  const monthName = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dayOfMonth = day;

  return (
    <p className="mt-3 text-sm text-ink-2">
      <span className="font-semibold text-ink">Bonjour {firstName}</span>
      <span className="mx-1.5 text-ink-3">·</span>
      {dayName} {day} {monthName} {year}
      <span className="mx-1.5 text-ink-3">·</span>
      {hh}:{mm}
      <span className="mx-1.5 text-ink-3">·</span>☀ 26°
      <span className="mx-1.5 text-ink-3">·</span>
      jour {dayOfMonth} de la semaine de paie
    </p>
  );
}
