"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CdtReceptionsTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>jalons MOA et réceptions techniques</strong> du chantier :
        partielles, provisoire, définitive — avec liste des livrables associés.
      </p>

      <HelpSection title="Liste des jalons">
        <p>
          Pour chaque jalon : date prévue, date effective, statut (à venir, atteint, en
          retard), MOA signataire. Couleur visuelle : vert = atteint, orange = à venir,
          rouge = en retard.
        </p>
      </HelpSection>

      <HelpSection title="Cocher les livrables">
        <HelpSteps>
          <li>Déroule un jalon → liste des livrables (PV, plans, attestations…).</li>
          <li>Coche chaque livrable au fur et à mesure qu&apos;il est produit.</li>
          <li>Le jalon ne peut être marqué <em>atteint</em> que si 100 % des livrables sont cochés.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="PV de réception">
        <p>
          À chaque jalon réceptionné par le MOA, attache le PV signé (PDF). C&apos;est ce
          qui débloque la situation comptable correspondante.
        </p>
      </HelpSection>

      <HelpTip>
        Anticipe les jalons critiques : 2 semaines avant, vérifie que tous les livrables
        sont en cours de production. Un jalon raté entraîne pénalités contractuelles.
      </HelpTip>
    </>
  );
}
