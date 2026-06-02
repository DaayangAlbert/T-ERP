"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DafRapportsTutorial() {
  return (
    <>
      <p className="mb-4">
        Bibliothèque de <strong>rapports financiers</strong> et d&apos;<strong>exports</strong> : compte
        de résultat, bilan, balances, états DSF, tableaux de bord pour le CAC ou la DG.
      </p>

      <HelpSection title="Rapports disponibles">
        <ul className="ml-5 list-disc">
          <li><strong>Compte de résultat</strong> mensuel / trimestriel / annuel.</li>
          <li><strong>Bilan provisoire</strong> à date.</li>
          <li><strong>Tableau de financement</strong> (TAFIRE OHADA).</li>
          <li><strong>Reporting cash flow</strong> 12 derniers mois.</li>
          <li><strong>État de la dette</strong> et endettement.</li>
          <li><strong>Performance chantiers</strong> consolidée.</li>
          <li><strong>Liasse DSF</strong> préparatoire annuelle.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Générer un rapport">
        <p>
          Clique sur la vignette du rapport → choisis la période → <strong>« Générer
          PDF »</strong> ou <strong>« Exporter Excel »</strong>. Tu peux aussi exporter en
          <strong> FEC</strong> (Fichier des Écritures Comptables) pour transmettre au CAC.
        </p>
      </HelpSection>

      <HelpSection title="Programmation récurrente">
        <p>
          Pour chaque rapport, possibilité de <strong>planifier</strong> une génération
          automatique (mensuelle, trimestrielle) et l&apos;envoi par email à une liste de
          destinataires (DG, CAC, banquiers, MOA).
        </p>
      </HelpSection>

      <HelpTip>
        Tous les rapports embarquent l&apos;en-tête société, la période, la signature
        électronique du DAF, et la mention « norme SYSCOHADA ». Bons pour audit / banque.
      </HelpTip>
    </>
  );
}
