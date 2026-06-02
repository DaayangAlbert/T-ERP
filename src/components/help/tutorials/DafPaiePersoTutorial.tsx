"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DafPaiePersoTutorial() {
  return (
    <>
      <p className="mb-4">
        Cette page te donne accès à <strong>ta propre paie</strong> en tant que cadre de la
        société : bulletins mensuels, historique, attestations.
      </p>

      <HelpSection title="Mes bulletins">
        <p>
          Liste des bulletins de paie émis pour toi, par mois. Pour chacun : brut, retenues, net
          à payer, statut (émis, payé). Bouton <strong>« Télécharger PDF »</strong> pour
          archiver ou justifier auprès d&apos;une banque/administration.
        </p>
      </HelpSection>

      <HelpSection title="Cumul annuel">
        <p>
          KPI annuels : revenus bruts cumulés, IRPP retenu, CNPS retenu, net perçu. Utile pour
          la déclaration fiscale personnelle (BNC/IRPP particulier).
        </p>
      </HelpSection>

      <HelpSection title="Attestations">
        <p>
          Bouton <strong>« Demander une attestation »</strong> : génère immédiatement une
          attestation de travail, de salaire, ou de présence (signée électroniquement par les RH).
        </p>
      </HelpSection>

      <HelpTip>
        Ces données sont <strong>privées</strong> et chiffrées. Personne d&apos;autre que toi
        (et les RH/DG en cas d&apos;audit) ne peut y accéder.
      </HelpTip>
    </>
  );
}
