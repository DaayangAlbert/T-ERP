"use client";

import Link from "next/link";
import { Plus, FileText, Building2 } from "lucide-react";
import { useSiteContracts } from "@/hooks/useSites";
import { formatFCFA, formatDate } from "@/lib/format";
import { clsx } from "clsx";

export function ContractsList() {
  const { data, isLoading } = useSiteContracts();

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Marchés" value={String(data.summary.total)} />
        <Stat label="Marchés publics" value={String(data.summary.publicCount)} />
        <Stat label="Cumul actuel" value={formatFCFA(BigInt(data.summary.totalCurrent))} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[820px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Référence</th>
              <th className="py-2 text-left">Chantier</th>
              <th className="py-2 text-left">MOA</th>
              <th className="py-2 text-right">Montant initial</th>
              <th className="py-2 text-right">Avenants</th>
              <th className="py-2 text-right">Cumul</th>
              <th className="py-2 text-left">Signé le</th>
              <th className="py-2 pr-3 text-center">Public</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-ink-3">
                  Aucun contrat enregistré.
                </td>
              </tr>
            ) : (
              data.items.map((c) => {
                const initial = BigInt(c.initialAmount);
                const current = BigInt(c.currentAmount);
                const delta = current - initial;
                return (
                  <tr key={c.id} className="border-t border-line hover:bg-surface-alt">
                    <td className="py-2 pl-3 font-mono text-[11.5px]">{c.reference}</td>
                    <td className="py-2">
                      <Link href={`/chantiers/${c.site.id}`} className="text-ink hover:text-primary-700">
                        {c.site.name}
                      </Link>
                      <div className="text-[10.5px] text-ink-3">{c.site.code}</div>
                    </td>
                    <td className="py-2">
                      {c.publicMarket && c.procuringEntity && (
                        <span className="rounded bg-info/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-info">
                          {c.procuringEntity}
                        </span>
                      )}
                      <div className="mt-0.5 text-ink-2">{c.site.client}</div>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(initial)}</td>
                    <td className="py-2 text-right">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                          c.amendmentsCount > 0
                            ? "bg-warning/10 text-warning"
                            : "bg-ink-3/10 text-ink-3"
                        )}
                        title={delta >= 0n ? `+${formatFCFA(delta)}` : `−${formatFCFA(-delta)}`}
                      >
                        <FileText className="h-3 w-3" />
                        {c.amendmentsCount}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums font-semibold">
                      {formatFCFA(current)}
                    </td>
                    <td className="py-2 text-[11.5px] text-ink-3">
                      {c.signedAt ? formatDate(c.signedAt) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      {c.publicMarket ? (
                        <Building2 className="mx-auto h-3.5 w-3.5 text-info" />
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-dashed border-line bg-surface-alt p-3 text-center text-[12px] text-ink-3">
        <Plus className="mr-1 inline h-3 w-3" /> Création d'un nouveau marché : ouvrir le chantier puis « Ajouter un avenant ».
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-card">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}
