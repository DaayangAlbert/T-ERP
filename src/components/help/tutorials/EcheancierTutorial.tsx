"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function EcheancierTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Balance âgée par tiers</strong> : combien tu dois à chaque fournisseur et combien
        chaque client te doit, ventilé par <strong>antériorité</strong> (0-30 j / 31-60 j / 61-90 j /
        &gt; 90 j). C&apos;est l&apos;outil clé du recouvrement et de la gestion des paiements.
      </p>

      <HelpSection title="Les 2 onglets">
        <ul className="ml-5 list-disc">
          <li><strong>Fournisseurs</strong> : ce que tu dois aux fournisseurs (comptes 40x).</li>
          <li><strong>Clients</strong> : ce que les clients te doivent (comptes 41x).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Lecture des KPI (en haut)">
        <ul className="ml-5 list-disc">
          <li><strong>Dette / Créance totale</strong> : encours global.</li>
          <li><strong>0 – 30 j</strong> : récent, normal.</li>
          <li><strong>31 – 60 j</strong> : à surveiller (orange).</li>
          <li><strong>61 – 90 j</strong> : critique (orange).</li>
          <li><strong>&gt; 90 j</strong> : impayés sévères (rouge).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Lecture du tableau">
        <p>Chaque ligne représente un tiers (un fournisseur ou un client). Pour chacun :</p>
        <ul className="ml-5 list-disc">
          <li><strong>Lignes</strong> : nombre d&apos;écritures non lettrées sur ce tiers.</li>
          <li><strong>Buckets d&apos;âge</strong> : montants par tranche d&apos;antériorité.</li>
          <li><strong>Total</strong> : encours total signé.</li>
          <li><strong>Antériorité</strong> : âge de la ligne la plus ancienne (drapeau orange si &gt; 60 j).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Comprendre les valeurs négatives">
        <p>
          Sur l&apos;onglet Fournisseurs, une <strong>dette négative</strong> signifie que tu as
          plus payé que tu ne devais (avance/acompte versé). Sur l&apos;onglet Clients,
          une <strong>créance négative</strong> = le client a payé d&apos;avance.
        </p>
      </HelpSection>

      <HelpTip>
        Pour <strong>faire disparaître une ligne</strong> de l&apos;échéancier, il faut la
        <strong> lettrer</strong> avec son règlement dans la page <strong>Grand livre</strong> →
        onglet <strong>Lettrage</strong>.
      </HelpTip>
    </>
  );
}
