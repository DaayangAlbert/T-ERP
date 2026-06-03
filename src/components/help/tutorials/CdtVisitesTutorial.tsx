"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CdtVisitesTutorial() {
  return (
    <>
      <p className="mb-4">
        Tenue du <strong>registre des visites chantier</strong> : MOA, MOE, BCT, inspection
        du travail, fournisseurs, élus locaux.
      </p>

      <HelpSection title="Saisir une visite">
        <HelpSteps>
          <li>Bouton <strong>« Nouvelle visite »</strong>.</li>
          <li>Date + heure d&apos;arrivée et de départ.</li>
          <li>Type : MOA, MOE, BCT, inspection, fournisseur, autre.</li>
          <li>Personnes présentes (nom + fonction).</li>
          <li>Objet + compte-rendu succinct.</li>
          <li>Photo (recommandé) + PJ si compte-rendu écrit reçu.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Décisions actées">
        <p>
          Si la visite a abouti à une décision (modification, point d&apos;arrêt levé,
          réserve…) : champ <strong>« Décisions »</strong> + transmission au DTrav. Le
          registre vaut PV opposable.
        </p>
      </HelpSection>

      <HelpSection title="Visites récurrentes">
        <p>
          Réunion MOA hebdo, visite MOE quinzaine, inspection trimestrielle… Peuvent être
          créées en récurrence via <strong>« Planifier une visite »</strong>.
        </p>
      </HelpSection>

      <HelpTip>
        En cas de contentieux avec le MOA, ce registre est <strong>juridiquement opposable</strong> :
        prends l&apos;habitude de saisir chaque visite, même informelle.
      </HelpTip>
    </>
  );
}
