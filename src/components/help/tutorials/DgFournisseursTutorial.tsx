"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DgFournisseursTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue stratégique des <strong>fournisseurs</strong> : top fournisseurs par volume, par
        criticité, par concentration de risque. Sert à piloter la stratégie achats et la
        diversification du sourcing.
      </p>

      <HelpSection title="Top fournisseurs">
        <p>
          Classement par CA cumulé YTD. Pour chaque fournisseur : montant, % du total achats,
          nombre de BC, dernière facture, encours impayé.
        </p>
      </HelpSection>

      <HelpSection title="Concentration de risque">
        <p>
          Indicateur clé : le poids du top 5 et du top 10 fournisseurs dans le total achats.
          Si le top 1 représente &gt; 30 %, c&apos;est un signal de dépendance qu&apos;il faut
          diversifier (négociation, alternatives à sourcer).
        </p>
      </HelpSection>

      <HelpSection title="Fournisseurs stratégiques">
        <p>
          Liste des partenaires clés (marqués comme stratégiques par les Achats) avec leur
          score qualité/délai/prix, et les contrats-cadres associés.
        </p>
      </HelpSection>

      <HelpSection title="Fournisseurs bloqués">
        <p>
          Liste des fournisseurs en litige ou disqualifiés (motif et date du blocage). Utile
          pour valider/rejeter une proposition de nouveau BC en N3.
        </p>
      </HelpSection>

      <HelpTip>
        La gestion opérationnelle des fournisseurs (création, contrats, BC, factures) se fait
        dans l&apos;espace <strong>Achats</strong>. Ici c&apos;est la vue exécutive pour le DG.
      </HelpTip>
    </>
  );
}
