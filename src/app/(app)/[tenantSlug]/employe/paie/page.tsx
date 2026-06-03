"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEmpPayslips, useEmpPayslipDetail, useSharePayslipWhatsapp } from "@/hooks/useEmpPayslips";
import { useEmployee } from "@/contexts/EmployeeContext";
import { PayslipsHeader } from "@/components/emp/paie/PayslipsHeader";
import { LatestPayslipCard } from "@/components/emp/paie/LatestPayslipCard";
import { GrossComponentsBreakdown } from "@/components/emp/paie/GrossComponentsBreakdown";
import { PayslipActionsRow } from "@/components/emp/paie/PayslipActionsRow";
import { PayslipsHistoryList } from "@/components/emp/paie/PayslipsHistoryList";
import { CnpsAttestationsList } from "@/components/emp/paie/CnpsAttestationsList";
import { WhatsAppShareModal } from "@/components/emp/paie/WhatsAppShareModal";
import { PageHelp } from "@/components/help/PageHelp";
import { EmpPaieTutorial } from "@/components/help/tutorials/EmpPaieTutorial";

/**
 * /emp/paie — fonction 1.2 : historique et téléchargement des bulletins.
 * Le bulletin mis en avant (par défaut le plus récent, ou celui de
 * `?bulletin=<id>`) affiche les composantes brut détaillées et les actions
 * PDF / WhatsApp. La liste en dessous permet de basculer entre les
 * bulletins de l'année.
 */
export default function EmpPaiePage() {
  const params = useSearchParams();
  const initial = params.get("bulletin");
  const { data: list, isLoading } = useEmpPayslips();
  const [selectedId, setSelectedId] = useState<string | null>(initial);

  // Quand la liste arrive, sélectionne le plus récent par défaut.
  useEffect(() => {
    if (!selectedId && list?.payslips.length) {
      setSelectedId(list.payslips[0].id);
    }
  }, [list, selectedId]);

  const { data: detail, isLoading: detailLoading } = useEmpPayslipDetail(selectedId);
  const { employee } = useEmployee();

  const selectedListItem = useMemo(
    () => list?.payslips.find((p) => p.id === selectedId) ?? null,
    [list, selectedId]
  );

  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharePreview, setSharePreview] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const share = useSharePayslipWhatsapp();

  function openShare() {
    setShareUrl(null);
    setSharePreview(null);
    setShareError(null);
    setShareOpen(true);
  }
  function closeShare() {
    setShareOpen(false);
  }
  async function submitShare(to: string | undefined) {
    if (!selectedId) return;
    try {
      setShareError(null);
      const res = await share.mutateAsync({ payslipId: selectedId, to });
      setShareUrl(res.shareUrl);
      setSharePreview(res.whatsapp.renderedBody);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "Erreur");
    }
  }

  const currentYear = list?.year ?? new Date().getFullYear();

  return (
    <main className="mx-auto w-full max-w-screen-md px-4 pb-16 pt-2">
      {isLoading || !list ? (
        <>
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-4 h-48 animate-pulse rounded-2xl bg-purple-50" />
        </>
      ) : (
        <>
          <div className="flex justify-end pt-2">
            <PageHelp title="Aide — Mes bulletins"><EmpPaieTutorial /></PageHelp>
          </div>
          <PayslipsHeader year={list.year} total={list.total} cumulNet={list.cumulNet} />

          {selectedListItem && (
            <LatestPayslipCard
              payslip={{
                periodLabel: selectedListItem.periodLabel,
                period: selectedListItem.period,
                netAmount: selectedListItem.netAmount,
                grossAmount: selectedListItem.grossAmount,
                cnpsAmount: selectedListItem.cnpsAmount,
                irppAmount: selectedListItem.irppAmount,
                paymentDate: selectedListItem.paymentDate,
                paymentReference: selectedListItem.paymentReference,
                paymentBankAccount: selectedListItem.paymentBankAccount,
                status: selectedListItem.status,
              }}
            />
          )}

          {detail && !detailLoading && (
            <>
              <GrossComponentsBreakdown
                detail={{
                  workedDays: detail.workedDays,
                  reportedHours: detail.reportedHours,
                  baseSalary: detail.baseSalary,
                  overtimeAmount: detail.overtimeAmount,
                  overtimeHours: detail.overtimeHours,
                  overtimeHours125: detail.overtimeHours125,
                  overtimeHours150: detail.overtimeHours150,
                  overtimeHours200: detail.overtimeHours200,
                  seniorityBonus: detail.seniorityBonus,
                  transportAllowance: detail.transportAllowance,
                  grossAmount: detail.grossAmount,
                }}
              />
              <PayslipActionsRow
                payslipId={detail.id}
                verifiedPublicUrl={detail.verifiedPublicUrl}
                onShareWhatsapp={openShare}
                isSharing={share.isPending}
              />
            </>
          )}

          <PayslipsHistoryList
            items={list.payslips}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <CnpsAttestationsList currentYear={currentYear} />
        </>
      )}

      <WhatsAppShareModal
        open={shareOpen}
        shareUrl={shareUrl}
        preview={sharePreview}
        defaultPhone={employee?.phoneMobile ?? null}
        isSubmitting={share.isPending}
        error={shareError}
        onClose={closeShare}
        onSubmit={submitShare}
      />
    </main>
  );
}
