"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DafRecouvrementTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>créances clients impayées</strong> et des actions de recouvrement :
        relances mail, lettres recommandées, circuits de paiement déclenchés, mise en
        contentieux.
      </p>

      <HelpSection title="File des créances impayées">
        <p>
          Liste des situations clients émises et non encaissées, triées par antériorité :
          0-30 j, 31-60 j, 61-90 j, &gt; 90 j. Pour chaque ligne : MOA, montant, jours de
          retard, dernière relance.
        </p>
      </HelpSection>

      <HelpSection title="Envoyer une relance">
        <HelpSteps>
          <li>Clique sur <strong>« Relancer »</strong> sur la ligne du client.</li>
          <li>Choisis le niveau : <strong>R1</strong> (courtoise, J+15), <strong>R2</strong> (ferme, J+30), <strong>R3</strong> (mise en demeure, J+60).</li>
          <li>T-ERP génère un PDF + envoie par email + journalise.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Appliquer un circuit de paiement">
        <p>
          Sur une créance avec accord obtenu, bouton <strong>« Appliquer un circuit »</strong>
          → assigne au comptable une procédure de suivi du paiement (étapes : confirmation
          ordre, virement reçu, lettrage). Cf. page Circuits de paiement.
        </p>
      </HelpSection>

      <HelpSection title="Mise en contentieux">
        <p>
          Au-delà de R3 sans réponse, bouton <strong>« Mettre en contentieux »</strong> : la
          créance est transférée à l&apos;avocat partenaire, statut → CONTENTIEUX. Le suivi se
          poursuit dans le module SG → Contentieux.
        </p>
      </HelpSection>

      <HelpTip>
        L&apos;échéancier détaillé client par client est dans l&apos;espace Comptable →
        <strong> « Échéancier tiers »</strong>. Ici c&apos;est la vue actionnable DAF.
      </HelpTip>
    </>
  );
}
