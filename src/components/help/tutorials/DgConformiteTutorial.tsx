"use client";

import { HelpSection, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function DgConformiteTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Conformité réglementaire et agréments</strong> : tableau de bord exécutif des
        obligations légales (DGI, CNPS, environnement, BTP, qualité) avec leur statut et
        échéances de renouvellement.
      </p>

      <HelpSection title="Domaines couverts">
        <ul className="ml-5 list-disc">
          <li><strong>Fiscal / DGI</strong> : NIU, attestation de non-redevance, agrément ZE.</li>
          <li><strong>Social / CNPS</strong> : immatriculation, certificat d&apos;immatriculation, DIPE annuel.</li>
          <li><strong>BTP / Marchés publics</strong> : agréments catégories I/II/III, classifications.</li>
          <li><strong>Qualité / Certifications</strong> : ISO 9001/14001/45001, audits surveillance.</li>
          <li><strong>Environnement</strong> : notice d&apos;impact, autorisation d&apos;exploitation.</li>
          <li><strong>Hygiène/Sécurité</strong> : médecine du travail, registre HSE.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Indicateurs visuels">
        <ul className="ml-5 list-disc">
          <li><strong>Vert</strong> : à jour, échéance &gt; 60 j.</li>
          <li><strong>Orange</strong> : à renouveler dans les 60 j.</li>
          <li><strong>Rouge</strong> : expiré ou en retard.</li>
        </ul>
      </HelpSection>

      <HelpWarn>
        Une <strong>obligation expirée</strong> peut entraîner sanctions, suspension
        d&apos;activité, ou exclusion des marchés publics. Traite immédiatement toute alerte
        rouge avec le DAF et le Secrétaire Général.
      </HelpWarn>

      <HelpTip>
        Le suivi opérationnel détaillé (documents, démarches, contacts admin) se fait dans
        l&apos;espace <strong>Secrétariat Général → Conformité</strong>.
      </HelpTip>
    </>
  );
}
