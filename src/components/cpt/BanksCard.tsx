"use client";

import { useDafTreasury } from "@/hooks/useDafTreasury";
import { BanksSection } from "@/components/daf/treasury/BanksSection";

/**
 * Encapsule la gestion des comptes bancaires réels (création / édition /
 * clôture) pour l'afficher dans l'espace Comptabilité analytique, à côté des
 * comptes projet et du compte salaire. Réutilise BanksSection (page Trésorerie).
 */
export function BanksCard() {
  const { data, isLoading, isError } = useDafTreasury();

  if (isError) {
    return (
      <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Erreur de chargement des comptes bancaires.
      </section>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      {isLoading || !data ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-surface-alt" />)}
        </div>
      ) : (
        <BanksSection items={data.items} />
      )}
    </div>
  );
}
