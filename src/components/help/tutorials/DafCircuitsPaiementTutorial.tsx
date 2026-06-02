"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DafCircuitsPaiementTutorial() {
  return (
    <>
      <p className="mb-4">
        Les <strong>circuits de paiement</strong> standardisent le traitement d&apos;une dépense
        ou d&apos;un encaissement complexe : tu définis une suite d&apos;étapes
        (vérification → autorisation → exécution → lettrage), et chaque étape est assignée à
        une personne avec un blocage si non terminée.
      </p>

      <HelpSection title="Modèles de circuits">
        <p>Les modèles pré-définis :</p>
        <ul className="ml-5 list-disc">
          <li><strong>Sortie cash sécurisée</strong> : vérification facture → autorisation DAF → virement → lettrage.</li>
          <li><strong>Encaissement client échelonné</strong> : confirmation paiement → enregistrement banque → lettrage situation.</li>
          <li><strong>Acompte fournisseur</strong> : engagement → virement → suivi livraison → lettrage facture.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Lancer un circuit">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau circuit »</strong>.</li>
          <li>Choisis le modèle, le montant, la pièce concernée (facture client/fournisseur).</li>
          <li>Assigne chaque étape à un responsable (comptable, DAF, DG selon le modèle).</li>
          <li>Lance : chaque assigné reçoit une notification quand son étape arrive.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Suivre un circuit">
        <p>
          Vue Kanban ou liste : tu vois où en est chaque circuit (étape courante, qui doit
          agir). Tu peux <strong>débloquer</strong> manuellement une étape en cas d&apos;urgence
          (avec motif).
        </p>
      </HelpSection>

      <HelpTip>
        Les circuits sont parfaits pour les <strong>paiements sensibles</strong> (gros montants,
        opérations exceptionnelles) où tu veux une piste d&apos;audit complète et plusieurs
        contrôles.
      </HelpTip>
    </>
  );
}
