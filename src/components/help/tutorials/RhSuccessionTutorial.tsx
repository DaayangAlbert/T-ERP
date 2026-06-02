"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function RhSuccessionTutorial() {
  return (
    <>
      <p className="mb-4">
        Plan de <strong>succession</strong> : identifier les <strong>postes clés</strong>, les
        <strong> successeurs potentiels</strong>, et mesurer le risque RH si une personne
        critique partait demain.
      </p>

      <HelpSection title="Postes clés">
        <p>
          Liste des positions stratégiques de l&apos;entreprise (Direction, chefs de chantier
          expérimentés, expertises rares). Pour chaque poste : titulaire actuel, ancienneté,
          criticité (Faible / Moyenne / Élevée).
        </p>
      </HelpSection>

      <HelpSection title="Successeurs identifiés">
        <p>
          Pour chaque poste clé, jusqu&apos;à 3 successeurs potentiels :
        </p>
        <ul className="ml-5 list-disc">
          <li><strong>Court terme</strong> : remplaçant immédiat possible (0-6 mois).</li>
          <li><strong>Moyen terme</strong> : succession après préparation (6-18 mois).</li>
          <li><strong>Long terme</strong> : potentiel à développer (1-3 ans).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Score de couverture">
        <p>
          Indicateur visuel par poste :
        </p>
        <ul className="ml-5 list-disc">
          <li><strong>Vert</strong> : ≥ 2 successeurs identifiés.</li>
          <li><strong>Orange</strong> : 1 successeur identifié.</li>
          <li><strong>Rouge</strong> : aucun successeur — <strong>risque</strong>.</li>
        </ul>
      </HelpSection>

      <HelpTip>
        Le plan de succession est <strong>confidentiel</strong> — il ne doit pas être communiqué
        aux intéressés sans préparation. Discute-le en revue annuelle avec la DG.
      </HelpTip>
    </>
  );
}
