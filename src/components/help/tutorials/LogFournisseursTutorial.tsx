"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function LogFournisseursTutorial() {
  return (
    <>
      <p className="mb-4">
        Référentiel des <strong>fournisseurs logistiques</strong> : carburant, location,
        transport, entretien, garages partenaires.
      </p>

      <HelpSection title="Fiche fournisseur">
        <p>
          Raison sociale, contact, prestations couvertes, prix négociés (catalogue),
          conformité fiscale (CNPS, DGI). Historique des commandes passées.
        </p>
      </HelpSection>

      <HelpSection title="Évaluer un fournisseur">
        <p>
          Note interne (1-5 étoiles) sur : ponctualité livraison, qualité prestation,
          respect prix négocié, réactivité. Sert pour les futurs appels d&apos;offres.
        </p>
      </HelpSection>

      <HelpSection title="Catalogue de prix">
        <p>
          Pour les fournisseurs cadres (contrats annuels), prix négociés visibles. Lors
          d&apos;un BC, T-ERP utilise ces prix par défaut.
        </p>
      </HelpSection>

      <HelpTip>
        Vérifie la conformité fiscale (CNPS, DGI) avant chaque règlement. Badge rouge =
        à régulariser avec les Achats.
      </HelpTip>
    </>
  );
}
