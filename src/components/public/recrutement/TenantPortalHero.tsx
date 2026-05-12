import { Users, Building2, Star, CalendarDays } from "lucide-react";

interface Props {
  tenantName: string;
  sector: string | null;
  primaryColor: string | null;
}

export function TenantPortalHero({ tenantName, sector, primaryColor }: Props) {
  const gradient = `linear-gradient(135deg, #2A1B3D 0%, ${primaryColor ?? "#7E22CE"} 100%)`;
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{ background: gradient }}
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-3xl">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Nous recrutons · {sector ?? "BTP"}
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight md:text-5xl">
            Construisons l&apos;avenir du Cameroun, ensemble.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/85">
            Rejoignez {tenantName} et participez aux chantiers d&apos;envergure
            qui transforment notre pays.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<Users className="h-4 w-4" />} v="487" l="collaborateurs" />
            <Stat icon={<Building2 className="h-4 w-4" />} v="23" l="chantiers" />
            <Stat icon={<CalendarDays className="h-4 w-4" />} v="12 ans" l="d'expertise" />
            <Stat icon={<Star className="h-4 w-4" />} v="4,8/5" l="Glassdoor" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, v, l }: { icon: React.ReactNode; v: string; l: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2 text-primary-200">
        {icon}
        <span className="text-base font-bold tabular-nums text-white">{v}</span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-white/70">{l}</div>
    </div>
  );
}
