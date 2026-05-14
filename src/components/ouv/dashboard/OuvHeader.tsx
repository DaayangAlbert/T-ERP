"use client";

// Header sombre violet (#2A1B3D) du screen-ouv-dashboard : logo T-ERP gauche +
// avatar circulaire utilisateur 36px à droite. Sticky en haut, full bleed.

interface Props {
  initials: string;
  avatarUrl?: string | null;
}

export function OuvHeader({ initials, avatarUrl }: Props) {
  return (
    <header className="flex items-center gap-3 bg-[#2A1B3D] px-4 py-3 text-white">
      <div className="flex flex-1 items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-purple-400 to-purple-600">
          <TerpLogoMark />
        </span>
        <span className="text-base font-bold tracking-tight">T-ERP</span>
      </div>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={initials}
          className="h-9 w-9 rounded-full border-2 border-white/15 object-cover"
        />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-full bg-purple-500 text-[13px] font-bold">
          {initials}
        </span>
      )}
    </header>
  );
}

function TerpLogoMark() {
  return (
    <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden="true">
      <rect fill="#fff" x="6" y="14" width="52" height="11" rx="2" />
      <rect fill="#fff" x="14" y="29" width="36" height="11" rx="2" />
      <rect fill="#fff" x="22" y="44" width="20" height="11" rx="2" />
    </svg>
  );
}
