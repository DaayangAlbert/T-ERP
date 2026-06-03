"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DtPortefeuilleTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Portefeuille des chantiers actifs</strong> : tous les marchés en cours
        d&apos;exécution, leur avancement physique, leur santé financière, et la conformité
        QHSE. Outil principal de pilotage technique.
      </p>

      <HelpSection title="Lecture du tableau">
        <ul className="ml-5 list-disc">
          <li><strong>Code chantier</strong> + nom + MOA + DT/CDT responsable.</li>
          <li><strong>Avancement physique</strong> : % réalisé selon le métré.</li>
          <li><strong>Avancement financier</strong> : % facturé / montant marché.</li>
          <li><strong>Marge réelle vs prévue</strong> : signal de dérive (rouge si écart &gt; 10 %).</li>
          <li><strong>QHSE</strong> : badge vert (RAS), orange (NC ouvertes), rouge (incident grave).</li>
          <li><strong>Échéance livraison</strong> : date contractuelle de fin.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Ouvrir une fiche chantier">
        <HelpSteps>
          <li>Clique sur une ligne pour accéder à la fiche détaillée.</li>
          <li>Onglets : marché, équipe, avancement, financier, QHSE, documents, planning.</li>
          <li>Bouton <strong>« Vue carto »</strong> : positionne le chantier sur la carte.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Filtrer">
        <p>
          Par MOA, par type de chantier (BTP, route, ouvrage d&apos;art), par responsable, par
          état (en cours, en réception, en garantie). Tri par échéance proche, marge faible,
          alertes QHSE.
        </p>
      </HelpSection>

      <HelpTip>
        Bonne pratique : revoir ce portefeuille <strong>chaque lundi</strong> avec ton équipe
        (DTrav, CDT) pour caler la semaine et anticiper les dérives.
      </HelpTip>
    </>
  );
}
