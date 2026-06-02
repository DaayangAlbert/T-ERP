"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function RhDisciplinaireTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>procédures disciplinaires</strong> et des <strong>conflits sociaux</strong> :
        avertissements, mises à pied, licenciements, conflits collectifs, négociations.
      </p>

      <HelpSection title="Échelle des sanctions">
        <ul className="ml-5 list-disc">
          <li><strong>Avertissement écrit</strong> : 1ʳᵉ sanction.</li>
          <li><strong>Blâme</strong> : faute caractérisée.</li>
          <li><strong>Mise à pied disciplinaire</strong> : 1 à 8 jours sans salaire.</li>
          <li><strong>Licenciement pour faute</strong> : simple ou grave.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Ouvrir un dossier disciplinaire">
        <HelpSteps>
          <li>Clique sur <strong>« Nouveau dossier »</strong>.</li>
          <li>Salarié concerné, faits reprochés (dates, lieux, témoins), niveau de gravité.</li>
          <li>Pièces : rapport hiérarchique, témoignages écrits, photos.</li>
          <li>Choisis la sanction envisagée (à valider par DG si licenciement).</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Procédure légale (Code du travail Cameroun)">
        <HelpSteps>
          <li><strong>Convocation</strong> par lettre RAR ou remise en main propre — 48 h avant l&apos;entretien minimum.</li>
          <li><strong>Entretien préalable</strong> — le salarié peut se faire assister.</li>
          <li><strong>Notification de la sanction</strong> — par écrit, motivée, dans les 8 jours suivant l&apos;entretien.</li>
        </HelpSteps>
        <HelpWarn>
          Le non-respect de la procédure rend la sanction <strong>nulle</strong> et expose
          l&apos;entreprise à des dommages-intérêts. Ne raccourcis pas les délais.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="Suivi d'un dossier">
        <p>
          Sur la fiche du dossier : statut (Ouvert / Entretien programmé / Sanction notifiée /
          Clos), historique des étapes, documents joints, recours éventuels du salarié.
        </p>
      </HelpSection>

      <HelpSection title="Conflits collectifs">
        <p>
          Onglet <strong>« Conflits sociaux »</strong> : grèves, préavis de grève, négociations
          avec délégués du personnel, accords d&apos;entreprise. Documente les phases pour la
          traçabilité juridique.
        </p>
      </HelpSection>

      <HelpTip>
        Tout dossier disciplinaire est <strong>confidentiel</strong>. L&apos;accès est limité à
        RH + DG. Les notifications email aux salariés sont chiffrées.
      </HelpTip>
    </>
  );
}
