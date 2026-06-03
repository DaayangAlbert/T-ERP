"use client";

import { useMemo, useState } from "react";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { useSgContracts, type SgContractsFilters } from "@/hooks/useSgContracts";
import { ContractsHeader } from "@/components/sg/marches/ContractsHeader";
import { ContractsKpis } from "@/components/sg/marches/ContractsKpis";
import { ContractsPhaseTabs, type ContractTab } from "@/components/sg/marches/ContractsPhaseTabs";
import { ContractsFiltersCard } from "@/components/sg/marches/ContractsFiltersCard";
import { ContractsTable } from "@/components/sg/marches/ContractsTable";
import { CallForTendersGrid } from "@/components/sg/marches/CallForTendersGrid";
import { ContractDetailDrawer } from "@/components/sg/marches/ContractDetailDrawer";
import { NewContractModal } from "@/components/sg/marches/NewContractModal";
import type { ContractingAuthorityType } from "@prisma/client";
import { PageHelp } from "@/components/help/PageHelp";
import { SgMarchesTutorial } from "@/components/help/tutorials/SgMarchesTutorial";

export default function MarchesPage() {
  // Matrice : FULL sur SG pour SECRETARY_GENERAL/SG/TENANT_ADMIN, READ pour DG.
  const readOnly = !useAccess(MODULES.SG).canEdit;

  const [tab, setTab] = useState<ContractTab>("ACTIVE");
  const [q, setQ] = useState("");
  const [moaType, setMoaType] = useState<ContractingAuthorityType | "ALL">("ALL");
  const [minAmountM, setMinAmountM] = useState<number | "">("");
  const [year, setYear] = useState<number | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filters: SgContractsFilters = useMemo(
    () => ({
      q: q.trim() || undefined,
      phase: tab === "ALL" ? undefined : tab,
      moaType: moaType === "ALL" ? undefined : moaType,
      minAmount: typeof minAmountM === "number" ? minAmountM * 1_000_000 : undefined,
      year: typeof year === "number" ? year : undefined,
    }),
    [q, tab, moaType, minAmountM, year],
  );

  const { data, isLoading, isError } = useSgContracts(filters);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <PageHelp title="Aide — Marchés SG"><SgMarchesTutorial /></PageHelp>
      </div>
      <ContractsHeader
        activeCount={data?.counts.active ?? 0}
        portfolioValue={data?.kpis.portfolioValue ?? 0}
        openCalls={data?.counts.submission ?? 0}
        closedCount={data?.counts.closed ?? 0}
        readOnly={readOnly}
        onCreate={() => setShowNew(true)}
      />

      {data && <ContractsKpis kpis={data.kpis} />}

      <ContractsPhaseTabs
        active={tab}
        counts={{
          total: data?.counts.total ?? 0,
          active: data?.counts.active ?? 0,
          submission: data?.counts.submission ?? 0,
          closed: data?.counts.closed ?? 0,
        }}
        onChange={setTab}
      />

      <ContractsFiltersCard
        q={q}
        moaType={moaType}
        minAmountM={minAmountM}
        year={year}
        onChange={(n) => {
          if (n.q !== undefined) setQ(n.q);
          if (n.moaType !== undefined) setMoaType(n.moaType);
          if (n.minAmountM !== undefined) setMinAmountM(n.minAmountM);
          if (n.year !== undefined) setYear(n.year);
        }}
      />

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800">
          Impossible de charger les marchés.
        </div>
      )}

      {isLoading && !data ? (
        <div className="space-y-2">
          <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
          <div className="h-48 animate-pulse rounded-xl bg-surface-alt" />
        </div>
      ) : (
        <>
          {data?.callsForTenders && data.callsForTenders.length > 0 && (tab === "SUBMISSION" || tab === "ALL") && (
            <CallForTendersGrid cards={data.callsForTenders} onOpen={setOpenId} />
          )}
          {data && <ContractsTable rows={data.items} onOpen={setOpenId} />}
        </>
      )}

      <ContractDetailDrawer
        contractId={openId}
        readOnly={readOnly}
        onClose={() => setOpenId(null)}
      />

      {showNew && (
        <NewContractModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => setOpenId(id)}
        />
      )}
    </div>
  );
}
