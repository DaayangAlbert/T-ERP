"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtMethodesTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Méthodes et planification</strong> : bibliothèque des modes opératoires,
        plannings types, gabarits BPU, fiches techniques. C&apos;est le savoir-faire de la
        DT capitalisé pour être réutilisé par les nouveaux chantiers.
      </p>

      <HelpSection title="Bibliothèque de modes opératoires">
        <p>
          Documents techniques classés par discipline : terrassement, béton armé, voirie,
          réseaux humides, structure métallique, etc. Chacun avec ses étapes, outillage,
          ressources, durée standard.
        </p>
      </HelpSection>

      <HelpSection title="Plannings types">
        <p>
          Modèles de planning par type d&apos;ouvrage (logement collectif, route bitumée, pont
          en BA…). Utilisés par les DTrav et CDT lors du démarrage chantier comme base de
          travail.
        </p>
      </HelpSection>

      <HelpSection title="Gabarits BPU">
        <p>
          Bordereaux de Prix Unitaires types : articles standard avec leur PU de référence,
          quantités, descriptifs. Permet de monter rapidement une situation de travaux
          (page Comptable → Situations clients) sans tout retaper.
        </p>
      </HelpSection>

      <HelpTip>
        Mettre cette bibliothèque à jour <strong>après chaque chantier livré</strong> :
        leçons apprises, prix réajustés, méthodes améliorées. C&apos;est ce qui fait la
        compétitivité de l&apos;entreprise.
      </HelpTip>
    </>
  );
}
