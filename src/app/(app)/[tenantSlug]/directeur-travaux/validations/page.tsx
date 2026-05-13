"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Shield, ClipboardList, FileText } from "lucide-react";
import { clsx } from "clsx";
import { useChantier } from "@/contexts/ChantierContext";

interface PendingResp {
  dailyReports: Array<{
    id: string;
    siteCode: string;
    siteName: string;
    reportDate: string;
    submittedBy: { firstName: string; lastName: string };
    workforcePresent: number;
    productionValue: number;
  }>;
  workflow: Array<{
    id: string;
    type: string;
    reference: string;
    title: string;
    amount: number | null;
    initiator: { firstName: string; lastName: string };
    priority: string;
    createdAt: string;
  }>;
  totalCount: number;
}

export default function DtravValidationsPage() {
  const { availableChantiers, activeChantierId } = useChantier();
  const [filter, setFilter] = useState<string | "all">("all");

  const siteFilter = filter === "all" ? null : filter;

  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "validations-pending", siteFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (siteFilter) params.set("siteId", siteFilter);
      const res = await fetch(`/api/dtrav/validations/pending?${params}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<PendingResp>;
    },
  });

  return (
    <div id="screen-dtrav-validations" className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Validations N1
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Rapports journaliers, BC chantier &lt; 5 M, notes de frais, congés équipe.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 p-3 text-[12.5px] text-primary-700">
        <Shield className="h-4 w-4" />
        <strong>
          Validations DTrav · {data?.totalCount ?? 0} en attente ·{" "}
          {availableChantiers.length} chantier{availableChantiers.length > 1 ? "s" : ""}
        </strong>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Tous" />
        {availableChantiers.map((s) => (
          <FilterChip
            key={s.id}
            active={filter === s.id}
            onClick={() => setFilter(s.id)}
            label={s.code}
          />
        ))}
      </div>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Rapports journaliers à valider
        </h2>
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : data?.dailyReports.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucun rapport en attente.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.dailyReports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-[12.5px]">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-primary-600" />
                  <div>
                    <div className="font-medium text-ink">
                      {r.siteCode} — {new Date(r.reportDate).toLocaleDateString("fr-FR")}
                    </div>
                    <div className="text-[11.5px] text-ink-3">
                      {r.submittedBy.firstName} {r.submittedBy.lastName} · {r.workforcePresent} présents ·{" "}
                      {(r.productionValue / 1_000_000).toFixed(1)} M FCFA
                    </div>
                  </div>
                </div>
                <Link
                  href="/directeur-travaux/production"
                  style={{ minHeight: 36 }}
                  className="inline-flex items-center rounded-md bg-primary-600 px-3 text-[12px] font-medium text-white"
                >
                  Examiner
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Workflow validations
        </h2>
        {data?.workflow.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">
            Aucune validation workflow en attente.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.workflow.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-[12.5px]">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-primary-600" />
                  <div>
                    <div className="font-medium text-ink">
                      {v.reference} — {v.title}
                    </div>
                    <div className="text-[11.5px] text-ink-3">
                      {v.initiator.firstName} {v.initiator.lastName}
                      {v.amount && <> · {(v.amount / 1_000_000).toFixed(1)} M FCFA</>}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/validations/${v.id}`}
                  style={{ minHeight: 36 }}
                  className="inline-flex items-center rounded-md bg-primary-600 px-3 text-[12px] font-medium text-white"
                >
                  Examiner
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minHeight: 40 }}
      className={clsx(
        "shrink-0 rounded-full border px-3 text-[12.5px] font-medium transition",
        active
          ? "border-primary-500 bg-primary-500 text-white"
          : "border-line bg-white text-ink-2 hover:border-primary-300"
      )}
    >
      {label}
    </button>
  );
}
