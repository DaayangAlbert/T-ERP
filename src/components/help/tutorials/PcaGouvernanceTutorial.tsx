"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaGouvernanceTutorial() {
  return (
    <>
      <p className="mb-4">
        Espace <strong>gouvernance</strong> : composition du Conseil, mandats, statuts
        des filiales, registres légaux.
      </p>

      <HelpSection title="Composition Conseil">
        <p>
          Liste des administrateurs : nom, fonction, durée mandat, date prochain
          renouvellement. Alerte si un mandat arrive à échéance &lt; 6 mois.
        </p>
      </HelpSection>

      <HelpSection title="Statuts des filiales">
        <p>
          Pour chaque filiale : capital, actionnariat, statuts à jour, dépôts annuels
          OHADA (états financiers déposés au greffe).
        </p>
      </HelpSection>

      <HelpSection title="Registres légaux">
        <p>
          Registre des PV de Conseil, registre des décisions d&apos;actionnaires,
          registre des mouvements de titres. Tous accessibles en lecture seule.
        </p>
      </HelpSection>

      <HelpTip>
        Le défaut de tenue des registres légaux est une infraction OHADA. Si tu vois
        une alerte, demande au SG de la traiter immédiatement.
      </HelpTip>
    </>
  );
}
