import type { ReactNode } from "react";
import { CandidateHeader } from "./CandidateHeader";
import { CandidateSidebar } from "./CandidateSidebar";

interface Props {
  fullName: string;
  email: string;
  initials: string;
  completionPct: number;
  tenantName?: string | null;
  children: ReactNode;
}

export function CandidateShell({
  fullName,
  email,
  initials,
  completionPct,
  tenantName,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-surface-alt">
      <CandidateHeader fullName={fullName} email={email} initials={initials} />
      <div className="flex">
        <CandidateSidebar />
        <main className="flex-1 min-w-0">
          <CandidateBanner
            firstName={fullName.split(" ")[0]}
            tenantName={tenantName ?? "Portail emploi"}
            completionPct={completionPct}
          />
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function CandidateBanner({
  firstName,
  tenantName,
  completionPct,
}: {
  firstName: string;
  tenantName: string;
  completionPct: number;
}) {
  return (
    <div className="bg-brand-gradient-dark px-4 py-4 text-white md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-white/70">
            Espace candidat · {tenantName}
          </div>
          <div className="mt-1 text-base font-semibold md:text-lg">
            👋 Bonjour {firstName} — bienvenue sur votre espace
          </div>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
          Profil {completionPct}% complété
        </span>
      </div>
    </div>
  );
}
