import Link from "next/link";
import { ArrowRight, Building2, Users, FileCheck, Wallet } from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-brand-gradient-dark text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(192,132,252,.25), transparent 40%), radial-gradient(circle at 80% 30%, rgba(168,85,247,.25), transparent 40%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              ERP BTP · Cameroun · CEMAC
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
              L&apos;ERP qui parle <span className="text-primary-300">SYSCOHADA</span>,
              CNPS et chantier
            </h1>
            <p className="mt-4 text-base text-white/85 md:text-lg">
              Pilotez vos chantiers, vos équipes et votre comptabilité depuis une
              seule plateforme. Pensée pour les PME BTP camerounaises et leur
              écosystème.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-primary-700 shadow-brand-lg hover:bg-primary-50"
              >
                Demander une démo gratuite
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#modules"
                className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"
              >
                Voir les modules
              </a>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <Stat icon={<Building2 className="h-4 w-4" />} value="23" label="chantiers" />
              <Stat icon={<Users className="h-4 w-4" />} value="487" label="employés" />
              <Stat icon={<FileCheck className="h-4 w-4" />} value="100%" label="SYSCOHADA" />
              <Stat icon={<Wallet className="h-4 w-4" />} value="-30%" label="temps paie" />
            </div>
          </div>
          <MockupCard />
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
      <span className="text-primary-200">{icon}</span>
      <div>
        <div className="text-sm font-bold tabular-nums">{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-white/70">{label}</div>
      </div>
    </div>
  );
}

function MockupCard() {
  return (
    <div className="relative min-w-0">
      <div className="pointer-events-none absolute inset-0 -m-4 rounded-2xl bg-primary-300/20 blur-2xl" />
      <div className="relative rounded-xl bg-white p-4 text-ink shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-rose-400" />
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <span className="ml-2 text-[11px] text-ink-3">batimcam.terpgroup.com/dt</span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">
            Chantier Pont Mfoundi · 67% avancement
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded bg-emerald-50 p-2">
              <div className="text-base font-bold text-emerald-700">142 M</div>
              <div className="text-[10px] text-ink-3">FCFA dépensés</div>
            </div>
            <div className="rounded bg-amber-50 p-2">
              <div className="text-base font-bold text-amber-700">12</div>
              <div className="text-[10px] text-ink-3">alertes</div>
            </div>
            <div className="rounded bg-blue-50 p-2">
              <div className="text-base font-bold text-blue-700">35</div>
              <div className="text-[10px] text-ink-3">ouvriers</div>
            </div>
          </div>
          <div className="rounded border border-line p-2">
            <div className="mb-1 flex justify-between text-[10px] text-ink-3">
              <span>Planning Q2</span>
              <span>OK</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full w-3/4 rounded-full bg-brand-gradient" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
