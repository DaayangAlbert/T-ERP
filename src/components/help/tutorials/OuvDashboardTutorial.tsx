"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function OuvDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Bienvenue sur ton espace <strong>ouvrier</strong>. Tout ce qu&apos;il te faut au
        quotidien sur le chantier : pointage, missions du jour, paie, congés, sécurité.
      </p>

      <HelpSection title="Mes infos du jour">
        <p>
          Présence pointée ou non, tâches qui me sont affectées, heures sup en cours,
          notifications du chef.
        </p>
      </HelpSection>

      <HelpSection title="Actions rapides">
        <p>
          Pointer arrivée / départ, voir ma mission, signaler un incident, demander un
          congé, voir ma fiche de paie. Boutons gros, accessibles d&apos;une main.
        </p>
      </HelpSection>

      <HelpSection title="Notifications">
        <p>
          Le chef t&apos;envoie un message ou une consigne ? Une formation se profile ?
          Les notifs apparaissent ici. Tape pour les ouvrir.
        </p>
      </HelpSection>

      <HelpTip>
        L&apos;application fonctionne <strong>hors-ligne</strong> : ton pointage est
        enregistré et envoyé dès que tu retrouves la connexion.
      </HelpTip>
    </>
  );
}
