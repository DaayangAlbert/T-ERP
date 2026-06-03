"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaChantiersTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue consolidée du <strong>portefeuille de chantiers</strong> du groupe — tous les
        projets en cours et en attente de démarrage.
      </p>

      <HelpSection title="Liste consolidée">
        <p>
          Pour chaque chantier : MOA, valeur contractuelle, marge contractuelle vs réalisée,
          avancement physique, alerte (retard, sur-coût, contentieux).
        </p>
      </HelpSection>

      <HelpSection title="Vue carte / liste">
        <p>
          Bascule entre vue cartographique (positionnement géographique des chantiers) et
          tableau analytique. Utile pour visualiser les concentrations régionales.
        </p>
      </HelpSection>

      <HelpSection title="Filtres">
        <p>
          Filiale, MOA, statut, période. Identifie les chantiers à problème (filtre
          « alertes ouvertes ») pour les passer en revue rapidement.
        </p>
      </HelpSection>

      <HelpTip>
        Concentre ton attention sur les chantiers à fort enjeu (top 10 valeur) et les
        chantiers en alerte rouge — c&apos;est là que se jouent les écarts patrimoniaux.
      </HelpTip>
    </>
  );
}
