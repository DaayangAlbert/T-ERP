interface Props {
  adminEmail: string;
  adminRole: string;
  initials: string;
}

export function AdminHeader({ adminEmail, adminRole, initials }: Props) {
  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b px-6 text-white"
      style={{ background: "#0B1322", borderColor: "#1E293B" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid h-8 w-8 place-items-center rounded text-[11px] font-bold"
          style={{ background: "#22D3EE", color: "#0F172A" }}
        >
          SA
        </span>
        <div>
          <div className="text-sm font-bold tracking-tight">T-ERP · Console SaaS</div>
          <div className="text-[10px] uppercase tracking-wider text-cyan-300/70">
            Anthropic · Production
          </div>
        </div>
      </div>
      <span className="ml-3 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
        CONSOLE PLATEFORME
      </span>
      <div className="ml-auto flex items-center gap-3 text-[12px]">
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          ● Tous services UP
        </span>
        <div className="flex items-center gap-2 border-l border-white/10 pl-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-400 text-[10px] font-semibold text-[#0F172A]">
            {initials}
          </span>
          <div className="hidden sm:block">
            <div className="text-white">{adminEmail}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/60">
              {adminRole}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
