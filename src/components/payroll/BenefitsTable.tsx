"use client";

import { Home, Car, Fuel, Phone, Heart, MoreHorizontal } from "lucide-react";
import { useBenefitsInKind } from "@/hooks/useDgProfile";
import { BenefitType } from "@prisma/client";
import { formatFCFA } from "@/lib/format";

const TYPE_ICON: Record<BenefitType, React.ReactNode> = {
  HOUSING: <Home className="h-4 w-4 text-primary-500" />,
  VEHICLE: <Car className="h-4 w-4 text-info" />,
  FUEL: <Fuel className="h-4 w-4 text-warning" />,
  PHONE: <Phone className="h-4 w-4 text-success" />,
  INSURANCE: <Heart className="h-4 w-4 text-danger" />,
  OTHER: <MoreHorizontal className="h-4 w-4 text-ink-3" />,
};

const TYPE_LABEL: Record<BenefitType, string> = {
  HOUSING: "Logement",
  VEHICLE: "Véhicule",
  FUEL: "Carburant",
  PHONE: "Téléphone",
  INSURANCE: "Assurance / Mutuelle",
  OTHER: "Autre",
};

export function BenefitsTable() {
  const { data, isLoading } = useBenefitsInKind();
  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Avantages mensuels" value={formatFCFA(BigInt(data.summary.totalMonthly))} />
        <Stat label="Valeur fiscale (CNPS)" value={formatFCFA(BigInt(data.summary.totalFiscal))} />
        <Stat label="Annualisé" value={formatFCFA(BigInt(data.summary.totalAnnual))} highlight />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Type</th>
              <th className="py-2 text-left">Description</th>
              <th className="py-2 text-right">Valeur réelle/mois</th>
              <th className="py-2 text-right">Valeur fiscale/mois</th>
              <th className="py-2 pr-3 text-left">Période</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink-3">Aucun avantage en nature enregistré.</td>
              </tr>
            ) : (
              data.items.map((b) => (
                <tr key={b.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                      {TYPE_ICON[b.type]} {TYPE_LABEL[b.type]}
                    </span>
                  </td>
                  <td className="py-2 text-ink-2">{b.description}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(BigInt(b.monthlyValue))}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-ink-3">{formatFCFA(BigInt(b.fiscalValue))}</td>
                  <td className="py-2 pr-3 text-[11.5px] text-ink-3">
                    Depuis {new Date(b.startDate).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-ink-3">
        ⓘ Valeur fiscale calculée selon barème CNPS Cameroun (forfait pour logement, % pour véhicule).
      </p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"rounded-lg border p-3 shadow-card " + (highlight ? "border-primary-300 bg-primary-50" : "border-line bg-white")}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={"mt-1 font-mono text-[18px] font-bold " + (highlight ? "text-primary-800" : "text-ink")}>{value}</div>
    </div>
  );
}
