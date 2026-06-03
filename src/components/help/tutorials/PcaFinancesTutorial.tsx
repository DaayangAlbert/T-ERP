"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaFinancesTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue financière consolidée : <strong>P&amp;L, bilan, ratios</strong> de toutes les
        filiales agrégés au niveau groupe.
      </p>

      <HelpSection title="Compte de résultat consolidé">
        <p>
          Chiffre d&apos;affaires, marge brute, EBE, résultat net. Comparaison vs N-1
          et vs budget annuel.
        </p>
      </HelpSection>

      <HelpSection title="Bilan consolidé">
        <p>
          Actif, passif, capitaux propres, dette financière. Évolution sur 3 ans pour
          mesurer la solidité patrimoniale du groupe.
        </p>
      </HelpSection>

      <HelpSection title="Ratios clés">
        <p>
          Marge nette, taux de marge brute, rotation actifs, ROE, levier financier,
          couverture des intérêts. Comparés aux normes du secteur BTP.
        </p>
      </HelpSection>

      <HelpTip>
        Si un ratio dérive de plus de 20 % vs N-1, demande au DAF un point d&apos;analyse
        avant le prochain Conseil — c&apos;est typiquement le sujet à arbitrer.
      </HelpTip>
    </>
  );
}
