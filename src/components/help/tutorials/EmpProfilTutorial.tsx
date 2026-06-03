"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function EmpProfilTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton <strong>profil personnel</strong> : informations identitaires, photo, contacts,
        documents administratifs.
      </p>

      <HelpSection title="Mes infos">
        <p>
          Nom, prénom, matricule, date d&apos;embauche, fonction, chantier
          d&apos;affectation, RIB, coordonnées. Certaines informations sont en lecture
          seule (RH) ; d&apos;autres sont modifiables (photo, téléphone, adresse).
        </p>
      </HelpSection>

      <HelpSection title="Demande de modification">
        <p>
          Pour changer une info verrouillée (changement nom suite mariage, RIB,
          situation familiale), bouton <strong>« Demander une modification »</strong>.
          La demande est validée par RH/IT.
        </p>
      </HelpSection>

      <HelpSection title="Mes documents">
        <p>
          Copie CNI, contrat de travail, attestations CNPS, certificats. Téléchargeables
          en PDF.
        </p>
      </HelpSection>

      <HelpSection title="Mes contacts d&apos;urgence">
        <p>
          Personne à prévenir en cas d&apos;accident. Mets à jour si changement
          (mariage, divorce, déménagement de proches).
        </p>
      </HelpSection>

      <HelpTip>
        Garde ces infos à jour : c&apos;est par là que l&apos;entreprise te joint en
        cas d&apos;urgence et que ton RIB est utilisé pour la paie.
      </HelpTip>
    </>
  );
}
