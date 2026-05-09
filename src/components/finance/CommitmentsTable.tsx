"use client";

import { ShieldCheck, AlertTriangle } from "lucide-react";
import { useCommitments } from "@/hooks/useFinance";
import { CommitmentType, CommitmentStatus } from "@prisma/client";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const TYPE_LABEL: Record<CommitmentType, string> = {
  BANK_GUARANTEE: "Caution bancaire",
  FIRST_DEMAND_GUARANTEE: "Garantie 1ère demande",
  LETTER_CREDIT: "Crédit documentaire",
  PURCHASE_COMMITMENT: "Engagement d'achat",
};

const STATUS_BADGE: Record<CommitmentStatus, string> = {
  ACTIVE: "bg-success/10 text-success",
  EXPIRED: "bg-ink-3/10 text-ink-3",
  RELEASED: "bg-info/10 text-info",
  CALLED: "bg-danger/10 text-danger",
};

export function CommitmentsTable() {
  const { data, isLoading } = useCommitments();
  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const ratio = data.summary.ratioToEquity;
  const ratioTone = ratio > 50 ? "danger" : ratio > 30 ? "warning" : "ok";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Engagements actifs" value={String(data.summary.active)} icon={<ShieldCheck className="h-4 w-4 text-success" />} />
        <Stat label="Total actif" value={formatFCFA(BigInt(data.summary.totalActiveAmount))} />
        <Stat label="Capitaux propres" value={formatFCFA(BigInt(data.summary.equityProxy))} />
        <Stat
          label="Engagements / FP"
          value={`${ratio.toFixed(1).replace(".", ",")} %`}
          icon={ratioTone === "danger" ? <AlertTriangle className="h-4 w-4 text-danger" /> : null}
          tone={ratioTone}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[760px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Type</th>
              <th className="py-2 text-left">Référence</th>
              <th className="py-2 text-left">Banque</th>
              <th className="py-2 text-left">Bénéficiaire</th>
              <th className="py-2 text-right">Montant</th>
              <th className="py-2 text-left">Échéance</th>
              <th className="py-2 pr-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-3">Aucun engagement enregistré.</td>
              </tr>
            ) : (
              data.items.map((c) => (
                <tr key={c.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3 text-ink-2">{TYPE_LABEL[c.type]}</td>
                  <td className="py-2 font-mono text-[11.5px]">{c.reference ?? "—"}</td>
                  <td className="py-2 text-ink-2">{c.bank ?? "—"}</td>
                  <td className="py-2 text-ink-2">{c.beneficiary ?? "—"}</td>
                  <td className="py-2 text-right font-mono tabular-nums font-semibold">{formatFCFA(BigInt(c.amount))}</td>
                  <td className="py-2 text-[11.5px] text-ink-3">{formatDate(c.maturityDate)}</td>
                  <td className="py-2 pr-3 text-center">
                    <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_BADGE[c.status])}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon?: React.ReactNode; tone?: "ok" | "warning" | "danger" }) {
  return (
    <div
      className={clsx(
        "rounded-lg border p-3 shadow-card",
        tone === "danger" && "border-danger/30 bg-danger/5",
        tone === "warning" && "border-warning/30 bg-warning/5",
        (!tone || tone === "ok") && "border-line bg-white"
      )}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}
