"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEmployee } from "@/contexts/EmployeeContext";
import {
  useLeaveBalance,
  useMyLeaveRequests,
  useTeamAbsences,
  useCancelLeaveRequest,
} from "@/hooks/useEmpLeaves";
import { LeavesBalanceKpis } from "@/components/emp/conges/LeavesBalanceKpis";
import { RequestLeaveButton } from "@/components/emp/conges/RequestLeaveButton";
import { PendingLeaveRequestCard } from "@/components/emp/conges/PendingLeaveRequestCard";
import { LeaveHistoryList } from "@/components/emp/conges/LeaveHistoryList";
import { TeamAbsenceList } from "@/components/emp/conges/TeamAbsenceList";
import { NewLeaveRequestWizard } from "@/components/emp/conges/NewLeaveRequestWizard";

/**
 * /emp/conges — fonction 1.3 : gestion des demandes de congés et soldes.
 *
 * - Header solde 30 / 12 / 18 (acquis / pris / restants).
 * - CTA sticky "Demander un congé" → ouvre le wizard 3 étapes.
 * - Card "Demande en cours" (PENDING) avec bouton annuler.
 * - Historique des demandes (validé, refusé, annulé).
 * - Section "Mon équipe absente cette semaine" pour teamLeader=true.
 *
 * Le paramètre URL `?action=new` ouvre directement le wizard (pratique
 * depuis les actions rapides du dashboard).
 */
export default function EmpCongesPage() {
  const params = useSearchParams();
  const { employee } = useEmployee();
  const [wizardOpen, setWizardOpen] = useState(false);

  const balanceQ = useLeaveBalance();
  const requestsQ = useMyLeaveRequests();
  const teamQ = useTeamAbsences();
  const cancel = useCancelLeaveRequest();

  useEffect(() => {
    if (params.get("action") === "new") setWizardOpen(true);
  }, [params]);

  const balance = balanceQ.data?.balance ?? null;
  const year = balanceQ.data?.year ?? new Date().getFullYear();
  const pending = requestsQ.data?.pending ?? [];
  const history = requestsQ.data?.history ?? [];
  const isTeamLeader = employee?.teamLeader ?? false;

  return (
    <main className="mx-auto w-full max-w-screen-md px-4 pb-24 pt-2">
      <header className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-card">
        <p className="text-[11px] uppercase tracking-wider text-ink-3">Mes congés</p>
        <h1 className="mt-1 text-lg font-semibold text-ink">
          Année {year} ·{" "}
          {balance ? (
            <>
              Acquis {balance.paidLeaveAcquired} j · pris {balance.paidLeaveTaken} j · restants{" "}
              <span className="text-purple-700">{balance.paidLeaveRemaining} j</span>
            </>
          ) : (
            "Chargement…"
          )}
        </h1>
      </header>

      {balance && <LeavesBalanceKpis balance={balance} />}

      <RequestLeaveButton onClick={() => setWizardOpen(true)} />

      {pending.length > 0 &&
        pending.map((p) => (
          <PendingLeaveRequestCard
            key={p.id}
            request={p}
            onCancel={(id) => cancel.mutate(id)}
            isCancelling={cancel.isPending}
          />
        ))}

      <LeaveHistoryList items={history} />

      {isTeamLeader && teamQ.data && (
        <TeamAbsenceList absences={teamQ.data.absences} teamSize={teamQ.data.teamSize ?? 0} />
      )}

      <NewLeaveRequestWizard
        open={wizardOpen}
        balance={balance}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => {
          requestsQ.refetch();
          balanceQ.refetch();
        }}
      />
    </main>
  );
}
