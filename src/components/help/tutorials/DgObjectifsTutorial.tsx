"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DgObjectifsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Mes objectifs annuels</strong> en tant que DG : KPI cibles définis avec le
        Conseil d&apos;Administration et suivi de leur réalisation.
      </p>

      <HelpSection title="Types d'objectifs">
        <ul className="ml-5 list-disc">
          <li><strong>Financier</strong> : CA cible, marge nette, BFR.</li>
          <li><strong>Opérationnel</strong> : nombre de chantiers livrés à temps, taux de réclamation MOA.</li>
          <li><strong>QHSE</strong> : TF1 (taux de fréquence accidents), zéro accident grave.</li>
          <li><strong>RH</strong> : turnover, satisfaction collaborateurs.</li>
          <li><strong>Stratégique</strong> : diversification, conquête de nouveaux marchés.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Suivi">
        <p>
          Chaque objectif a une <strong>cible annuelle</strong>, une <strong>valeur
          actuelle</strong>, un <strong>écart</strong> et un <strong>statut</strong> (Vert / Orange /
          Rouge). Tu vois en un coup d&apos;œil ce qui est en bonne voie et ce qui dérape.
        </p>
      </HelpSection>

      <HelpSection title="Mettre à jour le suivi">
        <HelpSteps>
          <li>Clique sur un objectif → fiche détaillée.</li>
          <li>Renseigne la valeur réelle constatée + un commentaire.</li>
          <li>Joins une preuve (extrait rapport, tableur, capture écran).</li>
          <li>L&apos;historique se met à jour pour le suivi en CA.</li>
        </HelpSteps>
      </HelpSection>

      <HelpTip>
        Cette page est le support principal des <strong>revues semestrielles avec le CA</strong>.
        Tiens-la à jour mensuellement pour ne pas avoir à faire un effort de mémoire au moment
        des CA.
      </HelpTip>
    </>
  );
}
