"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function SgInstitutionnelTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>relations institutionnelles</strong> : autorités, partenaires,
        chambres consulaires, ambassades, élus locaux.
      </p>

      <HelpSection title="Carnet d'adresses institutionnel">
        <p>
          Contacts par institution : nom, fonction, coordonnées, dernière interaction,
          niveau de relation (formel, professionnel, proche).
        </p>
      </HelpSection>

      <HelpSection title="Calendrier événements">
        <p>
          Évén ements à venir : sommets, salons, réceptions, rencontres officielles.
          Préparer les participations du DG/PCA.
        </p>
      </HelpSection>

      <HelpSection title="Historique interactions">
        <p>
          Chronologie des rencontres et courriers échangés avec chaque institution. Utile
          pour les revues stratégiques et le suivi de la diplomatie d'entreprise.
        </p>
      </HelpSection>

      <HelpTip>
        Les relations institutionnelles se cultivent avant qu'on en ait besoin. Ne laisse
        pas l'agenda se vider — propose au DG des rencontres préventives.
      </HelpTip>
    </>
  );
}
