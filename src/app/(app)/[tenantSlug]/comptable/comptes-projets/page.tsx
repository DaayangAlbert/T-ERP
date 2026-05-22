import { ProjectAccountsSection } from "@/components/cpt/ProjectAccountsSection";

export const dynamic = "force-dynamic";

export default function ComptableComptesProjetsPage() {
  return (
    <>
      <header className="mb-4 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Comptes projet</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Suivi des entrées / sorties et de la disponibilité des chantiers de votre périmètre.
        </p>
      </header>

      <ProjectAccountsSection variant="comptable" />
    </>
  );
}
