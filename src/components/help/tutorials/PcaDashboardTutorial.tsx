"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Tableau de bord du <strong>Propriétaire / Président du Conseil d&apos;Administration</strong> :
        vue stratégique consolidée du groupe (toutes filiales, tous chantiers).
      </p>

      <HelpSection title="Vue d&apos;ensemble">
        <p>
          Chiffre d&apos;affaires consolidé, marge brute, trésorerie groupe, effectif total,
          valeur portefeuille engagé, ratios financiers clés.
        </p>
      </HelpSection>

      <HelpSection title="Alertes stratégiques">
        <p>
          Dossiers contentieux majeurs, défauts de paiement clients gros porteur, ratios
          financiers dérivants, alertes gouvernance. Tu vois ce qui peut affecter la valeur
          patrimoniale.
        </p>
      </HelpSection>

      <HelpSection title="Lecture en mode patrimonial">
        <p>
          Cette vue est en <strong>lecture seule</strong> : le PCA ne pilote pas
          l&apos;exploitation (c&apos;est le DG) — il surveille la santé patrimoniale du
          groupe et prend les décisions stratégiques.
        </p>
      </HelpSection>

      <HelpTip>
        Pour piloter au quotidien, c&apos;est le DG qui a la main. Le PCA arbitre les
        décisions structurelles (investissements lourds, fusions, contentieux d&apos;ampleur).
      </HelpTip>
    </>
  );
}
