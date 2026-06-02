"use client";

import { useState } from "react";
import { ClipboardCheck, CalendarDays, Wallet, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { PendingLeavesTable } from "@/components/rh/leaves/PendingLeavesTable";
import { TeamCalendar } from "@/components/rh/leaves/TeamCalendar";
import { LeaveBalancesTable } from "@/components/rh/leaves/LeaveBalancesTable";
import { AbsencesTable } from "@/components/rh/leaves/AbsencesTable";
import { usePendingLeaves } from "@/hooks/useRhLeaves";
import { PageHelp } from "@/components/help/PageHelp";
import { RhCongesTutorial } from "@/components/help/tutorials/RhCongesTutorial";

type Tab = "pending" | "calendar" | "balances" | "absences";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "pending", label: "Demandes en attente", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
  { key: "calendar", label: "Calendrier équipes", icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { key: "balances", label: "Soldes par employé", icon: <Wallet className="h-3.5 w-3.5" /> },
  { key: "absences", label: "Absences journaliers", icon: <AlertCircle className="h-3.5 w-3.5" /> },
];

export default function CongesPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const { data: pending } = usePendingLeaves();
  const pendingCount = pending?.items.length ?? 0;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Congés et absences</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Validation des demandes RH (N1), calendrier équipes, soldes et absences déclarées.
          </p>
        </div>
        <PageHelp title="Aide — Congés et absences"><RhCongesTutorial /></PageHelp>
      </header>

      <div className="-mx-3 overflow-x-auto px-3">
        <div className="inline-flex gap-1 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition",
                tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
              )}
            >
              {t.icon}
              {t.label}
              {t.key === "pending" && pendingCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
              {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
            </button>
          ))}
        </div>
      </div>

      {tab === "pending" && <PendingLeavesTable />}
      {tab === "calendar" && <TeamCalendar />}
      {tab === "balances" && <LeaveBalancesTable />}
      {tab === "absences" && <AbsencesTable />}
    </div>
  );
}
