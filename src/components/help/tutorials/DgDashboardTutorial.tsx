"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DgDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Tableau de bord du Directeur Général</strong> : vue stratégique consolidée
        sur tous les chantiers et toutes les filiales. KPI exécutifs, alertes prioritaires,
        validations N3 en attente, indicateurs économiques et de gouvernance.
      </p>

      <HelpSection title="KPI exécutifs">
        <ul className="ml-5 list-disc">
          <li><strong>CA YTD</strong> : chiffre d&apos;affaires consolidé cumul début d&apos;exercice.</li>
          <li><strong>Marge nette</strong> : rentabilité globale.</li>
          <li><strong>Trésorerie consolidée</strong> : cash dispo toutes banques + caisses.</li>
          <li><strong>Effectif</strong> : total salariés (CDI + CDD + Stage + Intérim).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Alertes stratégiques">
        <p>
          Liste rouge/orange des points qui exigent ton attention : tension de trésorerie,
          incidents critiques QHSE, contentieux nouveaux, dépassements budgétaires majeurs,
          recouvrement &gt; 90 j d&apos;un MOA important.
        </p>
      </HelpSection>

      <HelpSection title="Validations N3">
        <p>
          File des dossiers qui attendent ta signature au niveau le plus haut : BC &gt; 50 M,
          paie totale, virements gros montants, contrats stratégiques. Cible : &lt; 24 h
          par dossier.
        </p>
      </HelpSection>

      <HelpTip>
        Cette page est <strong>en lecture seule</strong>. Tu pilotes ; les actions se font sur
        les pages spécialisées (Validations, Rapports à valider, Consolidation, etc.).
      </HelpTip>
    </>
  );
}
