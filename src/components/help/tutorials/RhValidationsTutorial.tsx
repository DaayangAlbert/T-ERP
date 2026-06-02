"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function RhValidationsTutorial() {
  return (
    <>
      <p className="mb-4">
        File des <strong>validations N1 RH</strong> qui te sont assignées : congés, avances,
        absences, formations, recrutements à valider. Plus la <strong>vue transverse</strong> du
        circuit complet (N2 DAF, N3 DG) et la gestion de la <strong>délégation</strong> en cas
        d&apos;absence.
      </p>

      <HelpSection title="Mes validations en attente">
        <p>
          Liste triée par priorité (URGENT / HIGH / NORMAL / LOW) + âge. Pour chaque demande :
          référence, demandeur, type, montant éventuel, contexte rapide.
        </p>
        <HelpSteps>
          <li>Clique sur une demande pour voir le détail complet + pièces jointes.</li>
          <li>Bouton <strong>« Approuver »</strong> (vert) ou <strong>« Refuser »</strong> (rouge) avec motif obligatoire en cas de refus.</li>
          <li>La demande passe à l&apos;étape N2 ou retourne au demandeur selon ta décision.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Vue transverse du circuit">
        <p>
          Onglet <strong>« Circuit complet »</strong> : tu vois le pipeline entier (N1 RH → N2 DAF
          → N3 DG) et le statut de chaque dossier, même ceux que tu n&apos;as plus à valider.
          Pratique pour répondre à une question sur l&apos;avancement d&apos;un dossier.
        </p>
      </HelpSection>

      <HelpSection title="Déléguer pendant ton absence">
        <p>
          Onglet <strong>« Délégation »</strong> : si tu pars en congé, tu peux déléguer
          temporairement les validations N1 RH à un collègue (DAF, DG, ou un assistant RH).
          Précise les dates (du / au) — automatiquement la file lui sera adressée pendant cette
          période.
        </p>
      </HelpSection>

      <HelpTip>
        Un dossier <strong>en attente &gt; 7 jours</strong> apparaît en rouge avec un drapeau
        d&apos;urgence. Vise toujours &lt; 48 h pour les congés et &lt; 5 j pour le reste.
      </HelpTip>
    </>
  );
}
