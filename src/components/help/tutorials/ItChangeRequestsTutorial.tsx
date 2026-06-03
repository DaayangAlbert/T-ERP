"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function ItChangeRequestsTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>change requests</strong> (demandes d&apos;évolution ou
        d&apos;incident) remontées par les utilisateurs vers l&apos;équipe IT et
        l&apos;éditeur T-ERP.
      </p>

      <HelpSection title="File des demandes">
        <p>
          Liste des CR en cours : objet, demandeur, criticité (P1/P2/P3/P4), statut
          (ouverte, en cours, attente édition, livrée, fermée), date d&apos;ouverture.
        </p>
      </HelpSection>

      <HelpSection title="Ouvrir une CR">
        <HelpSteps>
          <li>Bouton <strong>« Nouvelle CR »</strong>.</li>
          <li>Type : incident (qqch ne marche pas) ou évolution (nouveau besoin).</li>
          <li>Criticité (P1 = bloque la production, P2 = grave, P3 = gênant, P4 = mineur).</li>
          <li>Description détaillée, captures, étapes pour reproduire.</li>
          <li>Soumets — l&apos;équipe IT et l&apos;éditeur sont notifiés.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Suivi">
        <p>
          Notifications à chaque changement de statut. Échanges en commentaires sur la
          fiche. Estimation de livraison fournie par l&apos;éditeur.
        </p>
      </HelpSection>

      <HelpTip>
        Pour une CR P1 (incident bloquant), appelle aussi le support en parallèle —
        la file mail seule peut prendre du temps. Pour les P3-P4, la file suffit.
      </HelpTip>
    </>
  );
}
