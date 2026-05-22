import { BanksCard } from "@/components/cpt/BanksCard";
import { ProjectAccountsSection } from "@/components/cpt/ProjectAccountsSection";
import { SalaryAccountSection } from "@/components/cpt/SalaryAccountSection";
import { OverheadDistributionSection } from "@/components/cpt/OverheadDistributionSection";
import { AccountantsAssignSection } from "@/components/daf/accountants/AccountantsAssignSection";

export const dynamic = "force-dynamic";

export default function ComptesProjetsPage() {
  return (
    <>
      <header className="mb-4 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Comptabilité analytique</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Tous les comptes de l&apos;entreprise : comptes bancaires réels, comptes projet adossés à ces banques, compte salaire et affectation des comptables.
        </p>
      </header>

      <div className="space-y-4">
        <BanksCard />
        <ProjectAccountsSection />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SalaryAccountSection />
          <OverheadDistributionSection />
        </div>
        <AccountantsAssignSection />
      </div>
    </>
  );
}
