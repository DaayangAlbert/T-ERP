"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function ProfilTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton <strong>espace personnel</strong> en tant que comptable. Tu y trouves ton avatar, tes
        préférences et — si tu es <em>Comptable Chantier</em> — la liste de tes chantiers
        affectés (ton périmètre comptable).
      </p>

      <HelpSection title="Avatar">
        <p>
          Clique sur ton avatar pour téléverser une photo. Elle apparaît dans la messagerie, les
          rapports signés, et l&apos;annuaire personnel.
        </p>
      </HelpSection>

      <HelpSection title="Mes chantiers assignés (Comptable Chantier uniquement)">
        <p>
          Liste des chantiers sur lesquels tu peux saisir, valider, consulter. C&apos;est
          l&apos;informaticien qui paramètre cette affectation dans le module IT.
        </p>
      </HelpSection>

      <HelpTip>
        Pour modifier d&apos;autres infos (téléphone, email perso, etc.), passe par
        <strong> Mon espace personnel</strong> (sidebar « Mon profil »).
      </HelpTip>
    </>
  );
}
