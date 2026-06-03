"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CdtQualiteTutorial() {
  return (
    <>
      <p className="mb-4">
        Pilotage de la <strong>qualité chantier</strong> : non-conformités (NC), demandes
        de modification (DM), points d&apos;arrêt, contrôles à programmer.
      </p>

      <HelpSection title="Saisir une NC">
        <HelpSteps>
          <li>Bouton <strong>« Nouvelle NC »</strong>.</li>
          <li>Lot/ouvrage concerné, description, gravité (mineure/majeure/critique).</li>
          <li>Photo obligatoire (preuve terrain).</li>
          <li>Action corrective proposée + responsable + délai.</li>
          <li>Valider — notifie le DTrav et le QHSE.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Lever une NC">
        <p>
          Quand l&apos;action est faite, bouton <strong>« Clore »</strong> + photo de la
          remise en conformité. Une NC critique reste ouverte tant qu&apos;un contrôle MOE
          n&apos;a pas validé.
        </p>
      </HelpSection>

      <HelpSection title="Points d&apos;arrêt">
        <p>
          Étapes où la production est suspendue tant que le MOE/BCT n&apos;a pas signé
          (ex. coulage béton fondation, étanchéité). Bouton <strong>« Convoquer le MOE »</strong>
          envoie un email automatique avec créneau.
        </p>
      </HelpSection>

      <HelpTip>
        Toute NC <strong>critique</strong> non close à J+3 remonte automatiquement au DT
        et au DG. Traite-les en priorité.
      </HelpTip>
    </>
  );
}
