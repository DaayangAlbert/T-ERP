"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function RhRapportsTutorial() {
  return (
    <>
      <p className="mb-4">
        Génération des <strong>rapports RH</strong> et des <strong>reportings réglementaires</strong>
        (bilan social, égalité H/F, DIPE annuel, états DGI), plus la planification des rapports
        récurrents.
      </p>

      <HelpSection title="Templates disponibles">
        <ul className="ml-5 list-disc">
          <li><strong>Bilan social annuel</strong> : effectif, masse salariale, absences, formations, AT/MP, accord d&apos;entreprise.</li>
          <li><strong>Égalité H/F</strong> : répartition par sexe, par catégorie, par échelon, écart de rémunération.</li>
          <li><strong>DIPE annuel</strong> : déclaration des salaires CNPS — préformatée pour téléchargement.</li>
          <li><strong>État DGI</strong> : déclaration IRPP annuelle.</li>
          <li><strong>Pyramide des âges</strong>.</li>
          <li><strong>Turnover</strong> : entrées/sorties sur la période.</li>
          <li><strong>Absentéisme</strong> : taux global, par cause, par chantier.</li>
          <li><strong>Coût total du personnel</strong> : brut + charges patronales + indirect.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Générer un rapport">
        <p>
          Clique sur la vignette du rapport souhaité → choisis la période (année, semestre, mois)
          → <strong>« Générer PDF »</strong> ou <strong>« Exporter Excel »</strong>.
        </p>
      </HelpSection>

      <HelpSection title="Planification">
        <p>
          Onglet <strong>« Planification »</strong> : programme un rapport pour qu&apos;il soit
          généré automatiquement (mensuel, trimestriel, annuel) et envoyé par mail à une liste de
          destinataires.
        </p>
      </HelpSection>

      <HelpTip>
        Les rapports embarquent l&apos;en-tête de la société, la période, et la signature
        électronique du responsable RH. Tu peux les joindre directement à la DGI ou la CNPS.
      </HelpTip>
    </>
  );
}
