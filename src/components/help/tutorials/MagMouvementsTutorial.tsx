"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function MagMouvementsTutorial() {
  return (
    <>
      <p className="mb-4">
        Historique <strong>complet des mouvements de stock</strong> : entrées, sorties,
        transferts, ajustements. Vue exhaustive pour audit et investigation.
      </p>

      <HelpSection title="Filtres">
        <p>
          Période, type de mouvement (entrée/sortie/transfert/ajustement), article,
          chantier de destination, opérateur ayant saisi.
        </p>
      </HelpSection>

      <HelpSection title="Détail d&apos;un mouvement">
        <p>
          Tape une ligne → fiche : date, articles, quantités, valeur, document associé
          (BL, demande, BC), signataire. Photo PJ si présente.
        </p>
      </HelpSection>

      <HelpSection title="Export">
        <p>
          Bouton <strong>« Exporter »</strong> → Excel ou PDF. Utile pour les inventaires,
          audits comptables ou réconciliations avec les chantiers.
        </p>
      </HelpSection>

      <HelpTip>
        Cette page est <strong>en lecture seule</strong> : on ne peut pas corriger un
        mouvement passé. Pour une correction, fais un <em>mouvement d&apos;ajustement</em>
        documenté avec motif.
      </HelpTip>
    </>
  );
}
