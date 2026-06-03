"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function ProfilAgendaTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton <strong>agenda personnel</strong> : événements à venir, réunions auxquelles
        tu es convoqué, jalons clés.
      </p>

      <HelpSection title="Événements à venir">
        <p>
          Réunions, audits, visites MOA, formations, conseils d&apos;administration —
          selon ton rôle et tes affectations. Synchronisé avec les modules opérationnels.
        </p>
      </HelpSection>

      <HelpSection title="Notifications">
        <p>
          Rappels J-7, J-1, J-1h avant un événement. Configurables depuis ton profil
          (canal email, push, in-app).
        </p>
      </HelpSection>

      <HelpSection title="Export iCal">
        <p>
          Bouton <strong>« Exporter »</strong> pour synchroniser avec Google Calendar,
          Outlook, etc. Utilise un lien iCal sécurisé personnel.
        </p>
      </HelpSection>

      <HelpTip>
        Consulte ton agenda chaque lundi matin pour anticiper la semaine. Une réunion
        ratée par oubli peut coûter cher (décision Conseil, validation client).
      </HelpTip>
    </>
  );
}
