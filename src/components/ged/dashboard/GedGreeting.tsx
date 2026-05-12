"use client";

import type { GedDashboardResponse } from "@/hooks/useGedDashboard";

interface Props {
  firstName: string;
  greeting: GedDashboardResponse["greeting"];
}

export function GedGreeting({ firstName, greeting }: Props) {
  const parts: string[] = [];
  parts.push(`${greeting.activeWorkflowsCount} workflows en cours`);
  parts.push(`${greeting.complianceAlertsCount} alertes conformité`);
  parts.push(`${greeting.pendingAccessRequestsCount} demandes d'accès`);

  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <h2 className="text-[15px] font-semibold text-ink">Bonjour {firstName}</h2>
      <p className="mt-1 text-[12.5px] text-ink-3">{parts.join(" · ")}</p>
    </div>
  );
}
