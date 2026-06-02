import { ProjectAccountsSection } from "@/components/cpt/ProjectAccountsSection";
import { PageHelp } from "@/components/help/PageHelp";
import { ComptesProjetsTutorial } from "@/components/help/tutorials/ComptesProjetsTutorial";

export const dynamic = "force-dynamic";

export default function ComptableComptesProjetsPage() {
  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Comptes projet</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Suivi des entrées / sorties et de la disponibilité des chantiers de votre périmètre.
          </p>
        </div>
        <PageHelp title="Aide — Comptes projet"><ComptesProjetsTutorial /></PageHelp>
      </header>

      <ProjectAccountsSection variant="comptable" />
    </>
  );
}
