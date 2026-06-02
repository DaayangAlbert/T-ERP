"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function RhMedicalTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>visites médicales</strong> obligatoires (médecine du travail) et des
        <strong> aptitudes</strong> de chaque salarié. Obligation légale (Décret 99/056) :
        embauche, périodique, reprise, surveillance médicale spéciale.
      </p>

      <HelpSection title="Types de visites">
        <ul className="ml-5 list-disc">
          <li><strong>Embauche</strong> : avant ou dans les 8 jours.</li>
          <li><strong>Périodique</strong> : tous les <strong>12 mois</strong> minimum (6 mois pour les postes à risque).</li>
          <li><strong>Reprise</strong> : après arrêt maladie &gt; 21 j, AT/MP, maternité.</li>
          <li><strong>Surveillance spéciale</strong> : bruit, vibrations, hauteur, électricité…</li>
        </ul>
      </HelpSection>

      <HelpSection title="Programmer une visite">
        <HelpSteps>
          <li>Onglet <strong>« À programmer »</strong> : liste des salariés dont la visite arrive à échéance.</li>
          <li>Clique sur le bouton <strong>« Programmer »</strong> à droite du salarié.</li>
          <li>Saisis la date, l&apos;heure, le médecin du travail, le centre médical.</li>
          <li>Le salarié est notifié + l&apos;événement passe en <strong>« Programmée »</strong>.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Enregistrer une aptitude">
        <p>
          Après la visite, ouvre le dossier et saisis le résultat :
        </p>
        <ul className="ml-5 list-disc">
          <li><strong>Apte</strong> sans restriction.</li>
          <li><strong>Apte avec restrictions</strong> (préciser : pas de port de charge, pas de hauteur, etc.).</li>
          <li><strong>Inapte temporaire</strong> (avec durée).</li>
          <li><strong>Inapte définitif</strong> au poste.</li>
        </ul>
        <p>Joins le <strong>certificat médical PDF</strong>.</p>
      </HelpSection>

      <HelpWarn>
        Une <strong>inaptitude définitive</strong> déclenche une procédure spéciale :
        recherche de reclassement, ou rupture du contrat selon les cas. Coordination obligatoire
        avec le DAF et la DG.
      </HelpWarn>

      <HelpSection title="Alertes échéances">
        <p>
          KPI en haut + filtre : visites dans &lt; 30 j, en retard. Le tableau de bord RH affiche
          également un compteur de visites à programmer.
        </p>
      </HelpSection>

      <HelpTip>
        Tu peux <strong>programmer en lot</strong> plusieurs visites le même jour (vacation
        médecin sur site). Sélectionne les salariés concernés, bouton « Programmation groupée ».
      </HelpTip>
    </>
  );
}
