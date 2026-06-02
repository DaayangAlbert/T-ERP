"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DgContentieuxTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Suivi du contentieux consolidé</strong> : tous les litiges en cours
        (commerciaux, sociaux, fiscaux, civils) avec leur statut, montant en risque,
        provisions, avocats assignés.
      </p>

      <HelpSection title="Types de contentieux suivis">
        <ul className="ml-5 list-disc">
          <li><strong>Commercial</strong> : recouvrement clients, litige fournisseur, malfaçon, retard.</li>
          <li><strong>Social</strong> : prud&apos;hommes, litige fin de contrat, accident du travail.</li>
          <li><strong>Fiscal</strong> : redressement, contestation, dégrèvement.</li>
          <li><strong>Civil / Pénal</strong> : litiges divers, infractions.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Lecture du tableau">
        <ul className="ml-5 list-disc">
          <li><strong>Référence interne</strong> + nom du dossier.</li>
          <li><strong>Adversaire</strong> et <strong>juridiction</strong>.</li>
          <li><strong>Montant en risque</strong>.</li>
          <li><strong>Provisions constituées</strong> (côté comptable).</li>
          <li><strong>Statut</strong> : Ouvert / En instruction / En jugement / Jugé / Appel / Clos.</li>
          <li><strong>Prochaine échéance</strong> (audience, dépôt conclusions).</li>
        </ul>
      </HelpSection>

      <HelpSection title="KPI consolidés">
        <ul className="ml-5 list-disc">
          <li>Nombre de dossiers actifs.</li>
          <li>Risque total cumulé.</li>
          <li>Provisions cumulées.</li>
          <li>Audiences dans les 30 prochains jours.</li>
        </ul>
      </HelpSection>

      <HelpTip>
        La gestion opérationnelle (création, suivi, documents) se fait dans l&apos;espace
        <strong> Secrétariat Général → Contentieux</strong>. Ici c&apos;est la vue stratégique.
      </HelpTip>
    </>
  );
}
