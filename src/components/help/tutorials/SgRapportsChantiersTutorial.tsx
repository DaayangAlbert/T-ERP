"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function SgRapportsChantiersTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue lecture seule des <strong>rapports de chantier</strong> remontés par les
        Conducteurs Travaux et les Directeurs Travaux — pour synthèse juridique et
        production des rapports stratégiques.
      </p>

      <HelpSection title="Rapports CDT journaliers">
        <p>
          Filtre par chantier, période. Tu lis les rapports validés pour préparer les
          synthèses (juridiques, contentieux MOA, dossiers de défense).
        </p>
      </HelpSection>

      <HelpSection title="Rapports DTrav mensuels">
        <p>
          Synthèse mensuelle par chantier : avancement, incidents, faits marquants.
          Source pour les rapports trimestriels Conseil.
        </p>
      </HelpSection>

      <HelpSection title="Export">
        <p>
          Export PDF / Word pour intégration dans tes rapports juridiques ou tes notes
          au PCA.
        </p>
      </HelpSection>

      <HelpTip>
        Pour un contentieux MOA, les rapports journaliers validés sont
        <strong> juridiquement opposables</strong>. Ils servent de pièces de défense ou
        d&apos;attaque.
      </HelpTip>
    </>
  );
}
