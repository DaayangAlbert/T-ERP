"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function RhCongesTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion des <strong>congés et absences</strong> : demandes en attente, validations,
        soldes par salarié, planning collectif.
      </p>

      <HelpSection title="Types d'absences">
        <ul className="ml-5 list-disc">
          <li><strong>Congé annuel</strong> : 1,5 jour par mois travaillé (Code du travail Cameroun).</li>
          <li><strong>Congé maladie</strong> : sur certificat médical.</li>
          <li><strong>Congé maternité / paternité</strong> : 14 / 3 jours.</li>
          <li><strong>Congé exceptionnel</strong> : mariage, naissance, deuil…</li>
          <li><strong>Absence non rémunérée</strong>.</li>
          <li><strong>Récupération heures sup</strong>.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Demandes en attente">
        <p>
          Onglet principal : tu vois toutes les demandes des salariés. Pour chacune : nom, type,
          dates, durée, motif. Boutons <strong>« Approuver »</strong> ou <strong>« Refuser »</strong>.
        </p>
        <HelpSteps>
          <li>Clique sur une demande pour voir le détail (solde restant du salarié, conflits planning, justificatif joint).</li>
          <li>Approuve si OK → le salarié reçoit une notification + le solde se déduit automatiquement.</li>
          <li>Refuse avec motif → le salarié peut renouveler sa demande.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Soldes par salarié">
        <p>
          Onglet <strong>« Soldes »</strong> : pour chaque salarié, son solde de congés acquis,
          pris, restants. Pratique pour conseiller un salarié qui hésite ou pour le bilan annuel.
        </p>
      </HelpSection>

      <HelpSection title="Planning collectif">
        <p>
          Onglet <strong>« Planning »</strong> : vue calendrier de l&apos;équipe sur le mois. Tu
          vois en un coup d&apos;œil qui est en congé quand, et tu peux détecter les
          chevauchements problématiques (toute une équipe en congé en même temps, etc.).
        </p>
      </HelpSection>

      <HelpTip>
        L&apos;impact <strong>paie</strong> est automatique : un congé approuvé déduit du solde
        et n&apos;affecte pas la paie (congé payé). Une absence non rémunérée déduit du salaire
        du mois.
      </HelpTip>
    </>
  );
}
