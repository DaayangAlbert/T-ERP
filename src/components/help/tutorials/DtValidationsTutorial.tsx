"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function DtValidationsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Validations marchés et techniques</strong> : pour chaque nouveau marché signé,
        chaque avenant, chaque BC technique important, tu valides au niveau DT avant
        l&apos;exécution.
      </p>

      <HelpSection title="Types de validations">
        <ul className="ml-5 list-disc">
          <li><strong>Marché signé</strong> : nouveau chantier — validation des moyens, planning, équipe.</li>
          <li><strong>Avenant marché</strong> : modification du périmètre / délais / prix.</li>
          <li><strong>Méthode constructive</strong> : choix technique structurant.</li>
          <li><strong>Sous-traitant technique</strong> : agrément technique d&apos;un nouveau ST.</li>
          <li><strong>Réception technique</strong> : levée des réserves OPR.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Valider ou refuser">
        <HelpSteps>
          <li>Clique sur une demande → fiche détaillée avec pièces, montant, impact.</li>
          <li><strong>« Approuver »</strong> : la demande passe au stade suivant (souvent DG en N3 ou exécution directe).</li>
          <li><strong>« Refuser »</strong> : motif obligatoire — la demande retourne à l&apos;initiateur (CDT/DTrav).</li>
          <li><strong>« Demander complément »</strong> : pour des infos manquantes sans refus.</li>
        </HelpSteps>
      </HelpSection>

      <HelpWarn>
        Une validation marché t&apos;engage techniquement. Vérifie : moyens humains
        disponibles, équipement, conformité aux normes, marge prévisionnelle satisfaisante.
      </HelpWarn>

      <HelpTip>
        Cible : aucune validation marché ne reste &gt; 5 jours. Au-delà, ça retarde le
        démarrage chantier et la facturation.
      </HelpTip>
    </>
  );
}
