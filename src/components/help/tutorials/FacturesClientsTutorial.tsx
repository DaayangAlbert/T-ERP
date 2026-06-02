"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function FacturesClientsTutorial() {
  return (
    <>
      <p className="mb-4">
        Émission des <strong>situations de travaux</strong> (factures clients MOA) avec calcul
        automatique <strong>TVA 19,25 %</strong> + <strong>retenue garantie 5 %</strong> +
        <strong> retenue source 2,2 %</strong>. C&apos;est l&apos;outil principal pour facturer un
        chantier en cours.
      </p>

      <HelpSection title="Les 4 onglets">
        <ul className="ml-5 list-disc">
          <li><strong>Situations en cours</strong> : brouillons / validées prêtes à émettre.</li>
          <li><strong>Émises</strong> : envoyées au MOA, en attente de paiement.</li>
          <li><strong>Encaissées</strong> : paiement reçu (total ou partiel).</li>
          <li><strong>En retard</strong> : émises mais non payées passé la date d&apos;échéance.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Créer une nouvelle situation (assistant 4 étapes)">
        <HelpSteps>
          <li>Clique sur <strong>« Nouvelle situation »</strong> (bouton violet en haut à droite).</li>
          <li>
            <strong>Étape 1 — Chantier</strong> : choisis le chantier, la période (YYYY-MM) et la date d&apos;échéance fixée avec le MOA.
          </li>
          <li>
            <strong>Étape 2 — Métré</strong> : ligne par ligne, saisis BPU, désignation, unité, quantité cumulée et prix unitaire. Clique « + Ajouter ligne » pour autant d&apos;articles que nécessaire.
          </li>
          <li>
            <strong>Étape 3 — Calcul</strong> : T-ERP affiche le récap automatique :
            <ul className="ml-5 list-disc text-[12.5px] mt-1">
              <li>Montant HT (somme des lignes).</li>
              <li>TVA 19,25 %.</li>
              <li>Total TTC.</li>
              <li>Retenue garantie 5 % (déduite).</li>
              <li>Retenue source 2,2 % (déduite).</li>
              <li><strong>Net à recevoir</strong> = TTC − retenues.</li>
            </ul>
          </li>
          <li><strong>Étape 4 — Récap</strong> : vérifie tout, puis clique <strong>« Valider la situation »</strong>. La situation passe en statut DRAFT/VALIDATED.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Émettre une situation">
        <p>
          Dans l&apos;onglet « Situations en cours », clique <strong>« Émettre »</strong> sur la
          ligne concernée. La situation passe en statut <strong>« Émise »</strong> — elle est
          maintenant attendue par le client (MOA).
        </p>
      </HelpSection>

      <HelpSection title="Encaisser un paiement">
        <p>
          Dans l&apos;onglet « Émises », clique <strong>« Encaisser »</strong>. T-ERP enregistre
          le règlement et passe la situation en <strong>« Encaissée »</strong>.
        </p>
      </HelpSection>

      <HelpSection title="Suivre les impayés">
        <p>
          L&apos;onglet <strong>« En retard »</strong> liste les situations échues. À transmettre
          au recouvrement DAF.
        </p>
      </HelpSection>

      <HelpTip>
        Les colonnes <strong>HT / TTC / Net à recevoir</strong> sont calculées à l&apos;émission
        et figées — la retenue garantie est libérée à la fin du chantier (réception définitive).
      </HelpTip>
    </>
  );
}
