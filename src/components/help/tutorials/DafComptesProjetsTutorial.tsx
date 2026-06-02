"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function DafComptesProjetsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Comptabilité analytique</strong> : un sous-compte bancaire par chantier. Tu peux
        <strong> créer</strong>, <strong>approvisionner</strong>, et <strong>rembourser</strong>
        ces comptes — actions réservées au DAF. Le comptable, lui, n&apos;enregistre que les
        mouvements opérationnels.
      </p>

      <HelpSection title="Lecture du tableau">
        <ul className="ml-5 list-disc">
          <li><strong>Solde dispo.</strong> : cash restant utilisable.</li>
          <li><strong>Dette</strong> : appros − remboursements. Reflète ce que la banque attend.</li>
          <li><strong>Statut</strong> : Actif / Clôturé.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Créer un nouveau compte projet">
        <HelpSteps>
          <li>Clique sur <strong>« Nouveau compte projet »</strong>.</li>
          <li>Choisis le <strong>chantier</strong> (parmi ceux sans compte existant).</li>
          <li>Sélectionne le <strong>compte bancaire de rattachement</strong>.</li>
          <li>Crée. Le solde démarre à 0.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Approvisionner">
        <HelpSteps>
          <li>Bouton <strong>« Appro. »</strong> sur la ligne du chantier.</li>
          <li>Choisis le compte bancaire source, le montant, le motif.</li>
          <li>Effet : la banque est débitée, le compte projet est crédité, la dette augmente.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Remboursement banque (correction)">
        <p>
          Quand un compte projet a été sur-approvisionné, ou en fin de chantier, bouton
          <strong> « Mouvt. » → « Remboursement banque »</strong> pour rendre le cash. Effet :
          débit du compte projet, crédit banque, dette réduite.
        </p>
      </HelpSection>

      <HelpWarn>
        Le bouton <strong>« Régularisation »</strong> existe aussi (côté comptable) — il
        modifie le solde du compte projet SANS toucher la banque. Réservé aux corrections
        purement comptables.
      </HelpWarn>

      <HelpTip>
        En fin de chantier, vérifie que le compte projet est à zéro (solde + dette). Un solde
        positif résiduel doit être remboursé à la banque ; un solde négatif = découvert à
        régulariser.
      </HelpTip>
    </>
  );
}
