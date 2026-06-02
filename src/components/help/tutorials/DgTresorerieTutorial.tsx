"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DgTresorerieTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Trésorerie prévisionnelle</strong> : projection cash à 30/60/90 jours.
        Entrées attendues (situations clients à encaisser) − sorties prévues (échéances
        fournisseurs, paie, fiscal). C&apos;est le radar anti-tension.
      </p>

      <HelpSection title="Graphique de projection">
        <p>
          Courbe du solde de trésorerie consolidé projeté. Axe X = jours. Axe Y = montant.
          Bandes colorées : vert (&gt; seuil de sécurité), orange (sous seuil), rouge
          (négatif, découvert).
        </p>
      </HelpSection>

      <HelpSection title="Détail des flux">
        <ul className="ml-5 list-disc">
          <li><strong>Entrées attendues</strong> : situations émises, échéances de paiement client.</li>
          <li><strong>Sorties planifiées</strong> : factures fournisseurs, paie, échéances fiscales, virements engagés.</li>
          <li><strong>Solde net</strong> : entrées − sorties.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Décisions à prendre">
        <p>
          Si la projection passe en rouge, options possibles : activer une ligne de découvert,
          accélérer le recouvrement (avec DAF), différer des paiements non critiques, repousser
          un investissement.
        </p>
      </HelpSection>

      <HelpTip>
        Cette projection est <strong>recalculée chaque nuit</strong> à partir des données
        comptables et des prévisions DAF. Pour un détail opérationnel, va sur la
        <strong> Trésorerie temps réel</strong> côté DAF.
      </HelpTip>
    </>
  );
}
