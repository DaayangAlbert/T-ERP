"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function EmpDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton <strong>tableau de bord personnel</strong> : aperçu rapide de tes
        informations clés (pointage du jour, solde congés, dernière paie, notifications).
      </p>

      <HelpSection title="Mes KPIs">
        <p>
          Présence pointée ou non, solde de congés disponible, montant net de la
          dernière paie, nombre de notifications en attente.
        </p>
      </HelpSection>

      <HelpSection title="Notifications">
        <p>
          Messages de ton chef, validation de tes demandes, nouvelles fiches de paie
          disponibles, formations à venir. Tape pour ouvrir le détail.
        </p>
      </HelpSection>

      <HelpSection title="Actions rapides">
        <p>
          Demander un congé, télécharger un bulletin, voir ton planning, contacter ton
          chef via la messagerie.
        </p>
      </HelpSection>

      <HelpTip>
        Cette page est ton point d&apos;entrée quotidien — consulte-la chaque matin pour
        prendre connaissance des dernières actualités.
      </HelpTip>
    </>
  );
}
