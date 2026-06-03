"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtravMarcheTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue contractuelle du chantier : <strong>marché initial, avenants, ordres de service,
        pénalités, retenue de garantie</strong>. Aucun chiffre n&apos;est modifiable ici — la
        page reflète les documents signés.
      </p>

      <HelpSection title="Marché initial">
        <p>
          Bordereau, montant TTC, durée contractuelle, MOA, mode de règlement, conditions
          générales. Lien vers le contrat PDF signé (GED).
        </p>
      </HelpSection>

      <HelpSection title="Avenants">
        <p>
          Tableau des avenants successifs : numéro, objet, montant additionnel, nouvelle
          durée. Le montant marché courant est recalculé automatiquement.
        </p>
      </HelpSection>

      <HelpSection title="Ordres de service & pénalités">
        <p>
          OS reçus du MOA (démarrage, suspension, reprise), pénalités appliquées (retard de
          livraison, NC qualité). Permet de tracer toute modification du périmètre.
        </p>
      </HelpSection>

      <HelpSection title="Retenue de garantie & cautions">
        <p>
          Montant retenu sur chaque situation, caution bancaire en cours, date de levée
          prévue.
        </p>
      </HelpSection>

      <HelpTip>
        Si un chiffre semble faux, ne corrige pas ici : signale au DT, qui mettra à jour la
        pièce contractuelle source dans la GED. Cette page recalcule automatiquement après.
      </HelpTip>
    </>
  );
}
