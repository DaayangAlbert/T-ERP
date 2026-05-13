"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useGovernanceMeetings,
  useBoardMembers,
  useDecisionsRegister,
} from "@/hooks/useSgGovernance";
import { GovernanceHeader } from "@/components/sg/gouvernance/GovernanceHeader";
import { GovernanceKpis } from "@/components/sg/gouvernance/GovernanceKpis";
import { BoardCompositionTable } from "@/components/sg/gouvernance/BoardCompositionTable";
import { NextMeetingFocusCard } from "@/components/sg/gouvernance/NextMeetingFocusCard";
import { MeetingHistoryTable } from "@/components/sg/gouvernance/MeetingHistoryTable";
import { ConvocationModal } from "@/components/sg/gouvernance/ConvocationModal";
import { PvUploadModal } from "@/components/sg/gouvernance/PvUploadModal";
import { DecisionAddModal } from "@/components/sg/gouvernance/DecisionAddModal";
import { DecisionsRegisterCard } from "@/components/sg/gouvernance/DecisionsRegisterCard";
import { CreateMeetingModal } from "@/components/sg/gouvernance/CreateMeetingModal";

export default function GouvernancePage() {
  const { user } = useAuth();
  const readOnly = user?.role !== "SECRETARY_GENERAL" && user?.role !== "TENANT_ADMIN";
  const isDg = user?.role === "DG";

  const meetingsQ = useGovernanceMeetings();
  const membersQ = useBoardMembers();
  const registerQ = useDecisionsRegister();

  const [showCreate, setShowCreate] = useState(false);
  const [showConvocation, setShowConvocation] = useState(false);
  const [showPv, setShowPv] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function exportRegister() {
    const total = registerQ.data?.total ?? 0;
    showToast(`Export PDF du registre — ${total} décision${total > 1 ? "s" : ""} (à implémenter côté API)`);
  }

  const data = meetingsQ.data;
  const nextMeeting = data?.nextMeeting ?? null;

  if (meetingsQ.isLoading && !data) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-24 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }
  if (meetingsQ.isError || !data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800">
        Impossible de charger les données de gouvernance.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <GovernanceHeader
        kpis={data.kpis}
        nextMeeting={data.nextMeeting}
        readOnly={readOnly}
        onCreate={() => setShowCreate(true)}
        onExportRegister={exportRegister}
      />

      <GovernanceKpis kpis={data.kpis} decisionsCount={registerQ.data?.total ?? 0} />

      {nextMeeting && (
        <NextMeetingFocusCard
          meeting={nextMeeting}
          readOnly={readOnly}
          isDg={isDg}
          onSendConvocations={() => setShowConvocation(true)}
          onUploadPv={() => setShowPv(true)}
          onAddDecision={() => setShowDecision(true)}
        />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {membersQ.data && <BoardCompositionTable members={membersQ.data.items} />}
        <DecisionsRegisterCard onExport={exportRegister} />
      </div>

      <MeetingHistoryTable meetings={data.meetings} />

      {showCreate && (
        <CreateMeetingModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => showToast("Réunion programmée avec succès")}
        />
      )}
      {showConvocation && nextMeeting && (
        <ConvocationModal
          meeting={nextMeeting}
          onClose={() => setShowConvocation(false)}
          onSuccess={(info) =>
            showToast(`Convocations envoyées à ${info.recipientsCount} destinataires (${info.channels.join(", ")})`)
          }
        />
      )}
      {showPv && nextMeeting && (
        <PvUploadModal
          meeting={nextMeeting}
          onClose={() => setShowPv(false)}
          onSuccess={() => showToast("PV archivé — indexation Registre OK")}
        />
      )}
      {showDecision && nextMeeting && (
        <DecisionAddModal
          meeting={nextMeeting}
          onClose={() => setShowDecision(false)}
          onSuccess={() => showToast("Décision enregistrée au Registre")}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
