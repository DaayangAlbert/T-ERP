"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function OuvOutilsTutorial() {
  return (
    <>
      <p className="mb-4">
        Liste des <strong>outils et matériel</strong> qui te sont confiés : petit
        outillage, EPI, équipements personnels reçus du magasin.
      </p>

      <HelpSection title="Mes outils">
        <p>
          Liste avec date de remise + état. Tu es responsable de chaque outil reçu —
          en cas de perte, signale immédiatement au chef.
        </p>
      </HelpSection>

      <HelpSection title="Demander un outil / EPI">
        <p>
          Bouton <strong>« Nouvelle demande »</strong> → choisis l&apos;article (gants,
          casque, outil…), justifie (usure, perte, nouveau besoin). La demande remonte
          au chef de chantier.
        </p>
      </HelpSection>

      <HelpSection title="Rendre un outil">
        <p>
          En fin de mission ou de chantier, retour au magasin avec l&apos;outil. Le
          magasinier scanne, l&apos;outil sort de ta liste.
        </p>
      </HelpSection>

      <HelpTip>
        Un EPI abîmé (gants déchirés, casque fissuré) ne te protège plus. Demande-en
        un nouveau immédiatement — ce n&apos;est jamais un problème pour l&apos;entreprise.
      </HelpTip>
    </>
  );
}
