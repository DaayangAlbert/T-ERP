"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function GedDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Tableau de bord de la <strong>Gestion Électronique de Documents (GED)</strong> :
        volumétrie totale, dépôts récents, workflows en cours, alertes de péremption.
      </p>

      <HelpSection title="KPIs">
        <p>
          Volume total stocké, documents ajoutés ce mois, workflows actifs, documents
          dont la péremption approche (contrats, cautions, assurances).
        </p>
      </HelpSection>

      <HelpSection title="Activité récente">
        <p>
          Frise des derniers dépôts, signatures, validations. Permet de voir d&apos;un
          coup d&apos;œil ce qui bouge dans la GED.
        </p>
      </HelpSection>

      <HelpSection title="Espaces les plus actifs">
        <p>
          Top des espaces (Marchés, RH, Comptable, Chantiers…) par nombre de dépôts.
        </p>
      </HelpSection>

      <HelpTip>
        La GED est le système nerveux documentaire de l&apos;entreprise. Tout document
        contractuel doit y être déposé — pas conservé en local sur un poste.
      </HelpTip>
    </>
  );
}
