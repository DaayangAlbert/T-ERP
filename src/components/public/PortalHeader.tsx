"use client";

interface Props {
  onLogin: () => void;
  onSignup: () => void;
}

export function PortalHeader({ onLogin, onSignup }: Props) {
  return (
    <header
      className="sticky top-0 z-40 flex h-16 items-center gap-6 border-b border-[#2A1B3D] px-6 text-white"
      style={{ background: "#0F0817" }}
    >
      <div className="flex items-center gap-3">
        <Logo className="h-8 w-8" />
        <div>
          <div className="text-base font-bold tracking-tight">T-ERP</div>
          <div className="text-[10px] font-medium tracking-wider text-primary-300">
            PLATEFORME SaaS · BTP
          </div>
        </div>
      </div>

      <nav className="ml-8 hidden items-center gap-2 sm:flex">
        <button className="rounded-md bg-primary-500/20 px-3 py-1.5 text-sm font-medium text-white">
          Offres d'emploi
        </button>
        <button className="rounded-md px-3 py-1.5 text-sm text-white/70 hover:text-white">
          À propos
        </button>
        <button className="rounded-md px-3 py-1.5 text-sm text-white/70 hover:text-white">
          Tarifs
        </button>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onLogin}
          className="rounded-md border border-white/25 bg-transparent px-3 py-1.5 text-[13px] font-medium text-white transition hover:border-white/50"
        >
          Se connecter
        </button>
        <button
          onClick={onSignup}
          className="rounded-md bg-primary-500 px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-primary-600 hover:shadow-brand"
        >
          S'inscrire
        </button>
      </div>
    </header>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="portal-header-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect fill="url(#portal-header-grad)" x="6" y="14" width="52" height="11" rx="2" />
      <rect fill="url(#portal-header-grad)" x="14" y="29" width="36" height="11" rx="2" />
      <rect fill="url(#portal-header-grad)" x="22" y="44" width="20" height="11" rx="2" />
    </svg>
  );
}
