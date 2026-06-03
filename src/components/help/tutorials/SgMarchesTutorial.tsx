"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function SgMarchesTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>marchés contractuels</strong> de l&apos;entreprise : marchés
        principaux, avenants, garanties, cautions.
      </p>

      <HelpSection title="Liste des marchés">
        <p>
          Pour chaque marché : MOA, objet, montant initial, avenants signés, montant
          courant, date de signature, date de fin contractuelle.
        </p>
      </HelpSection>

      <HelpSection title="Garanties & cautions">
        <p>
          Caution bancaire restitution acompte (5 %), retenue de garantie (5 %), caution
          de soumission. Suivi des montants et dates de libération.
        </p>
      </HelpSection>

      <HelpSection title="Avenants">
        <p>
          Tableau des avenants signés ou en cours : objet, impact financier, impact
          délai, statut (proposé, négocié, signé, refusé).
        </p>
      </HelpSection>

      <HelpSection title="Risques">
        <p>
          Marchés en alerte : retard livraison, contestation, médiation en cours,
          contentieux ouvert. Croisé avec la page Contentieux.
        </p>
      </HelpSection>

      <HelpTip>
        La libération de la retenue de garantie 12 mois après réception définitive =
        cash récupéré. Suis-le activement, c&apos;est souvent oublié.
      </HelpTip>
    </>
  );
}
