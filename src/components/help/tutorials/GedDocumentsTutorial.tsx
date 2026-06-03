"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function GedDocumentsTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue de tous les <strong>documents archivés</strong> dans la GED : liste paginée,
        filtres par espace / catégorie / date.
      </p>

      <HelpSection title="Filtrer">
        <p>
          Combine espace (Marchés, RH, etc.), catégorie (contrat, PV, plan…),
          sous-catégorie, période, auteur. Plus tu filtres, plus tu trouves vite.
        </p>
      </HelpSection>

      <HelpSection title="Téléverser un document">
        <HelpSteps>
          <li>Bouton <strong>« Uploader »</strong>.</li>
          <li>Glisser-déposer le fichier (PDF, image, Office).</li>
          <li>Titre + référence (numéro contrat, n° OS, n° BL…).</li>
          <li>Espace + catégorie + sous-catégorie obligatoires.</li>
          <li>Date du document (pas la date d&apos;upload — la date de signature ou d&apos;émission).</li>
          <li>Date de péremption si applicable (caution, assurance, contrat).</li>
          <li>Valider.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Versions">
        <p>
          Si tu uploades un document qui existe déjà (même titre, même espace), T-ERP
          propose de créer une nouvelle version. L&apos;historique est conservé.
        </p>
      </HelpSection>

      <HelpTip>
        Toujours déposer la <strong>version signée</strong>, pas le brouillon. Un
        document en GED a valeur de référence pour l&apos;entreprise.
      </HelpTip>
    </>
  );
}
