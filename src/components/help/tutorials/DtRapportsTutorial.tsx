"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtRapportsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Rapports techniques</strong> et templates récurrents : tableaux de bord
        portefeuille, planning consolidé, état des sous-traitants, statistiques de
        production.
      </p>

      <HelpSection title="Templates disponibles">
        <ul className="ml-5 list-disc">
          <li><strong>Portefeuille chantiers consolidé</strong> : tous les chantiers, état, marges, échéances.</li>
          <li><strong>Planning consolidé</strong> : Gantt groupe avec jalons critiques.</li>
          <li><strong>État sous-traitance</strong> : ST actifs, montants, performance.</li>
          <li><strong>Statistiques production</strong> : volumes posés (m³ béton, ml route, …) par chantier / mois.</li>
          <li><strong>Indicateurs QHSE techniques</strong> : NC, audits, certifications, recyclages.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Générer">
        <p>
          Clique sur la vignette, choisis la période et les filtres (chantiers, MOA, type
          d&apos;ouvrage), puis <strong>« Générer PDF »</strong> ou <strong>« Exporter
          Excel »</strong>.
        </p>
      </HelpSection>

      <HelpTip>
        Pour les <strong>rapports mensuels DT</strong> (synthèse signée DG), passe par la
        page dédiée « Rapports mensuels ». Ici c&apos;est de l&apos;extraction opérationnelle.
      </HelpTip>
    </>
  );
}
