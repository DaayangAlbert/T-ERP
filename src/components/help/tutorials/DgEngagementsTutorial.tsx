"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DgEngagementsTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue <strong>stratégique</strong> de tous les <strong>engagements financiers</strong> de
        la société : marchés clients en cours, contrats-cadres fournisseurs, baux, emprunts,
        cautions, garanties. C&apos;est le <strong>hors-bilan</strong> consolidé.
      </p>

      <HelpSection title="Catégories">
        <ul className="ml-5 list-disc">
          <li><strong>Engagements donnés</strong> : cautions, garanties émises au profit de tiers.</li>
          <li><strong>Engagements reçus</strong> : garanties bancaires reçues, lettres de crédit en notre faveur.</li>
          <li><strong>Marchés en cours</strong> : reste à exécuter des contrats clients signés.</li>
          <li><strong>Contrats-cadres</strong> fournisseurs : enveloppes engagées, consommation.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Lecture stratégique">
        <p>
          Cette page sert à mesurer le <strong>risque hors-bilan</strong> de l&apos;entreprise.
          Un total d&apos;engagements donnés important par rapport aux fonds propres = signal de
          fragilité que tu dois discuter en CA.
        </p>
      </HelpSection>

      <HelpSection title="Échéances à venir">
        <p>
          Filtre par date d&apos;échéance : les garanties qui se libèrent, les marchés à
          renégocier, les baux à renouveler dans les 6 prochains mois. Permet d&apos;anticiper
          la communication aux banques et au CA.
        </p>
      </HelpSection>

      <HelpTip>
        La gestion opérationnelle (création, libération, suivi documentaire) se fait dans
        l&apos;espace <strong>DAF → Engagements</strong>. Ici c&apos;est la vue exécutive.
      </HelpTip>
    </>
  );
}
