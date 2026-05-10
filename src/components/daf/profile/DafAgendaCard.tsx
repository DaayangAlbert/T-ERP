"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Landmark, Scale, Users, ScrollText } from "lucide-react";
import { clsx } from "clsx";

interface TaxDeadline {
  id: string;
  type: string;
  label: string;
  dueDate: string;
  daysLeft?: number;
  amount?: string | null;
}

interface AgendaEntry {
  date: string;
  label: string;
  category: "FISCAL" | "BANK" | "BOARD" | "AUDIT";
  hint?: string;
}

const CATEGORY = {
  FISCAL: { label: "Échéance fiscale", color: "bg-rose-100 text-rose-800", Icon: ScrollText },
  BANK: { label: "Banque", color: "bg-blue-100 text-blue-800", Icon: Landmark },
  BOARD: { label: "CA / AG", color: "bg-primary-100 text-primary-800", Icon: Users },
  AUDIT: { label: "Audit CAC", color: "bg-amber-100 text-amber-800", Icon: Scale },
} as const;

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}

export function DafAgendaCard() {
  const [entries, setEntries] = useState<AgendaEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fiscalRes = await fetch("/api/daf/fiscal", { credentials: "same-origin" });
      const fiscal: { deadlines?: TaxDeadline[] } = fiscalRes.ok ? await fiscalRes.json() : {};
      const fiscalEntries: AgendaEntry[] = (fiscal.deadlines ?? []).slice(0, 6).map((d) => ({
        date: d.dueDate,
        label: d.label,
        category: "FISCAL",
        hint: d.amount ? `${new Intl.NumberFormat("fr-FR").format(Number(d.amount))} FCFA` : undefined,
      }));

      // Synthèse événements financiers du mois (banques, CA, CAC) — V1 statique
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const offset = (n: number) => new Date(monthStart.getTime() + n * 86_400_000).toISOString();
      const synthesized: AgendaEntry[] = [
        { date: offset(11), label: "Réunion mensuelle UBA — RM Mme NDONGO", category: "BANK", hint: "Reporting trésorerie" },
        { date: offset(14), label: "Comité d'audit CAC — pré-audit T2", category: "AUDIT", hint: "J-15 reporting CAC" },
        { date: offset(18), label: "BICEC — revue ligne de crédit", category: "BANK", hint: "Renouvellement annuel" },
        { date: offset(22), label: "Conseil d'administration — clôture T1", category: "BOARD", hint: "Rapport DAF requis" },
      ];

      const all = [...fiscalEntries, ...synthesized].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (!cancelled) setEntries(all);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!entries) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-ink">Agenda DAF</h3>
        </div>
        <span className="text-[11px] text-ink-3">Synchronisé avec /daf/fiscal</span>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-surface-alt p-3 text-center text-[12.5px] text-ink-3">
          Aucun événement à venir.
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((e, i) => {
            const cat = CATEGORY[e.category];
            const Icon = cat.Icon;
            return (
              <div key={i} className="flex items-start gap-3 rounded-md border border-line bg-white p-2.5">
                <span className={clsx("grid h-8 w-8 flex-shrink-0 place-items-center rounded-md", cat.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-ink">{e.label}</div>
                  <div className="text-[11px] text-ink-3">
                    {fmtDate(e.date)} · {cat.label}
                    {e.hint && ` · ${e.hint}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
