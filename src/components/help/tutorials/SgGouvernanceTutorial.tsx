"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function SgGouvernanceTutorial() {
  return (
    <>
      <p className="mb-4">
        Espace <strong>gouvernance juridique</strong> : tenue des registres légaux,
        organes sociaux, mandats, convocations.
      </p>

      <HelpSection title="Registres légaux">
        <p>
          Registre des PV de Conseil, registre des AG, registre des mouvements de titres,
          registre du commerce (RCCM). Tous tenus conformément OHADA.
        </p>
      </HelpSection>

      <HelpSection title="Organes sociaux">
        <p>
          Composition Conseil d&apos;Administration, mandats des administrateurs, dates
          de renouvellement. Alertes 6 mois avant expiration.
        </p>
      </HelpSection>

      <HelpSection title="Convocations & PV">
        <p>
          Préparation des convocations Conseil / AG (respect délais légaux). Rédaction
          PV, signature, archivage GED, dépôt au greffe quand requis.
        </p>
      </HelpSection>

      <HelpSection title="Conventions réglementées">
        <p>
          Transactions avec parties liées soumises à autorisation préalable + rapport
          spécial CAC. Trace ici les conventions, leur autorisation et leur exécution.
        </p>
      </HelpSection>

      <HelpTip>
        Le défaut de tenue des registres ou de respect des délais OHADA est une
        infraction. Anticipe : 30 jours avant un Conseil, prépare la convocation.
      </HelpTip>
    </>
  );
}
