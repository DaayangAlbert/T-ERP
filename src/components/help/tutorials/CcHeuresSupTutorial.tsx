"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CcHeuresSupTutorial() {
  return (
    <>
      <p className="mb-4">
        Validation des <strong>heures supplémentaires</strong> de ton équipe : un récap
        hebdomadaire à valider et soumettre au CDT.
      </p>

      <HelpSection title="Récap automatique">
        <p>
          Calculé à partir des pointages : pour chaque ouvrier, total heures normales,
          heures sup (25 % majoration), heures de nuit (50 %), dimanches/fériés (100 %).
        </p>
      </HelpSection>

      <HelpSection title="Valider">
        <HelpSteps>
          <li>Vérifie chaque ligne (un ouvrier × une semaine).</li>
          <li>Si tu vois une erreur, corrige le pointage à la source.</li>
          <li>Si la ligne est correcte, coche <strong>« Validée »</strong>.</li>
          <li>Bouton <strong>« Soumettre au CDT »</strong> en fin de semaine.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Plafond hebdo">
        <p>
          La législation camerounaise plafonne à 20 h sup / semaine / ouvrier. T-ERP affiche
          un badge rouge si dépassement — il faut alors justifier ou répartir.
        </p>
      </HelpSection>

      <HelpTip>
        Soumets <strong>chaque lundi pour la semaine écoulée</strong>. Un retard de
        soumission décale la paie de l&apos;ouvrier.
      </HelpTip>
    </>
  );
}
