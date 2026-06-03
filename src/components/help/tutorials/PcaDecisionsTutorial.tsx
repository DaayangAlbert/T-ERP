"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function PcaDecisionsTutorial() {
  return (
    <>
      <p className="mb-4">
        Dossiers <strong>nécessitant ton arbitrage</strong> de Propriétaire / PCA :
        investissements majeurs, contentieux importants, opérations structurantes.
      </p>

      <HelpSection title="File des dossiers">
        <p>
          Liste des arbitrages remontés par le DG : objet, montant ou enjeu, motivation,
          délai d&apos;arbitrage attendu.
        </p>
      </HelpSection>

      <HelpSection title="Arbitrer">
        <HelpSteps>
          <li>Tape un dossier → fiche détail.</li>
          <li>Lis la note de synthèse + recommandation DG.</li>
          <li>Consulte les PJ (audit, due diligence, expertise).</li>
          <li>Décide : <strong>Approuver</strong> / <strong>Refuser</strong> / <strong>Demander complément</strong>.</li>
          <li>Motif obligatoire — devient pièce du registre des décisions.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Types de décisions typiques">
        <p>
          Investissement &gt; 500 M FCFA, recrutement cadre dirigeant, mise en
          contentieux d&apos;un MOA majeur, ouverture de filiale, prise de participation.
        </p>
      </HelpSection>

      <HelpTip>
        Une décision PCA est historisée et opposable. Prends le temps de la motivation —
        elle te protège juridiquement et oriente l&apos;exécution.
      </HelpTip>
    </>
  );
}
