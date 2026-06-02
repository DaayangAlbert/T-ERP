"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DgRecouvrementTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue exécutive du <strong>recouvrement clients</strong> : créances impayées,
        recouvrements en cours, contentieux. C&apos;est le miroir DG du travail DAF.
      </p>

      <HelpSection title="KPI">
        <ul className="ml-5 list-disc">
          <li><strong>Encours total impayé</strong> : somme des créances non réglées.</li>
          <li><strong>&gt; 90 jours</strong> : créances critiques (potentiellement perdues).</li>
          <li><strong>DSO</strong> (Days Sales Outstanding) : nombre moyen de jours pour encaisser une facture.</li>
          <li><strong>Recouvrements YTD</strong> : montant effectivement recouvré.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Top débiteurs">
        <p>
          Classement des MOA qui doivent le plus à la société. Permet d&apos;identifier les
          situations à traiter en priorité — et celles qui nécessitent une intervention DG (appel
          au PDG du MOA, levée de blocage administratif).
        </p>
      </HelpSection>

      <HelpSection title="Dossiers en contentieux">
        <p>
          Créances ayant dépassé la phase amiable (R3) et confiées à un avocat. Risque de
          provision et de perte. À suivre avec le Secrétaire Général.
        </p>
      </HelpSection>

      <HelpTip>
        La gestion opérationnelle (relances R1/R2/R3, circuits de paiement) se fait dans
        l&apos;espace <strong>DAF → Recouvrement</strong>. Ici c&apos;est ta vue exécutive.
      </HelpTip>
    </>
  );
}
