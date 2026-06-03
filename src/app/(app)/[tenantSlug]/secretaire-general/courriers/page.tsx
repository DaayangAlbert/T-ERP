"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import {
  useCorrespondences,
  useCorrespondencesAnalytics,
  type CorrespondencesFilters,
} from "@/hooks/useSgCorrespondences";
import { CorrespondencesHeader } from "@/components/sg/courriers/CorrespondencesHeader";
import { CorrespondencesKpis } from "@/components/sg/courriers/CorrespondencesKpis";
import {
  CorrespondencesTabs,
  type CorrespondenceTab,
} from "@/components/sg/courriers/CorrespondencesTabs";
import { CorrespondencesTable } from "@/components/sg/courriers/CorrespondencesTable";
import { AdminActivityCards } from "@/components/sg/courriers/AdminActivityCards";
import { CorrespondenceDetailDrawer } from "@/components/sg/courriers/CorrespondenceDetailDrawer";
import { NewCorrespondenceWizard } from "@/components/sg/courriers/NewCorrespondenceWizard";
import { PageHelp } from "@/components/help/PageHelp";
import { SgCourriersTutorial } from "@/components/help/tutorials/SgCourriersTutorial";

export default function CourriersPage() {
  // Matrice : FULL sur SG pour SECRETARY_GENERAL/SG/TENANT_ADMIN, READ pour DG.
  const readOnly = !useAccess(MODULES.SG).canEdit;

  const [tab, setTab] = useState<CorrespondenceTab>("INCOMING");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const filters: CorrespondencesFilters = useMemo(() => {
    const base: CorrespondencesFilters = { q: q.trim() || undefined };
    switch (tab) {
      case "INCOMING":
        base.direction = "INCOMING";
        break;
      case "OUTGOING":
        base.direction = "OUTGOING";
        break;
      case "DRAFTS":
        base.status = "DRAFTS";
        break;
      case "AWAITING_DG":
        base.status = "AWAITING_DG";
        break;
      case "ARCHIVED":
        base.status = "ARCHIVED";
        break;
    }
    return base;
  }, [tab, q]);

  const { data, isLoading, isError } = useCorrespondences(filters);
  const analyticsQ = useCorrespondencesAnalytics();

  const emptyCounts = {
    incomingMonth: 0,
    outgoingMonth: 0,
    awaitingDg: 0,
    handledYtd: 0,
    drafts: 0,
    archived: 0,
    total: 0,
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <PageHelp title="Aide — Courriers SG"><SgCourriersTutorial /></PageHelp>
      </div>
      <CorrespondencesHeader
        counts={data?.counts ?? emptyCounts}
        readOnly={readOnly}
        onCreate={() => setShowNew(true)}
      />

      {data && <CorrespondencesKpis counts={data.counts} />}

      <CorrespondencesTabs active={tab} counts={data?.counts ?? emptyCounts} onChange={setTab} />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher : référence, correspondant, objet, résumé…"
            className="h-9 w-full rounded-md border border-line bg-white pl-7 pr-2 text-[12.5px] outline-none focus:border-violet-400"
          />
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800">
          Impossible de charger les courriers.
        </div>
      )}

      {isLoading && !data ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      ) : data ? (
        <CorrespondencesTable
          items={data.items}
          onOpen={setOpenId}
          emptyLabel="Aucun courrier dans cet onglet."
        />
      ) : null}

      {analyticsQ.data && <AdminActivityCards data={analyticsQ.data} />}

      <CorrespondenceDetailDrawer
        correspondenceId={openId}
        readOnly={readOnly}
        onClose={() => setOpenId(null)}
      />

      {showNew && (
        <NewCorrespondenceWizard
          onClose={() => setShowNew(false)}
          onSuccess={(id, ref) => {
            setOpenId(id);
            showToast(`Courrier ${ref} enregistré au registre`);
          }}
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
