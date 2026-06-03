"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaPlanningTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue <strong>planning consolidé</strong> de tous les chantiers : Gantt synthétique
        sur l&apos;ensemble du portefeuille.
      </p>

      <HelpSection title="Gantt consolidé">
        <p>
          Une ligne par chantier majeur, barres = durée chantier, losanges = jalons MOA.
          Permet de visualiser les charges futures et les pics de production.
        </p>
      </HelpSection>

      <HelpSection title="Jalons critiques">
        <p>
          Filtre <strong>« Jalons à risque »</strong> = jalons à fort enjeu financier
          (≥ 100 M FCFA) avec décalage prévu &gt; 15 j. Ce sont ces lignes qui méritent
          ton arbitrage.
        </p>
      </HelpSection>

      <HelpSection title="Capacité prévisionnelle">
        <p>
          Vue agrégée des charges (heures × type métier) sur les 12 prochains mois.
          Indique si le groupe a la capacité (équipes, engins, BFR) pour absorber la
          charge en pipeline.
        </p>
      </HelpSection>

      <HelpTip>
        Cette vue prépare les décisions d&apos;investissement (recrutement, achat
        d&apos;engins, financement). Demande un point au DG si tu vois une zone rouge.
      </HelpTip>
    </>
  );
}
