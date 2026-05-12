import { HardHat } from "lucide-react";

interface Props {
  firstName: string;
  position: string | null;
  siteName: string | null;
}

/**
 * Bandeau sticky en haut du dashboard : prénom, position, chantier.
 * Gradient violet T-ERP. Mobile-first, lisible d'un coup d'œil en chantier.
 */
export function EmpHeaderBanner({ firstName, position, siteName }: Props) {
  return (
    <header className="sticky top-0 z-10 -mx-4 bg-gradient-to-br from-purple-700 via-purple-600 to-fuchsia-500 px-4 py-4 text-white shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
          <HardHat className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">👋 {firstName}</p>
          {position && <p className="truncate text-xs opacity-90">{position}</p>}
        </div>
        {siteName && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            🏗 {siteName}
          </span>
        )}
      </div>
    </header>
  );
}
