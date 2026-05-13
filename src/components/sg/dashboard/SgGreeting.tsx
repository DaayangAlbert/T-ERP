"use client";

import type { SgDashboardResponse } from "@/hooks/useSgDashboard";

interface Props {
  greeting: SgDashboardResponse["greeting"];
}

export function SgGreeting({ greeting }: Props) {
  const parts: string[] = [];
  parts.push(`${greeting.activeContracts} marchés en cours`);
  parts.push(`${greeting.activeCases} contentieux actifs`);
  if (greeting.daysToNextMeeting !== null) {
    parts.push(`prochain CA dans ${greeting.daysToNextMeeting} jours`);
  }
  parts.push(`${greeting.complianceAlertsCount} alertes conformité`);

  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <h2 className="text-[15px] font-semibold text-ink">
        Bonjour {greeting.firstName || "—"}
      </h2>
      <p className="mt-1 text-[12.5px] text-ink-3">{parts.join(" · ")}</p>
    </div>
  );
}
