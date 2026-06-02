"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DafTresorerieTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Trésorerie temps réel</strong> consolidée : tous les comptes bancaires + caisses,
        avec mouvements récents et projection à 30 j. C&apos;est ton tableau de pilotage cash
        quotidien.
      </p>

      <HelpSection title="Comptes bancaires">
        <p>
          Liste de toutes les banques de la société. Pour chacune : solde, type (courant /
          découvert / placement), devise, mouvements des 30 derniers jours.
        </p>
        <HelpSteps>
          <li>Bouton <strong>« Nouveau compte »</strong> : ajoute une banque (nom, n° de compte, devise, type, plafond de découvert).</li>
          <li>Bouton <strong>« Approvisionner »</strong> sur un compte projet : transférer du cash vers un chantier.</li>
          <li>Clique sur une banque pour voir le détail mouvements + soldes journaliers.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Caisses chantier">
        <p>
          Vue globale des caisses physiques. Le DAF ne saisit pas les mouvements ici (c&apos;est
          le rôle du comptable) — il consulte les soldes, les écarts éventuels, les caisses en
          déficit.
        </p>
      </HelpSection>

      <HelpSection title="Projection 30 jours">
        <p>
          Graphique du solde de trésorerie projeté : entrées attendues (encaissements
          situations clients) − sorties attendues (échéances fournisseurs, paie, fiscal). Permet
          d&apos;anticiper les tensions.
        </p>
      </HelpSection>

      <HelpTip>
        Pour le rapprochement bancaire détaillé (import CSV + pointage), passe par l&apos;espace
        Comptable → <strong>« Rapprochement bancaire »</strong>. Ici tu pilotes, le comptable
        opère.
      </HelpTip>
    </>
  );
}
