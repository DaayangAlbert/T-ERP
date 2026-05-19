"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, AlertOctagon, Wallet, Clock, ClipboardList } from "lucide-react";
import { clsx } from "clsx";
import { useCptDashboard } from "@/hooks/useCptDashboard";
import { CptValidationsBanner } from "@/components/comptable/validations/CptValidationsBanner";

interface PendingValidation {
  id: string;
  type: string;
  reference: string;
  title: string;
  amount: number | null;
  initiator: { firstName: string; lastName: string };
  currentStep: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueDate: string | null;
  createdAt: string;
  ageDays: number;
}

interface Summary {
  total: number;
  urgentCount: number;
  totalAmount: string;
  oldestAgeDays: number;
}

export default function ComptableValidationsPage() {
  const { data: dashboard } = useCptDashboard();
  const { data, isLoading } = useQuery({
    queryKey: ["comptable", "validations-pending"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/validations/pending", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: PendingValidation[]; summary: Summary }>;
    },
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-validations">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Préparation comptable amont
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Achats et dépenses actuellement à l&apos;étape DAF — le comptable prépare la pièce justificative
            et l&apos;écriture comptable avant validation officielle.
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

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          label="En attente"
          value={data?.summary.total.toString() ?? "—"}
          icon={<ClipboardList className="h-4 w-4 text-primary-600" />}
        />
        <Kpi
          label="Urgentes / Hautes"
          value={data?.summary.urgentCount.toString() ?? "—"}
          icon={<AlertOctagon className="h-4 w-4 text-danger" />}
          accent={data?.summary.urgentCount && data.summary.urgentCount > 0 ? "danger" : undefined}
        />
        <Kpi
          label="Montant cumulé"
          value={data ? `${(Number(data.summary.totalAmount) / 1_000_000).toFixed(1)} M` : "—"}
          icon={<Wallet className="h-4 w-4 text-primary-600" />}
        />
        <Kpi
          label="Plus ancienne"
          value={data ? `${data.summary.oldestAgeDays} j` : "—"}
          icon={<Clock className="h-4 w-4 text-warning" />}
          accent={data?.summary.oldestAgeDays && data.summary.oldestAgeDays >= 7 ? "warning" : undefined}
        />
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">
            Aucune validation en attente côté DAF. Bon travail !
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((v) => (
              <li key={v.id} className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink">
                      <Link href={`/validations/${v.id}`} className="hover:text-primary-700">
                        {v.reference} — {v.title}
                      </Link>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-3">
                      <span>
                        Initié par <strong className="text-ink-2">{v.initiator.firstName} {v.initiator.lastName}</strong>
                      </span>
                      {v.amount && (
                        <span className="font-mono">· {v.amount.toLocaleString("fr-FR")} FCFA</span>
                      )}
                      <span>· {v.type}</span>
                      <span
                        className={clsx(
                          "rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                          v.ageDays >= 7 ? "bg-danger/10 text-danger" : v.ageDays >= 3 ? "bg-warning/10 text-warning" : "bg-ink-3/10 text-ink-3"
                        )}
                      >
                        {v.ageDays} j
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "rounded px-2 py-0.5 text-[11px] font-medium",
                        v.priority === "URGENT" && "bg-danger/10 text-danger",
                        v.priority === "HIGH" && "bg-warning/10 text-warning",
                        v.priority === "NORMAL" && "bg-primary-50 text-primary-700",
                        v.priority === "LOW" && "bg-ink-3/10 text-ink-3"
                      )}
                    >
                      {v.priority}
                    </span>
                    <Link
                      href={`/comptable/ecritures`}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-primary-600 px-2 text-[11.5px] font-medium text-white hover:bg-primary-700"
                      title="Ouvre la saisie d'écritures pour préparer la pièce comptable"
                    >
                      Préparer l&apos;écriture
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: "warning" | "danger";
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-white p-3 shadow-card",
        accent === "danger" && "border-danger/30 bg-danger/5",
        accent === "warning" && "border-warning/30 bg-warning/5",
        !accent && "border-line"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        {icon}
      </div>
      <div
        className={clsx(
          "mt-1 text-2xl font-bold",
          accent === "danger" && "text-danger",
          accent === "warning" && "text-warning",
          !accent && "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}
