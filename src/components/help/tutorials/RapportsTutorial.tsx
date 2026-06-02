"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function RapportsTutorial() {
  return (
    <>
      <p className="mb-4">
        Génération de <strong>rapports comptables SYSCOHADA</strong> en PDF. Chaque vignette
        représente un état standard ; clique <strong>« Générer PDF »</strong> pour télécharger le
        document.
      </p>

      <HelpSection title="Rapports disponibles aujourd'hui (Comptable Direction)">
        <ul className="ml-5 list-disc">
          <li><strong>Balance générale</strong> : tous les comptes par classe 1-7 avec D/C/solde.</li>
          <li><strong>Balance auxiliaire fournisseurs</strong> : détail par tiers 401x.</li>
          <li><strong>Balance auxiliaire clients</strong> : détail par tiers 411x.</li>
          <li>
            <strong>État de synthèse mensuel</strong> : 2 pages — <em>Compte de résultat</em>
            (classes 6/7 + résultat) puis <em>Bilan provisoire</em> (actif/passif simplifié SYSCOHADA).
          </li>
        </ul>
      </HelpSection>

      <HelpSection title="Rapports disponibles (Comptable Chantier)">
        <ul className="ml-5 list-disc">
          <li><strong>Balance analytique chantier</strong> : balance générale restreinte à tes chantiers assignés.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Comment générer un rapport">
        <HelpSteps>
          <li>Repère la vignette correspondante.</li>
          <li>Clique sur <strong>« Générer PDF »</strong> en haut à droite de la vignette.</li>
          <li>Le PDF s&apos;ouvre dans un nouvel onglet (ou se télécharge selon ton navigateur).</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Rapports « Bientôt »">
        <p>
          Les vignettes marquées <strong>« Bientôt »</strong> ne sont pas encore générables :
          Grand-livre complet PDF, Journal centralisateur, Liasse DSF, Balance âgée (déjà disponible
          en vue interactive via la page <strong>Échéancier</strong>), Reporting analytique consolidé.
        </p>
      </HelpSection>

      <HelpTip>
        Tous les PDF embarquent l&apos;en-tête de ta société, la période, la mention « norme SYSCOHADA »
        et la date d&apos;édition. Tu peux les imprimer ou les joindre en pièce à un email.
      </HelpTip>
    </>
  );
}
