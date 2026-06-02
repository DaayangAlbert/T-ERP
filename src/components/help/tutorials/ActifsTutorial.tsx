"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function ActifsTutorial() {
  return (
    <>
      <p className="mb-4">
        Valorisation des <strong>stocks</strong> (matériaux en magasin) et suivi des
        <strong> immobilisations</strong> (engins, matériel, mobilier) avec leurs amortissements
        mensuels.
      </p>

      <HelpSection title="Onglet « Stocks valorisés »">
        <p>
          Liste des articles en stock avec leur quantité, leur <strong>PMP</strong> (Prix Moyen
          Pondéré — le prix de revient moyen) et leur valeur totale (qté × PMP). Cette valeur
          alimente le poste « Stocks » du Bilan.
        </p>
        <HelpTip>
          Le PMP est calculé automatiquement par le module Magasin à chaque entrée de stock. Tu n&apos;as
          rien à saisir ici — c&apos;est un état de consultation.
        </HelpTip>
      </HelpSection>

      <HelpSection title="Onglet « Immobilisations »">
        <p>
          Liste des biens immobilisés : code, désignation, catégorie, date d&apos;acquisition,
          valeur brute, VNC (Valeur Nette Comptable = brute − amortissements cumulés), durée
          d&apos;amortissement.
        </p>
      </HelpSection>

      <HelpSection title="Calcul d'amortissement mensuel (Comptable Direction)">
        <HelpSteps>
          <li>Vérifie que tu es en fin de mois (ou que le mois précédent est complet).</li>
          <li>Clique sur <strong>« Calcul amortissement mensuel »</strong> (bouton violet en haut).</li>
          <li>T-ERP génère <strong>automatiquement</strong> une écriture comptable de dotations aux amortissements (D 68x / C 28x) pour toutes les immobilisations actives.</li>
          <li>Un bandeau vert apparaît avec le nombre d&apos;immobilisations traitées + le montant total des dotations + la référence de l&apos;écriture passée.</li>
        </HelpSteps>
        <HelpWarn>
          Ne lance ce calcul <strong>qu&apos;une seule fois par mois</strong>. Le bouton n&apos;est pas
          protégé contre les doubles clics — sois attentif.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="KPI du haut">
        <ul className="ml-5 list-disc">
          <li><strong>Valeur stock</strong> : poste « Stocks » du bilan.</li>
          <li><strong>Immo brutes</strong> : valeur d&apos;acquisition cumulée des immobilisations.</li>
          <li><strong>Amort. cumulés</strong> : total déjà amorti.</li>
          <li><strong>VNC</strong> : valeur nette comptable = brutes − amort. cumulés.</li>
        </ul>
      </HelpSection>
    </>
  );
}
