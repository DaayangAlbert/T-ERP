"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useOuvDashboard } from "@/hooks/useOuvDashboard";
import {
  useHseReports,
  useEmergencyContacts,
  useReportHse,
} from "@/hooks/useOuvHse";

import { HseEmergencyBanner } from "@/components/ouv/hse/HseEmergencyBanner";
import { HseTypeSelector } from "@/components/ouv/hse/HseTypeSelector";
import { HseReportForm } from "@/components/ouv/hse/HseReportForm";
import { HseReportsList } from "@/components/ouv/hse/HseReportsList";
import type { OuvHseType } from "@/schemas/ouv-hse";
import { PageHelp } from "@/components/help/PageHelp";
import { OuvHseTutorial } from "@/components/help/tutorials/OuvHseTutorial";

// Page mirror screen-ouv-hse. Différence clé : header ROUGE intentionnel
// (pas violet) pour signaler la criticité du domaine. Bandeau urgence
// vitale + sélecteur 5 types + liste signalements + modal de saisie.
export default function OuvHsePage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const dashboard = useOuvDashboard();
  const contacts = useEmergencyContacts();
  const reports = useHseReports();
  const reportMut = useReportHse();

  const [formType, setFormType] = useState<OuvHseType | null>(null);
  const initials = dashboard.data?.user.initials ?? "??";

  async function submitReport(payload: Parameters<typeof reportMut.mutateAsync>[0]) {
    const res = await reportMut.mutateAsync(payload);
    return {
      message: res.message,
      cnpsDeclarationRequired: res.cnpsDeclarationRequired,
    };
  }

  return (
    <>
      {/* Header ROUGE intentionnel (#DC2626) — criticité du domaine */}
      <header className="flex items-center gap-3 bg-[#DC2626] px-4 py-3 text-white">
        <Link
          href={`/${tenantSlug}/ouv/dashboard`}
          aria-label="Retour"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[17px] font-bold leading-tight">⚠ Signaler incident</p>
        </div>
        <PageHelp title="Aide — HSE"><OuvHseTutorial /></PageHelp>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[13px] font-bold text-rose-700">
          {initials}
        </span>
      </header>

      <main className="page mx-auto w-full max-w-screen-md px-3 pt-3.5">
        <HseEmergencyBanner contacts={contacts.data} />

        <HseTypeSelector onSelect={setFormType} />

        <HseReportsList reports={reports.data?.reports ?? []} />
      </main>

      <HseReportForm
        isOpen={formType != null}
        type={formType}
        onClose={() => setFormType(null)}
        onSubmit={submitReport}
      />
    </>
  );
}
