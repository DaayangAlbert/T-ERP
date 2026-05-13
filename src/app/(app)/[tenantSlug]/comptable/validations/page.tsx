"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCptDashboard } from "@/hooks/useCptDashboard";
import { CptValidationsBanner } from "@/components/comptable/validations/CptValidationsBanner";

interface PendingValidation {
  id: string;
  type: string;
  reference: string;
  title: string;
  amount: number | null;
  initiator: { firstName: string; lastName: string };
  priority: string;
  dueDate: string | null;
  createdAt: string;
}

export default function ComptableValidationsPage() {
  const { data: dashboard } = useCptDashboard();
  const { data, isLoading } = useQuery({
    queryKey: ["comptable", "validations-pending"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/validations/pending", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: PendingValidation[] }>;
    },
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-validations">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Mes validations N1</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            BC &lt; 5 M FCFA · notes de frais · demandes d'avances · validation comptabilisation factures.
          </p>
        </div>
        <Link
          href="/validations"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300"
        >
          Tout le circuit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <CptValidationsBanner isDirection={dashboard?.scope.isDirection ?? false} siteCount={dashboard?.scope.siteCount} />

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">
            Aucune validation en attente. Bon travail !
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.items.map((v) => (
              <li key={v.id} className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-ink">
                      <Link href={`/validations/${v.id}`} className="hover:text-primary-700">
                        {v.reference} — {v.title}
                      </Link>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-ink-3">
                      Initié par {v.initiator.firstName} {v.initiator.lastName} ·
                      {v.amount ? ` ${(v.amount / 1_000_000).toFixed(1)} M FCFA` : ""}
                    </div>
                  </div>
                  <span
                    className={
                      v.priority === "URGENT"
                        ? "rounded bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger"
                        : v.priority === "HIGH"
                          ? "rounded bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning"
                          : "rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700"
                    }
                  >
                    {v.priority}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
