import type { ReactNode } from "react";
import { CandidateHeader } from "./CandidateHeader";
import { CandidateSidebar } from "./CandidateSidebar";
import { CandHeaderBanner } from "@/components/cand/dashboard/CandHeaderBanner";

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
          <CandHeaderBanner
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
