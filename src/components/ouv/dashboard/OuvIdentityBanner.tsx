"use client";

// Bandeau identité gradient violet (#2A1B3D → #7E22CE) du prototype.
// Affiche l'avatar 54px (initiales si pas de photo), nom + qualif + matricule,
// puis le chip "Affecté · Chantier X · Chef Y" avec pastille verte.

interface Props {
  initials: string;
  fullName: string;
  qualification: string;
  matricule: string | null;
  avatarUrl?: string | null;
  assignment: {
    siteCode: string;
    siteName: string;
    teamLabel: string;
    payrollDayLabel: string;
    chief: { firstName: string; lastName: string } | null;
  } | null;
}

export function OuvIdentityBanner({
  initials,
  fullName,
  qualification,
  matricule,
  avatarUrl,
  assignment,
}: Props) {
  return (
    <section className="bg-gradient-to-br from-[#2A1B3D] to-[#7E22CE] px-4 py-[18px] text-white">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={initials}
            className="h-[54px] w-[54px] flex-shrink-0 rounded-full border-[3px] border-white/20 object-cover"
          />
        ) : (
          <span className="grid h-[54px] w-[54px] flex-shrink-0 place-items-center rounded-full border-[3px] border-white/20 bg-purple-500 text-lg font-extrabold">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-extrabold leading-tight">{fullName}</p>
          <p className="mt-0.5 truncate text-[13px] opacity-85">
            {qualification}
            {matricule ? ` · matricule ${shortenMatricule(matricule)}` : ""}
          </p>
        </div>
      </div>

      {assignment ? (
        <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-white/12 px-[14px] py-2.5">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-500"
            style={{ boxShadow: "0 0 8px #22C55E" }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold">
              Affecté · Chantier {assignment.siteName}
            </p>
            <p className="truncate text-[12px] opacity-85">
              {assignment.chief
                ? `Chef : ${assignment.chief.firstName} ${assignment.chief.lastName} · `
                : ""}
              {assignment.teamLabel} · {assignment.payrollDayLabel}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-[10px] bg-white/12 px-[14px] py-2.5 text-[12px] opacity-85">
          Pas encore affecté à un chantier
        </div>
      )}
    </section>
  );
}

// "BTC-2018-0287" → "0287" pour l'affichage compact
function shortenMatricule(m: string): string {
  const parts = m.split("-");
  return parts[parts.length - 1] ?? m;
}
