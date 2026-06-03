"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Wrench } from "lucide-react";
import { useOuvDashboard } from "@/hooks/useOuvDashboard";
import { useOuvEpi } from "@/hooks/useOuvEpi";
import { useOuvTools } from "@/hooks/useOuvTools";
import { EpiList } from "@/components/ouv/outils/EpiList";
import { ToolsList, ToolsOverdueAlert } from "@/components/ouv/outils/ToolsList";
import { ToolRequestModal } from "@/components/ouv/outils/ToolRequestModal";
import { PageHelp } from "@/components/help/PageHelp";
import { OuvOutilsTutorial } from "@/components/help/tutorials/OuvOutilsTutorial";

// Page mirror screen-ouv-outils : EPI obligatoires + outils sortis +
// bouton "Demander un outil" (CTA violet 56px).
export default function OuvOutilsPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const dashboard = useOuvDashboard();
  const epi = useOuvEpi();
  const tools = useOuvTools();
  const [requestOpen, setRequestOpen] = useState(false);

  const initials = dashboard.data?.user.initials ?? "??";

  return (
    <>
      <header className="flex items-center gap-3 bg-[#2A1B3D] px-4 py-3 text-white">
        <Link
          href={`/${tenantSlug}/ouv/dashboard`}
          aria-label="Retour"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[17px] font-bold leading-tight">Mes outils et EPI</p>
        </div>
        <PageHelp title="Aide — Outils &amp; EPI"><OuvOutilsTutorial /></PageHelp>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-purple-500 text-[13px] font-bold">
          {initials}
        </span>
      </header>

      <main className="page mx-auto w-full max-w-screen-md px-3 pt-3.5">
        {tools.data && <ToolsOverdueAlert overdue={tools.data.stats.overdue} />}

        {epi.isLoading ? (
          <div className="mb-3.5 h-[300px] animate-pulse rounded-2xl bg-white" />
        ) : (
          <EpiList items={epi.data?.items ?? []} />
        )}

        {tools.isLoading ? (
          <div className="mb-3.5 h-[200px] animate-pulse rounded-2xl bg-white" />
        ) : (
          <ToolsList data={tools.data} />
        )}

        <button
          type="button"
          onClick={() => setRequestOpen(true)}
          className="mb-3.5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-[15px] font-bold text-white shadow-lg active:scale-[0.98]"
        >
          <Wrench className="h-5 w-5" />
          🛠 Demander un outil
        </button>
      </main>

      <ToolRequestModal isOpen={requestOpen} onClose={() => setRequestOpen(false)} />
    </>
  );
}
