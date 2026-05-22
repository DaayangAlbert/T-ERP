import { AccountantsAssignSection } from "@/components/daf/accountants/AccountantsAssignSection";

export const dynamic = "force-dynamic";

export default function ComptesProjetsPage() {
  return (
    <>
      <header className="mb-4 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Comptabilité analytique</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Comptes par projet adossés aux comptes bancaires réels, compte salaire et affectation des comptables.
        </p>
      </header>

      <div className="space-y-4">
        <AccountantsAssignSection />
      </div>
    </>
  );
}
