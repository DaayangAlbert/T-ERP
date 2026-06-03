"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useOuvDashboard } from "@/hooks/useOuvDashboard";
import { useCurrentPayslip, usePayslipHistory, useShareWhatsApp } from "@/hooks/useOuvPayslips";
import { useAdvances, useRequestAdvance } from "@/hooks/useOuvAdvances";

import { CurrentPayslipCard } from "@/components/ouv/paie/CurrentPayslipCard";
import { PayslipBreakdown } from "@/components/ouv/paie/PayslipBreakdown";
import { AdvanceRequestCTA } from "@/components/ouv/paie/AdvanceRequestCTA";
import { AdvanceRequestModal } from "@/components/ouv/paie/AdvanceRequestModal";
import { PayslipHistoryList } from "@/components/ouv/paie/PayslipHistoryList";
import { AdvancesList } from "@/components/ouv/paie/AdvancesList";
import { PageHelp } from "@/components/help/PageHelp";
import { OuvPaieTutorial } from "@/components/help/tutorials/OuvPaieTutorial";

// Page mirror du prototype screen-ouv-paie. Orchestre :
//  - Card bulletin actuel (gradient violet + boutons Voir/WhatsApp)
//  - Breakdown 6 lignes (Base/Sup/Prime/CNPS/IRPP/NET)
//  - CTA demande d'avance + modal wizard 3 étapes
//  - Liste des avances en cours/passées
//  - Historique des bulletins (12 mois)
export default function OuvPaiePage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const dashboard = useOuvDashboard();
  const current = useCurrentPayslip();
  const history = usePayslipHistory({ limit: 12 });
  const advances = useAdvances();
  const shareMut = useShareWhatsApp();
  const requestAdvance = useRequestAdvance();

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const initials = dashboard.data?.user.initials ?? "??";

  function openPdf(id: string) {
    window.open(`/api/ouv/payslips/${id}/pdf`, "_blank", "noopener,noreferrer");
  }

  async function shareCurrent() {
    if (!current.data?.payslip) return;
    setFeedback(null);
    try {
      const res = await shareMut.mutateAsync({ id: current.data.payslip.id });
      // Sur mobile, ouvrir directement wa.me pour basculer dans WhatsApp natif
      window.location.href = res.waUrl;
    } catch (err: any) {
      setFeedback({ tone: "error", message: err?.message ?? "Partage échoué" });
    }
  }

  async function submitAdvance(data: {
    amountXAF: number;
    reason: string;
    payoutMethod: "BANK_TRANSFER" | "MOBILE_MONEY" | "CASH";
  }) {
    const res = await requestAdvance.mutateAsync(data);
    return { autoApproved: res.autoApproved, message: res.message };
  }

  return (
    <>
      {/* Header avec back arrow */}
      <header className="flex items-center gap-3 bg-[#2A1B3D] px-4 py-3 text-white">
        <Link
          href={`/${tenantSlug}/ouv/dashboard`}
          aria-label="Retour"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[17px] font-bold leading-tight">Ma paie</p>
        </div>
        <PageHelp title="Aide — Ma paie"><OuvPaieTutorial /></PageHelp>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-purple-500 text-[13px] font-bold">
          {initials}
        </span>
      </header>

      <main className="page mx-auto w-full max-w-screen-md px-3 pt-3.5">
        {feedback && (
          <div
            className={`mb-3.5 rounded-xl px-4 py-3 text-[14px] font-semibold ${
              feedback.tone === "success"
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
            }`}
            role="status"
          >
            {feedback.message}
          </div>
        )}

        {current.isLoading ? (
          <PageSkeleton />
        ) : (
          <>
            <CurrentPayslipCard
              payslip={current.data?.payslip ?? null}
              onOpenPdf={() => current.data?.payslip && openPdf(current.data.payslip.id)}
              onShareWhatsapp={shareCurrent}
              sharing={shareMut.isPending}
            />

            {current.data?.payslip && <PayslipBreakdown payslip={current.data.payslip} />}

            <AdvanceRequestCTA
              maxAllowedXAF={advances.data?.quota.maxAllowedXAF ?? 0}
              hasOpenAdvance={advances.data?.quota.hasOpenAdvance ?? false}
              onClick={() => setAdvanceOpen(true)}
            />

            <AdvancesList advances={advances.data?.advances ?? []} />

            <PayslipHistoryList
              payslips={history.data?.payslips ?? []}
              onOpenPdf={openPdf}
            />
          </>
        )}
      </main>

      <AdvanceRequestModal
        isOpen={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        maxAllowedXAF={advances.data?.quota.maxAllowedXAF ?? 0}
        onSubmit={submitAdvance}
      />
    </>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-3.5">
      <div className="h-[180px] animate-pulse rounded-2xl bg-gradient-to-br from-purple-200 to-purple-300" />
      <div className="h-[320px] animate-pulse rounded-2xl bg-white" />
      <div className="h-[80px] animate-pulse rounded-2xl bg-white" />
      <div className="h-[240px] animate-pulse rounded-2xl bg-white" />
    </div>
  );
}
