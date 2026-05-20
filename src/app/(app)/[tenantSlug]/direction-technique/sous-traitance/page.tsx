"use client";

import { useState } from "react";
import { Star, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { useDtSubcontractors } from "@/hooks/useDtSubcontractors";

const SPECIALTY_LABEL: Record<string, string> = {
  EARTHWORKS_HEAVY: "Terrassement",
  ROOFING_WATERPROOFING: "Étanchéité",
  ELECTRICAL: "Électricité",
  PLUMBING: "Plomberie",
  HVAC: "CVC",
  PAINTING: "Peinture",
  TILING: "Carrelage",
  JOINERY: "Menuiserie",
  METALWORK: "Métallerie",
  GLAZING: "Vitrerie",
  DEMOLITION: "Démolition",
  CRANE: "Grues",
  OTHER: "Autre",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={clsx(
            "h-3 w-3",
            i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"
          )}
        />
      ))}
      <span className="ml-1 text-[10.5px] font-semibold text-ink-2">{rating.toFixed(1)}</span>
    </span>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
}

export default function DtSubcontractorsPage() {
  const [specialty, setSpecialty] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [fiscalOk, setFiscalOk] = useState(false);
  const { data, isLoading } = useDtSubcontractors({ specialty, minRating, fiscalOk });

  return (
    <div className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Sous-traitance technique
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Référentiel sous-traitants qualifiés, contrats-cadres et évaluations.
        </p>
      </header>

      {data && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { label: "Qualifiés", v: data.kpis.qualifiedCount.toString() },
            { label: "Framework actifs", v: data.kpis.frameworkActiveCount.toString() },
            { label: "Engagements en cours", v: `${fmt(data.kpis.activeEngagements)} FCFA` },
            { label: "Évaluations à faire", v: data.kpis.pendingEvaluations.toString() },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-line bg-white px-3 py-2.5">
              <div className="text-[20px] font-bold leading-none text-ink">{k.v}</div>
              <div className="mt-1 text-[11.5px] text-ink-2">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-3">
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="h-9 rounded-md border border-line-2 bg-white px-2 text-[12.5px]"
        >
          <option value="">Toutes spécialités</option>
          {Object.entries(SPECIALTY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={minRating}
          onChange={(e) => setMinRating(parseFloat(e.target.value))}
          className="h-9 rounded-md border border-line-2 bg-white px-2 text-[12.5px]"
        >
          <option value={0}>Toute notation</option>
          <option value={3}>≥ 3 étoiles</option>
          <option value={4}>≥ 4 étoiles</option>
          <option value={4.5}>≥ 4.5 étoiles</option>
        </select>
        <label className="inline-flex items-center gap-2 px-2 text-[12.5px]">
          <input
            type="checkbox"
            checked={fiscalOk}
            onChange={(e) => setFiscalOk(e.target.checked)}
            className="h-4 w-4 accent-primary-500"
          />
          Conformité fiscale OK
        </label>
      </div>

      {isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : (
        <div className="rounded-xl border border-line bg-white">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Raison sociale</th>
                  <th className="px-3 py-2 text-left font-medium">Spécialités</th>
                  <th className="px-3 py-2 text-left font-medium">Notation</th>
                  <th className="px-3 py-2 text-left font-medium">Conformité fiscale</th>
                  <th className="px-3 py-2 text-right font-medium">Évaluations</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => {
                  const cnps = s.fiscalCompliance?.cnps;
                  const dgi = s.fiscalCompliance?.dgi;
                  const fiscalOk = cnps === "OK" && dgi === "OK";
                  return (
                    <tr key={s.id} className="border-t border-line hover:bg-surface-alt/60">
                      <td className="px-3 py-2 font-medium text-ink">{s.name}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {s.specialties.map((sp) => (
                            <span
                              key={sp}
                              className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700"
                            >
                              {SPECIALTY_LABEL[sp] ?? sp}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <StarRating rating={s.internalRating} />
                      </td>
                      <td className="px-3 py-2">
                        {fiscalOk ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            ✓ OK (CNPS + DGI)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <AlertCircle className="h-3 w-3" /> À vérifier
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.evaluationsCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile : cards */}
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {data.items.map((s) => {
              const cnps = s.fiscalCompliance?.cnps;
              const dgi = s.fiscalCompliance?.dgi;
              const fiscalOk = cnps === "OK" && dgi === "OK";
              return (
                <div key={s.id} className="rounded-lg border border-line bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13px] font-semibold text-ink">{s.name}</div>
                    <StarRating rating={s.internalRating} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.specialties.map((sp) => (
                      <span
                        key={sp}
                        className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700"
                      >
                        {SPECIALTY_LABEL[sp] ?? sp}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1",
                        fiscalOk ? "text-emerald-700" : "text-amber-700"
                      )}
                    >
                      {fiscalOk ? "✓ Fiscal OK" : "⚠ Fiscal à vérifier"}
                    </span>
                    <span className="text-ink-3">{s.evaluationsCount} évaluations</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
