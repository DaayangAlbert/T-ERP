"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function RhContratsTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion des <strong>contrats de travail</strong> : création (CDI, CDD, Stage, Intérim,
        Prestataire), avenants, renouvellements, fin de contrat. C&apos;est ici que l&apos;on
        <strong> ajoute un nouveau salarié</strong> à T-ERP.
      </p>

      <HelpSection title="Créer un nouveau contrat (= embaucher)">
        <HelpSteps>
          <li>Clique sur <strong>« Nouveau contrat »</strong> en haut à droite (assistant 4 étapes).</li>
          <li>
            <strong>Étape 1 — Identité</strong> : nom, prénom, sexe, date de naissance, CNI, NIU,
            adresse, téléphone, email, contact d&apos;urgence.
          </li>
          <li>
            <strong>Étape 2 — Contrat</strong> : type (CDI/CDD/Stage/Intérim), date d&apos;entrée,
            date de fin (si CDD), poste, département, échelon, catégorie SYSCOHADA.
          </li>
          <li>
            <strong>Étape 3 — Rémunération</strong> : salaire de base, indemnités (logement,
            transport, fonction), CNPS, IRPP, CFC.
          </li>
          <li>
            <strong>Étape 4 — Récap</strong> : vérifie tout, génère automatiquement la
            <strong> fiche d&apos;embauche</strong> + le matricule + le compte utilisateur (si
            poste de bureau).
          </li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Lecture du tableau">
        <ul className="ml-5 list-disc">
          <li><strong>Statut</strong> : Actif / Préavis / Inactif / Fin.</li>
          <li><strong>Type</strong> : CDI / CDD / Stage / Intérim / Prestation.</li>
          <li><strong>Échéance</strong> : pour les CDD, date de fin — rouge si J-30 ou moins.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Avenant à un contrat">
        <p>
          Ouvre la fiche contrat → onglet <strong>« Avenants »</strong> → <strong>« Nouvel
          avenant »</strong>. Cas d&apos;usage typiques : augmentation, changement de poste,
          mobilité chantier, modification durée du travail.
        </p>
      </HelpSection>

      <HelpSection title="Renouveler un CDD">
        <p>
          Sur la ligne d&apos;un CDD arrivant à échéance, clique <strong>« Renouveler »</strong>.
          Saisis la nouvelle date de fin + le motif. Attention : le Code du travail camerounais
          limite à <strong>2 renouvellements</strong> et 2 ans cumulés.
        </p>
        <HelpWarn>
          Passé le 2ᵉ renouvellement ou les 2 ans, le contrat est <strong>réputé CDI</strong>.
          T-ERP affiche une alerte rouge le cas échéant.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="Fin de contrat">
        <p>
          Bouton <strong>« Mettre fin »</strong> sur la fiche : motif (démission, fin CDD,
          licenciement, retraite, décès), date effective, calcul des indemnités (préavis, congés
          non pris, fin de carrière). Génère automatiquement la <strong>fiche de fin de
          contrat</strong> et l&apos;<strong>attestation de travail</strong>.
        </p>
      </HelpSection>

      <HelpTip>
        Toutes les actions sur les contrats déclenchent une <strong>écriture comptable</strong>
        (paie, indemnités) et alimentent les <strong>déclarations CNPS/IRPP</strong>. Soigne la
        saisie initiale.
      </HelpTip>
    </>
  );
}
