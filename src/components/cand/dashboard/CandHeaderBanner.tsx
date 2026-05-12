interface Props {
  firstName: string;
  tenantName: string;
  completionPct: number;
}

export function CandHeaderBanner({ firstName, tenantName, completionPct }: Props) {
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
