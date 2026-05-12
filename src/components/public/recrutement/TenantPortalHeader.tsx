import Link from "next/link";

interface Props {
  tenantName: string;
  primaryColor: string | null;
  logoUrl: string | null;
}

export function TenantPortalHeader({ tenantName, primaryColor, logoUrl }: Props) {
  const initials = tenantName
    .split(" ")
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/recrutement" className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenantName} className="h-9 w-9 rounded-md object-cover" />
          ) : (
            <div
              className="grid h-9 w-9 place-items-center rounded-md text-sm font-bold text-white"
              style={{ background: primaryColor ?? "#A855F7" }}
            >
              {initials}
            </div>
          )}
          <div>
            <div className="text-sm font-bold text-ink">{tenantName}</div>
            <div className="text-[10px] uppercase tracking-wider text-ink-3">
              Espace recrutement
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/cand/login"
            className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-alt md:inline-block"
          >
            Espace candidat
          </Link>
          <a
            href="#spontanee"
            className="rounded-md px-4 py-2 text-sm font-medium text-white shadow-brand hover:opacity-90"
            style={{ background: primaryColor ?? "#A855F7" }}
          >
            Candidature spontanée
          </a>
        </div>
      </div>
    </header>
  );
}
