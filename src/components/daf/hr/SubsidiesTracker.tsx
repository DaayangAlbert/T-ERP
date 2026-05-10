"use client";

import { GraduationCap, HandCoins, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { useSubsidies } from "@/hooks/useDafHr";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClasses(s: string): string {
  if (s === "ACTIVE") return "bg-emerald-100 text-emerald-800";
  if (s === "PENDING_PAYMENT") return "bg-amber-100 text-amber-800";
  if (s === "PAID") return "bg-primary-100 text-primary-800";
  return "bg-surface-alt text-ink-3";
}

export function SubsidiesTracker() {
  const { data, isLoading } = useSubsidies();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-ink-3">
            <HandCoins className="h-3.5 w-3.5 text-emerald-600" /> Aides à l&apos;emploi attendues
          </div>
          <div className="mt-1 font-mono text-[16px] font-bold text-ink">{fmt(data.summary.totalEmploymentExpected)}</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-ink-3">
            <ShieldCheck className="h-3.5 w-3.5 text-primary-600" /> Exonérations / mois
          </div>
          <div className="mt-1 font-mono text-[16px] font-bold text-ink">{fmt(data.summary.monthlyExemptionTotal)}</div>
          <div className="text-[10.5px] text-ink-3">≈ {fmt(data.summary.annualExemptionTotal)} / an</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-ink-3">
            <GraduationCap className="h-3.5 w-3.5 text-amber-600" /> Crédits formation à récupérer
          </div>
          <div className="mt-1 font-mono text-[16px] font-bold text-ink">{fmt(data.summary.remainingTrainingCredits)}</div>
        </div>
      </div>

      {/* Aides à l'emploi */}
      <div className="rounded-xl border border-line bg-white p-3">
        <h3 className="text-[13px] font-semibold text-ink">Aides à l&apos;emploi en cours</h3>
        <div className="mt-2 space-y-1.5">
          {data.employmentAids.map((a) => (
            <div key={a.ref} className="rounded-md border border-line bg-white p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-ink">{a.scheme}</div>
                  <div className="text-[11.5px] text-ink-3">{a.description}</div>
                  <div className="mt-1 font-mono text-[10.5px] text-ink-3">{a.ref} · échéance {fmtDate(a.endDate)}</div>
                </div>
                <div className="text-right">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", statusClasses(a.status))}>{a.status}</span>
                  <div className="mt-1 font-mono text-[12.5px] font-bold text-ink">{fmt(a.expectedAmount)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exonérations charges */}
      <div className="rounded-xl border border-line bg-white p-3">
        <h3 className="text-[13px] font-semibold text-ink">Exonérations charges sociales</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {data.exemptions.map((e) => (
            <div key={e.type} className="rounded-md border border-line bg-surface-alt p-2.5">
              <div className="text-[12px] font-semibold text-ink">{e.type}</div>
              <div className="text-[11.5px] text-ink-3">{e.count} salarié{e.count > 1 ? "s" : ""} concernés</div>
              <div className="mt-1 font-mono text-[12.5px] font-bold text-emerald-700">{fmt(e.monthlySaving)} / mois</div>
            </div>
          ))}
        </div>
      </div>

      {/* Crédits formation */}
      <div className="rounded-xl border border-line bg-white p-3">
        <h3 className="text-[13px] font-semibold text-ink">Crédits formation</h3>
        <div className="mt-2 hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left">Provider</th>
                <th className="px-3 py-2 text-right">Année</th>
                <th className="px-3 py-2 text-right">Cumulé</th>
                <th className="px-3 py-2 text-right">Récupéré</th>
                <th className="px-3 py-2 text-right">Restant</th>
                <th className="px-3 py-2 text-right">Expire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.trainingCredits.map((c) => (
                <tr key={`${c.provider}-${c.year}`} className="hover:bg-surface-alt/40">
                  <td className="px-3 py-2 font-medium text-ink">{c.provider}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-ink-3">{c.year}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(c.accumulated)}</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">{fmt(c.recovered)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-ink">{fmt(c.remaining)}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-ink-3">{fmtDate(c.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2 md:hidden">
          {data.trainingCredits.map((c) => (
            <div key={`${c.provider}-${c.year}`} className="rounded-md border border-line bg-white p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-ink">{c.provider} {c.year}</span>
                <span className="font-mono text-[12px] text-ink">{fmt(c.remaining)}</span>
              </div>
              <div className="text-[11px] text-ink-3">Récupéré {fmt(c.recovered)} / {fmt(c.accumulated)} · expire {fmtDate(c.expiresAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
