"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function LogBcTutorial() {
  return (
    <>
      <p className="mb-4">
        Bons de commande <strong>logistiques</strong> : carburant, location d&apos;engins,
        transport sous-traité, entretien véhicules.
      </p>

      <HelpSection title="Émettre un BC">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau BC »</strong>.</li>
          <li>Fournisseur logistique (catalogue référencé).</li>
          <li>Articles/prestations (carburant, location, entretien…).</li>
          <li>Affectation analytique (chantier ou direction).</li>
          <li>Soumets pour validation selon montant (N1, N2, N3…).</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Suivi">
        <p>
          Statut : brouillon, soumis, validé, en cours, livré, clôturé. Une fois
          livré, la réception alimente la compta.
        </p>
      </HelpSection>

      <HelpTip>
        Toujours rattacher l&apos;achat à un <strong>chantier</strong> ou une
        <strong> direction</strong> — sinon impossible de calculer la marge réelle du
        chantier en fin de mois.
      </HelpTip>
    </>
  );
}
