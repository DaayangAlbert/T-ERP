"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DafFinancesTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Pilotage financier</strong> : marges par chantier, rentabilité, écarts budget vs
        réalisé, indicateurs économiques consolidés. Cette page nourrit les décisions
        stratégiques avec la DG.
      </p>

      <HelpSection title="Rentabilité par chantier">
        <p>
          Tableau de tous les chantiers actifs avec : montant marché, dépenses engagées,
          dépenses réalisées, marge prévisionnelle, marge réalisée. Repère les chantiers en
          dérive (marge réelle &lt; marge prévue).
        </p>
      </HelpSection>

      <HelpSection title="Écarts budgétaires">
        <p>
          Par poste comptable (matières, sous-traitance, personnel, frais généraux) : budget
          annuel vs réalisé YTD. Les écarts rouges (&gt; 110 % du budget) demandent
          investigation.
        </p>
      </HelpSection>

      <HelpSection title="Indicateurs économiques">
        <ul className="ml-5 list-disc">
          <li><strong>CA mensuel</strong> : courbe sur 12 mois glissants.</li>
          <li><strong>Marge brute</strong> : CA − coût direct des chantiers.</li>
          <li><strong>Charges fixes</strong> : loyer, salaires structure, amortissements.</li>
          <li><strong>EBE</strong> (excédent brut d&apos;exploitation).</li>
          <li><strong>BFR</strong> : besoin en fonds de roulement (créances − dettes fournisseurs).</li>
        </ul>
      </HelpSection>

      <HelpTip>
        Bonne pratique : revoir cette page <strong>chaque lundi matin</strong> avec ton équipe
        pour caler la semaine et préparer le point hebdomadaire avec le DG.
      </HelpTip>
    </>
  );
}
