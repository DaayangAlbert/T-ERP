"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DafComptabiliteTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue <strong>supervision</strong> de la comptabilité : KPI globaux, écritures en
        anomalie, équilibre balance, état des clôtures mensuelles. Tu pilotes, le comptable opère.
      </p>

      <HelpSection title="KPI du haut">
        <ul className="ml-5 list-disc">
          <li><strong>Écritures du mois</strong> : volume saisi par le comptable.</li>
          <li><strong>Brouillards en attente</strong> : écritures à valider (à pousser).</li>
          <li><strong>Balance équilibrée ?</strong> : statut D = C sur le mois en cours.</li>
          <li><strong>Dernière clôture</strong> : mois clôturé le plus récent.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Anomalies détectées">
        <p>
          T-ERP signale automatiquement : comptes inconnus, déséquilibres, doubles saisies
          potentielles, mouvements suspects (montants ronds &gt; 10 M, écritures hors heures
          ouvrées). Investigue chacune avec le comptable.
        </p>
      </HelpSection>

      <HelpSection title="État des clôtures">
        <p>
          Vue des 12 derniers mois : ouvert / en cours / clôturé / verrouillé. Tu peux exiger la
          clôture du mois M-1 dans la 1ʳᵉ semaine du mois M en alignant ton comptable.
        </p>
      </HelpSection>

      <HelpTip>
        Pour les opérations détaillées (saisie, lettrage, balance, etc.), passe par l&apos;espace
        Comptable. Cette page est une vue agrégée pour la supervision DAF.
      </HelpTip>
    </>
  );
}
