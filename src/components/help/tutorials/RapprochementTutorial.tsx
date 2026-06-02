"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function RapprochementTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Rapprochement bancaire</strong> : tu importes le relevé envoyé par la banque
        (format CSV), T-ERP pointe automatiquement les lignes qui correspondent à tes écritures
        comptables, et toi tu valides ou complètes le pointage à la main.
      </p>

      <HelpWarn>
        Page réservée au <strong>Comptable Direction / DAF</strong> (jamais comptable chantier).
      </HelpWarn>

      <HelpSection title="Préparer le CSV de la banque">
        <p>
          Demande à ta banque le relevé du mois en CSV ou exporte-le depuis l&apos;espace client.
          Les colonnes attendues (peu importe l&apos;ordre / séparateur) :
        </p>
        <ul className="ml-5 list-disc">
          <li><strong>Date</strong> : format <code>JJ/MM/AAAA</code> ou <code>AAAA-MM-JJ</code>.</li>
          <li><strong>Libellé</strong> : description du mouvement.</li>
          <li><strong>Débit</strong> : sortie (montant positif).</li>
          <li><strong>Crédit</strong> : entrée (montant positif).</li>
        </ul>
        <p className="text-[12.5px] text-ink-3">
          Séparateur <code>;</code> ou <code>,</code>. Montants au format français
          (<code>1 234,56</code>) ou simple (<code>1234.56</code>) — T-ERP gère les deux.
        </p>
      </HelpSection>

      <HelpSection title="Étape 1 — Choisir banque + période">
        <HelpSteps>
          <li>Sélectionne la <strong>banque</strong> dans le menu déroulant.</li>
          <li>Choisis la <strong>période</strong> (mois) à rapprocher.</li>
          <li>T-ERP charge automatiquement les mouvements comptables existants sur cette période.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Étape 2 — Importer le relevé CSV">
        <HelpSteps>
          <li>Clique sur <strong>« Importer relevé CSV »</strong> en haut à droite.</li>
          <li>Sélectionne ton fichier. T-ERP le parse et affiche les lignes dans la colonne droite.</li>
          <li>
            <strong>Auto-pointage</strong> : pour chaque ligne du relevé, T-ERP cherche un
            mouvement comptable de même montant à ± 3 jours et coche les deux. Les cases vertes
            indiquent les paires trouvées.
          </li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Étape 3 — Pointer manuellement le reste">
        <p>
          Les lignes non auto-pointées restent décochées. Examine-les :
        </p>
        <ul className="ml-5 list-disc">
          <li>Ligne dans <strong>les livres mais pas au relevé</strong> : l&apos;écriture passée n&apos;est pas encore arrivée à la banque (chèque pas encore débité). Tu peux cocher quand même si tu sais qu&apos;elle va arriver.</li>
          <li>Ligne <strong>au relevé mais pas dans les livres</strong> : il manque une écriture en comptabilité (frais bancaires, virement oublié…). Va saisir l&apos;écriture dans <strong>Saisie d&apos;écritures</strong>, puis reviens.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Étape 4 — Sauvegarder">
        <p>
          En bas de page, regarde l&apos;<strong>écart</strong> :
        </p>
        <ul className="ml-5 list-disc">
          <li><strong>Écart = 0</strong> : tout est rapproché, le rapprochement est <strong>COMPLETED</strong>.</li>
          <li><strong>Écart ≠ 0</strong> : il reste des incohérences, le rapprochement est <strong>IN_PROGRESS</strong>.</li>
        </ul>
        <p>Clique <strong>« Enregistrer le rapprochement »</strong>. Le snapshot est conservé en base.</p>
      </HelpSection>

      <HelpTip>
        Le rapprochement est une <strong>photo à un instant T</strong>. Tu peux y revenir le mois
        suivant et continuer où tu en étais.
      </HelpTip>
    </>
  );
}
