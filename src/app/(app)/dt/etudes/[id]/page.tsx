"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useDtTenderDetail } from "@/hooks/useDtTenders";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Md FCFA`;
  return `${Math.round(n / 1_000_000).toLocaleString("fr-FR")} M FCFA`;
}

const STAGE_LABEL: Record<string, string> = {
  OPPORTUNITY: "Opportunité",
  DCE_ANALYSIS: "Analyse DCE",
  TECHNICAL_STUDY: "Étude technique",
  PRICING: "Chiffrage",
  SUBCONTRACTOR_QUOTES: "Cotation ST",
  INTERNAL_VALIDATION: "Validation interne",
  SUBMITTED: "Remis",
  RESULTS_PENDING: "Résultats en attente",
  WON: "Gagné",
  LOST: "Perdu",
};

export default function TenderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useDtTenderDetail(params.id);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3">
      <header className="border-b border-line pb-3">
        <Link
          href="/dt/etudes"
          className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" /> Tous les AO
        </Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="font-mono text-[11px] text-ink-3">{data.reference}</div>
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {data.title}
            </h1>
            <p className="mt-1 text-[12.5px] text-ink-3">
              MOA : {data.moaName} ({data.moaType}) · Étape :{" "}
              <strong>{STAGE_LABEL[data.stage] ?? data.stage}</strong>
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-ink-3">Probabilité</div>
            <div className="text-[20px] font-bold text-ink">{data.probability} %</div>
          </div>
        </div>
      </header>

      {/* 3 onglets côte à côte desktop, accordions empilés mobile */}
      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-white p-3">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Marché
          </h3>
          <dl className="space-y-1 text-[12px]">
            <div className="flex justify-between">
              <dt className="text-ink-3">Type travaux</dt>
              <dd className="font-medium">{data.workType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Budget estimé</dt>
              <dd className="font-mono font-medium">{fmt(data.estimatedBudget)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Date remise</dt>
              <dd className="font-medium">
                {format(new Date(data.submissionDeadline), "dd MMM yyyy", { locale: fr })}
              </dd>
            </div>
            {data.ourBidAmount && (
              <div className="flex justify-between">
                <dt className="text-ink-3">Notre offre</dt>
                <dd className="font-mono font-medium">{fmt(data.ourBidAmount)}</dd>
              </div>
            )}
            {data.ourMargin !== null && (
              <div className="flex justify-between">
                <dt className="text-ink-3">Marge proposée</dt>
                <dd className="font-medium">{data.ourMargin.toFixed(1)} %</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-white p-3">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Coût étude
          </h3>
          <div className="text-[24px] font-bold text-ink">{fmt(data.studyCost)}</div>
          <p className="mt-1 text-[11.5px] text-ink-3">
            Pilote étude : {data.studyOwner ?? "—"}
          </p>
        </section>

        <section className="rounded-xl border border-line bg-white p-3">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Récap chiffrage BPU
          </h3>
          <dl className="space-y-1 text-[12px]">
            <div className="flex justify-between">
              <dt className="text-ink-3">Total BPU</dt>
              <dd className="font-mono font-semibold">{fmt(data.pricingSummary.totalBpu)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Budget cible</dt>
              <dd className="font-mono">{fmt(data.pricingSummary.estimatedBudget)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Écart</dt>
              <dd
                className={`font-mono font-semibold ${data.pricingSummary.gap < 0 ? "text-emerald-700" : "text-amber-700"}`}
              >
                {data.pricingSummary.gap > 0 ? "+" : ""}
                {fmt(data.pricingSummary.gap)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* BPU/DQE table — scroll horizontal sur mobile */}
      <section className="rounded-xl border border-line bg-white">
        <header className="border-b border-line px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-ink">
            Bordereau prix unitaires (BPU/DQE)
          </h2>
          <p className="text-[11px] text-ink-3">{data.items.length} articles</p>
        </header>
        {data.items.length === 0 ? (
          <p className="p-4 text-[12px] text-ink-3">Aucun article BPU saisi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Code</th>
                  <th className="px-3 py-2 text-left font-medium">Désignation</th>
                  <th className="px-3 py-2 text-left font-medium">Unité</th>
                  <th className="px-3 py-2 text-right font-medium">Qté</th>
                  <th className="px-3 py-2 text-right font-medium">PU</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} className="border-t border-line">
                    <td className="px-3 py-2 font-mono text-[11px]">{it.code}</td>
                    <td className="px-3 py-2 text-ink">{it.designation}</td>
                    <td className="px-3 py-2 text-ink-2">{it.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {it.unitPrice.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                      {(it.totalPrice / 1_000_000).toFixed(2)} M
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-surface-alt">
                  <td colSpan={5} className="px-3 py-2 text-right font-semibold text-ink">
                    Total BPU
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-ink">
                    {fmt(data.pricingSummary.totalBpu)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
