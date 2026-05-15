"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useOuvDashboard } from "@/hooks/useOuvDashboard";
import {
  useLeaveBalance,
  useLeavesList,
  useRequestLeave,
  useReportSick,
  useCancelLeave,
} from "@/hooks/useOuvLeaves";
import { useAttestations, useRequestAttestation } from "@/hooks/useOuvAttestations";
import { useAdvances } from "@/hooks/useOuvAdvances";

import { LeaveBalanceCard } from "@/components/ouv/conges/LeaveBalanceCard";
import { LeaveActionButtons } from "@/components/ouv/conges/LeaveActionButtons";
import { LeavesList } from "@/components/ouv/conges/LeavesList";
import { LeaveRequestModal } from "@/components/ouv/conges/LeaveRequestModal";
import { SickLeaveModal } from "@/components/ouv/conges/SickLeaveModal";
import { OtherRequestCards } from "@/components/ouv/conges/OtherRequestCards";
import { AttestationRequestModal } from "@/components/ouv/conges/AttestationRequestModal";
import { AttestationsList } from "@/components/ouv/conges/AttestationsList";

// Page mirror screen-ouv-conges :
//  1. Card solde HÉROS vert gradient (56px chiffre + progress bar)
//  2. 2 boutons CTA (Demander congé / Signaler maladie)
//  3. Liste "Mes demandes" avec chip statut coloré
//  4. Section "Autres demandes" : avance + attestation
//  5. Liste "Mes attestations" si au moins une
export default function OuvCongesPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const dashboard = useOuvDashboard();
  const balance = useLeaveBalance();
  const leaves = useLeavesList();
  const attestations = useAttestations();
  const advances = useAdvances();

  const requestLeave = useRequestLeave();
  const reportSick = useReportSick();
  const cancelLeave = useCancelLeave();
  const requestAttestation = useRequestAttestation();

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [sickOpen, setSickOpen] = useState(false);
  const [attestationOpen, setAttestationOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const initials = dashboard.data?.user.initials ?? "??";
  const hasOpenAttestation = (attestations.data?.attestations ?? []).some(
    (a) => a.status === "PENDING" || a.status === "IN_PREPARATION"
  );

  async function submitLeave(payload: Parameters<typeof requestLeave.mutateAsync>[0]) {
    const res = await requestLeave.mutateAsync(payload);
    return { daysCount: res.daysCount, message: res.message };
  }

  async function submitSick(payload: Parameters<typeof reportSick.mutateAsync>[0]) {
    const res = await reportSick.mutateAsync(payload);
    return { message: res.message, cnpsNotificationRequired: res.cnpsNotificationRequired };
  }

  async function submitAttestation(payload: Parameters<typeof requestAttestation.mutateAsync>[0]) {
    const res = await requestAttestation.mutateAsync(payload);
    return {
      message: res.message,
      expectedReadyAt: res.attestation.expectedReadyAt,
    };
  }

  async function handleCancelLeave(id: string) {
    try {
      await cancelLeave.mutateAsync({ id });
      setFeedback({ tone: "success", message: "Demande annulée" });
    } catch (err: any) {
      setFeedback({ tone: "error", message: err?.message ?? "Annulation refusée" });
    }
  }

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
          <p className="text-[17px] font-bold leading-tight">Mes congés</p>
        </div>
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

        {balance.isLoading || !balance.data ? (
          <div className="mb-3.5 h-[180px] animate-pulse rounded-2xl bg-emerald-100" />
        ) : (
          <LeaveBalanceCard balance={balance.data.balance} />
        )}

        <LeaveActionButtons
          onRequestLeave={() => setLeaveOpen(true)}
          onReportSick={() => setSickOpen(true)}
        />

        <LeavesList
          pending={leaves.data?.pending ?? []}
          history={leaves.data?.history ?? []}
          onCancel={handleCancelLeave}
        />

        <OtherRequestCards
          maxAdvanceXAF={advances.data?.quota.maxAllowedXAF ?? 0}
          hasOpenAdvance={advances.data?.quota.hasOpenAdvance ?? false}
          hasOpenAttestation={hasOpenAttestation}
          onOpenAttestation={() => setAttestationOpen(true)}
        />

        <AttestationsList attestations={attestations.data?.attestations ?? []} />
      </main>

      <LeaveRequestModal
        isOpen={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        paidLeaveRemaining={balance.data?.balance.paidLeaveRemaining ?? 0}
        onSubmit={submitLeave}
      />

      <SickLeaveModal
        isOpen={sickOpen}
        onClose={() => setSickOpen(false)}
        onSubmit={submitSick}
      />

      <AttestationRequestModal
        isOpen={attestationOpen}
        onClose={() => setAttestationOpen(false)}
        onSubmit={submitAttestation}
      />
    </>
  );
}
