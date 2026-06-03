"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function OuvProfilTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton <strong>profil personnel</strong> : tes infos, ta photo, tes habilitations,
        tes formations, tes documents administratifs.
      </p>

      <HelpSection title="Mes infos">
        <p>
          Nom, matricule, date d&apos;embauche, poste, chantier d&apos;affectation,
          coordonnées. Tu peux mettre à jour ta photo et ton numéro de téléphone.
        </p>
      </HelpSection>

      <HelpSection title="Mes habilitations">
        <p>
          CACES, SST, travail en hauteur, électricien… Date d&apos;obtention, date
          d&apos;expiration. Anticipe les renouvellements pour rester apte.
        </p>
      </HelpSection>

      <HelpSection title="Mes formations">
        <p>
          Formations suivies, à venir. Permet de progresser dans le métier — n&apos;hésite
          pas à demander une formation à ton chef si tu en repères une utile.
        </p>
      </HelpSection>

      <HelpSection title="Mes documents">
        <p>
          Copie CNI, contrat, attestations CNPS… Si un document manque, signale-le au
          RH pour rester en règle.
        </p>
      </HelpSection>

      <HelpTip>
        Garde tes coordonnées à jour : c&apos;est par là que l&apos;entreprise te joint
        en cas d&apos;urgence (changement de planning, fermeture imprévue, etc.).
      </HelpTip>
    </>
  );
}
