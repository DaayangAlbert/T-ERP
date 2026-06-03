"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function LogStatsTutorial() {
  return (
    <>
      <p className="mb-4">
        Indicateurs <strong>analytiques logistiques</strong> : coûts par chantier,
        consommation carburant, taux d&apos;immobilisation flotte.
      </p>

      <HelpSection title="Sélection de période">
        <p>
          Période mois / trimestre / année. Tous les graphiques s&apos;ajustent.
        </p>
      </HelpSection>

      <HelpSection title="Coût logistique par chantier">
        <p>
          Total dépenses (carburant, location, transport, entretien) ramené par
          chantier. Identifier les chantiers où la logistique pèse lourdement vs
          objectif.
        </p>
      </HelpSection>

      <HelpSection title="Conso carburant">
        <p>
          Litres consommés vs kilométrage par véhicule. Détecte les anomalies (vol de
          carburant, conduite agressive, fuites).
        </p>
      </HelpSection>

      <HelpSection title="Taux d&apos;immobilisation">
        <p>
          Heures de panne / heures théoriques par engin. Un taux &gt; 15 % indique un
          problème d&apos;entretien ou de matériel vieillissant à renouveler.
        </p>
      </HelpSection>

      <HelpTip>
        Exporte les statistiques pour le reporting mensuel au DAF — bouton Excel/PDF
        en haut à droite.
      </HelpTip>
    </>
  );
}
