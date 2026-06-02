"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DgReportingCaTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Reporting CA</strong> : suivi du chiffre d&apos;affaires consolidé, ventilé par
        chantier, par MOA, par mois. Comparaison avec le budget annuel et l&apos;année
        précédente.
      </p>

      <HelpSection title="Vue d'ensemble">
        <ul className="ml-5 list-disc">
          <li><strong>CA YTD</strong> : cumul depuis le 1ᵉʳ janvier.</li>
          <li><strong>CA mensuel</strong> : courbe sur 12 mois glissants.</li>
          <li><strong>Atteinte budget</strong> : % du budget annuel réalisé.</li>
          <li><strong>Évolution N-1</strong> : comparaison vs même mois année précédente.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Détail par chantier">
        <p>
          Top des chantiers contributeurs au CA. Colonne « Reste à facturer » = montant du
          marché − situations déjà émises. Permet d&apos;anticiper la fin de chantier.
        </p>
      </HelpSection>

      <HelpSection title="Créer un reporting personnalisé">
        <p>
          Bouton <strong>« Nouveau reporting CA »</strong> : choisis période, filiales,
          chantiers, MOA. Le rapport généré est sauvegardé et accessible par tous les DG/DAF
          ultérieurement.
        </p>
      </HelpSection>

      <HelpTip>
        Le CA affiché est <strong>HT</strong>. Les situations clients incluent automatiquement
        la TVA, retenue garantie et retenue source — elles sont neutralisées dans le calcul du
        CA pour respecter la norme SYSCOHADA.
      </HelpTip>
    </>
  );
}
