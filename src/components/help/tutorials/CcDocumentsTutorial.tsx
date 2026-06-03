"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function CcDocumentsTutorial() {
  return (
    <>
      <p className="mb-4">
        Documents <strong>utiles au chef de chantier</strong> : plans EXE, modes opératoires,
        fiches techniques, PHS (plan hygiène sécurité).
      </p>

      <HelpSection title="Recherche">
        <p>
          Recherche par titre, référence ou catégorie. Filtre rapide : plans, modes
          opératoires, HSE, fiches matière.
        </p>
      </HelpSection>

      <HelpSection title="Consultation">
        <p>
          Tape un document → aperçu PDF ou image. Téléchargement local si tu pars en zone
          sans connexion (vue hors ligne).
        </p>
      </HelpSection>

      <HelpSection title="Téléverser">
        <p>
          Bouton <strong>« Uploader »</strong> pour ajouter une photo d&apos;avancement, un
          croquis manuscrit, un PV. Rattaché au chantier actif, visible par le CDT.
        </p>
      </HelpSection>

      <HelpTip>
        En cas de doute sur une cote ou un détail technique, consulte ici plutôt que de
        deviner — ou demande au CDT.
      </HelpTip>
    </>
  );
}
