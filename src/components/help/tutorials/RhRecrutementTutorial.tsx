"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function RhRecrutementTutorial() {
  return (
    <>
      <p className="mb-4">
        Pipeline de <strong>recrutement</strong> : publication d&apos;offres, suivi des
        candidatures depuis le portail emploi public, entretiens, décision d&apos;embauche.
      </p>

      <HelpSection title="Vue d'ensemble (onglets)">
        <ul className="ml-5 list-disc">
          <li><strong>Offres ouvertes</strong> : postes publiés sur le portail emploi.</li>
          <li><strong>Candidatures</strong> : CV reçus, par stage du pipeline (Reçue → Présélectionnée → Entretien → Test technique → Offre → Embauchée / Refusée).</li>
          <li><strong>Entretiens</strong> : agenda des entretiens programmés.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Publier une nouvelle offre">
        <HelpSteps>
          <li>Clique sur <strong>« Nouvelle offre »</strong>.</li>
          <li>Remplis : titre, département, type de contrat, expérience minimum, missions, profil recherché, fourchette de salaire.</li>
          <li>Date de publication + date d&apos;expiration.</li>
          <li>Clique <strong>« Publier »</strong> : l&apos;offre apparaît immédiatement sur le portail emploi (terpgroup.com/emploi).</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Traiter une candidature">
        <HelpSteps>
          <li>Ouvre l&apos;offre, va dans l&apos;onglet <strong>« Candidatures »</strong>.</li>
          <li>Clique sur un candidat pour voir son <strong>profil</strong>, son CV, sa lettre de motivation, ses compétences.</li>
          <li>Décide : <strong>« Présélectionner »</strong>, <strong>« Programmer un entretien »</strong>, ou <strong>« Refuser »</strong>.</li>
          <li>Le candidat est notifié automatiquement à chaque transition.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Programmer un entretien">
        <p>
          Sur la fiche candidat → <strong>« Programmer un entretien »</strong>. Choisis date,
          heure, lieu (présentiel/visio), recruteurs (toi + le manager du poste). Le candidat
          reçoit un mail de convocation. Il peut <strong>confirmer</strong> ou
          <strong> demander un report</strong> depuis son espace candidat.
        </p>
      </HelpSection>

      <HelpSection title="Embaucher un candidat retenu">
        <p>
          Bouton <strong>« Embaucher »</strong> sur la fiche : tu es redirigé vers
          <strong> « Contrats de travail » → Nouveau contrat</strong> avec les infos du candidat
          pré-remplies (identité, compétences). Tu complètes la rémunération + le contrat, et le
          salarié rejoint l&apos;effectif.
        </p>
      </HelpSection>

      <HelpTip>
        Les candidats refusés peuvent être <strong>conservés dans le vivier</strong> pour de
        futures offres. Astuce : tag les profils intéressants avec un commentaire interne.
      </HelpTip>
    </>
  );
}
