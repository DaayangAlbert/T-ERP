"use client";

import { useMemo, useState } from "react";
import { Crown, Building2, Handshake } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { useSgInstitutions, useApprovals, type ApprovalItem } from "@/hooks/useSgInstitutions";
import { InstitutionsHeader } from "@/components/sg/institutionnel/InstitutionsHeader";
import { InstitutionsKpis } from "@/components/sg/institutionnel/InstitutionsKpis";
import { InstitutionsGroupCard } from "@/components/sg/institutionnel/InstitutionsGroupCard";
import { ApprovalsCard } from "@/components/sg/institutionnel/ApprovalsCard";
import { InstitutionDetailDrawer } from "@/components/sg/institutionnel/InstitutionDetailDrawer";
import { NewInstitutionModal } from "@/components/sg/institutionnel/NewInstitutionModal";
import { ApprovalRenewalWizard } from "@/components/sg/institutionnel/ApprovalRenewalWizard";
import { PageHelp } from "@/components/help/PageHelp";
import { SgInstitutionnelTutorial } from "@/components/help/tutorials/SgInstitutionnelTutorial";

export default function InstitutionnelPage() {
  // Matrice : FULL sur SG pour SECRETARY_GENERAL/SG/TENANT_ADMIN, READ pour DG.
  const readOnly = !useAccess(MODULES.SG).canEdit;

  const instQ = useSgInstitutions();
  const apprQ = useApprovals();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [renewing, setRenewing] = useState<ApprovalItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const groups = useMemo(() => {
    const items = instQ.data?.items ?? [];
    return {
      ministries: items.filter((i) => i.type === "MINISTRY" || i.type === "PUBLIC_INSTITUTION"),
      municipalities: items.filter((i) => i.type === "MUNICIPALITY"),
      associations: items.filter((i) => i.type === "PROFESSIONAL_ASSOCIATION"),
    };
  }, [instQ.data]);

  if (instQ.isLoading && !instQ.data) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-24 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }
  if (instQ.isError || !instQ.data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800">
        Impossible de charger les institutions.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <PageHelp title="Aide — Institutionnel SG"><SgInstitutionnelTutorial /></PageHelp>
      </div>
      <InstitutionsHeader
        counts={instQ.data.counts}
        approvalsValid={apprQ.data?.counts.valid ?? 0}
        readOnly={readOnly}
        onCreate={() => setShowNew(true)}
      />

      <InstitutionsKpis
        counts={instQ.data.counts}
        approvalsCount={apprQ.data?.counts ?? { total: 0, valid: 0, expiringSoon: 0, expired: 0 }}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <InstitutionsGroupCard
          title="Ministères clés MOA"
          icon={Crown}
          iconTone="text-violet-700 bg-violet-50"
          items={groups.ministries}
          onOpen={setOpenId}
          emptyLabel="Aucun ministère enregistré."
        />
        <InstitutionsGroupCard
          title="Communes partenaires"
          icon={Building2}
          iconTone="text-emerald-700 bg-emerald-50"
          items={groups.municipalities}
          onOpen={setOpenId}
          emptyLabel="Aucune commune enregistrée."
        />
        <InstitutionsGroupCard
          title="Adhésions professionnelles"
          icon={Handshake}
          iconTone="text-amber-700 bg-amber-50"
          items={groups.associations}
          onOpen={setOpenId}
          emptyLabel="Aucune association enregistrée."
        />
        <ApprovalsCard
          items={apprQ.data?.items ?? []}
          readOnly={readOnly}
          onRenew={(a) => setRenewing(a)}
        />
      </div>

      <InstitutionDetailDrawer
        institutionId={openId}
        readOnly={readOnly}
        onClose={() => setOpenId(null)}
      />

      {showNew && (
        <NewInstitutionModal
          onClose={() => setShowNew(false)}
          onSuccess={(id) => {
            setOpenId(id);
            showToast("Institution ajoutée");
          }}
        />
      )}

      {renewing && (
        <ApprovalRenewalWizard
          approval={renewing}
          onClose={() => setRenewing(null)}
          onSuccess={() => showToast(`Renouvellement ${renewing.approvalName.slice(0, 40)}… soumis`)}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
