"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function SgContentieuxTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>contentieux</strong> de l&apos;entreprise : litiges clients,
        fournisseurs, sociaux, fiscaux.
      </p>

      <HelpSection title="Ouvrir un contentieux">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau contentieux »</strong>.</li>
          <li>Type : client, fournisseur, social, fiscal, autre.</li>
          <li>Adversaire, objet, enjeu financier estimé.</li>
          <li>Avocat partenaire assigné.</li>
          <li>Date de saisine, juridiction, n° dossier.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Suivi des audiences">
        <p>
          Pour chaque dossier : prochaine audience, état d&apos;avancement, dernières
          conclusions échangées. Notifications J-7 avant audience.
        </p>
      </HelpSection>

      <HelpSection title="Provisionnement">
        <p>
          Estimation du risque financier (gain/perte probable). Permet à la comptabilité
          de provisionner correctement dans les états financiers.
        </p>
      </HelpSection>

      <HelpSection title="Documents">
        <p>
          PJ : assignation, conclusions adverses, conclusions nos, jugement. Archivage
          systématique en GED espace « Juridique ».
        </p>
      </HelpSection>

      <HelpTip>
        Un contentieux fiscal &gt; 100 M FCFA = alerte DG + PCA immédiate. Ne jamais
        laisser pourrir un dossier — les pénalités s&apos;accumulent.
      </HelpTip>
    </>
  );
}
