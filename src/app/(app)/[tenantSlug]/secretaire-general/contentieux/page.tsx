"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { useSgLegalCases, useLawyers, type LegalCasesFilters } from "@/hooks/useSgLegalCases";
import { LegalCasesHeader } from "@/components/sg/contentieux/LegalCasesHeader";
import { LegalCasesKpis } from "@/components/sg/contentieux/LegalCasesKpis";
import { LegalCaseCard } from "@/components/sg/contentieux/LegalCaseCard";
import { LegalCaseDetailDrawer } from "@/components/sg/contentieux/LegalCaseDetailDrawer";
import { NewLegalCaseWizard } from "@/components/sg/contentieux/NewLegalCaseWizard";
import { HearingsCalendar } from "@/components/sg/contentieux/HearingsCalendar";
import { LawyersDirectory } from "@/components/sg/contentieux/LawyersDirectory";

type Tab = "OPEN" | "CLOSED" | "ALL";

export default function ContentieuxPage() {
  // Matrice : FULL sur SG pour SECRETARY_GENERAL/SG/TENANT_ADMIN, READ pour DG.
  const readOnly = !useAccess(MODULES.SG).canEdit;

  const [tab, setTab] = useState<Tab>("OPEN");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filters: LegalCasesFilters = useMemo(
    () => ({
      status: tab === "ALL" ? undefined : tab,
      q: q.trim() || undefined,
    }),
    [tab, q],
  );

  const { data, isLoading, isError } = useSgLegalCases(filters);
  const lawyersQ = useLawyers();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-3">
      <LegalCasesHeader
        kpis={data?.kpis ?? { activeCount: 0, provisionTotal: 0, amountAtStakeTotal: 0, hearingsSoon: 0, closedYtd: 0, wonYtd: 0 }}
        lawyersCount={lawyersQ.data?.items.length ?? 0}
        readOnly={readOnly}
        onCreate={() => setShowNew(true)}
      />

      {data && <LegalCasesKpis kpis={data.kpis} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-line">
          {([
            { id: "OPEN" as const, label: "Actifs" },
            { id: "CLOSED" as const, label: "Clôturés" },
            { id: "ALL" as const, label: "Tous" },
          ]).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  active
                    ? "bg-violet-600 px-2.5 py-1.5 text-[12px] font-semibold text-white"
                    : "bg-white px-2.5 py-1.5 text-[12px] font-semibold text-ink-3 hover:bg-surface-alt"
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher : référence, partie, avocat…"
            className="h-9 w-full rounded-md border border-line bg-white pl-7 pr-2 text-[12.5px] outline-none focus:border-violet-400"
          />
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800">
          Impossible de charger les contentieux.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {isLoading && !data ? (
            <>
              <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
              <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
            </>
          ) : !data || data.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-[12.5px] text-ink-3">
              Aucun dossier correspondant aux filtres.
            </div>
          ) : (
            data.items.map((it) => <LegalCaseCard key={it.id} item={it} onOpen={setOpenId} />)
          )}
        </div>
        <div className="space-y-3">
          <HearingsCalendar onOpenCase={setOpenId} />
          <LawyersDirectory />
        </div>
      </div>

      <LegalCaseDetailDrawer
        caseId={openId}
        readOnly={readOnly}
        onClose={() => setOpenId(null)}
      />

      {showNew && (
        <NewLegalCaseWizard
          onClose={() => setShowNew(false)}
          onSuccess={(id) => {
            setOpenId(id);
            showToast("Dossier créé · provision initiale comptabilisée");
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
