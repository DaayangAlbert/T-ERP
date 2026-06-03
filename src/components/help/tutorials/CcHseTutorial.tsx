"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function CcHseTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion <strong>HSE (Hygiène, Sécurité, Environnement)</strong> au quotidien :
        signalement d&apos;incidents, contrôles EPI, briefings sécurité.
      </p>

      <HelpWarn>
        La sécurité passe avant la production. Un AT mortel ou grave engage la
        responsabilité pénale du chef de chantier. Ne minimise jamais un risque.
      </HelpWarn>

      <HelpSection title="Signaler un incident">
        <HelpSteps>
          <li>Bouton <strong>« Nouvel incident »</strong>.</li>
          <li>Type : presque-accident, AT léger, AT avec arrêt, AT grave, AT mortel.</li>
          <li>Personne(s) impliquée(s) + circonstances + photo.</li>
          <li>Soin apporté + transfert hôpital si besoin.</li>
          <li>Valide → notifie le CDT, le DTrav, le QHSE, et déclenche le PV d&apos;AT.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Contrôle EPI">
        <p>
          Tous les matins : passe en revue ton équipe (casque, chaussures, gilet, lunettes,
          gants, harnais si hauteur). Coche dans la liste, signale un manquant.
        </p>
      </HelpSection>

      <HelpSection title="Briefing sécurité (quart d&apos;heure)">
        <p>
          Tous les lundis : briefing thématique (5-15 min). Une fiche thème est proposée par
          le QHSE. Tu cliques <strong>« Fait »</strong> + saisis les participants.
        </p>
      </HelpSection>

      <HelpTip>
        Un AT déclaré dans les 24 h = correctement géré. Une déclaration tardive peut
        retirer la prise en charge CNPS pour l&apos;ouvrier.
      </HelpTip>
    </>
  );
}
