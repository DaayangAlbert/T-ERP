"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function MagDemandesTutorial() {
  return (
    <>
      <p className="mb-4">
        File des <strong>demandes de matériel</strong> émises par les chantiers : à
        préparer, à arbitrer si stock insuffisant.
      </p>

      <HelpSection title="Trier la file">
        <p>
          Par urgence (badge rouge en premier), par chantier, par date. Le badge
          <strong> « URGENT »</strong> doit être traité dans la journée.
        </p>
      </HelpSection>

      <HelpSection title="Préparer une demande">
        <HelpSteps>
          <li>Tape la demande → fiche détail.</li>
          <li>Pour chaque article : quantité demandée vs stock dispo.</li>
          <li>Bouton <strong>« Préparer »</strong> → passe à l&apos;étape sortie.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Refuser ou ajourner">
        <p>
          Si la demande est injustifiée ou impossible à honorer rapidement : bouton
          <strong> « Refuser »</strong> avec motif → notifie le demandeur. Pour ajourner
          le temps de recevoir un appro, statut <strong>« En attente »</strong>.
        </p>
      </HelpSection>

      <HelpTip>
        Traite la file <strong>en début et fin de journée</strong>. Les chefs de chantier
        attendent leurs livraisons pour démarrer le lendemain.
      </HelpTip>
    </>
  );
}
