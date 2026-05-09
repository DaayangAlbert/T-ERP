"use client";

import { Search, MapPin, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface Props {
  totalJobs: number;
  onSearch?: (q: string, region: string) => void;
}

const REGIONS = ["Toutes villes", "Yaoundé", "Douala", "Bafoussam", "Multi-chantiers"];

export function PortalHero({ totalJobs, onSearch }: Props) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState(REGIONS[0]);

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 text-white"
      style={{ background: "linear-gradient(135deg,#0F0817 0%,#2A1B3D 50%,#7E22CE 100%)" }}
    >
      {/* Radial accent blobs */}
      <div
        className="pointer-events-none absolute -right-12 -top-24 h-[400px] w-[400px]"
        style={{ background: "radial-gradient(circle,rgba(192,132,252,.25),transparent 60%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-[10%] h-[300px] w-[300px]"
        style={{ background: "radial-gradient(circle,rgba(168,85,247,.18),transparent 60%)" }}
      />

      <div className="relative mx-auto max-w-[1100px] text-center">
        <div className="mb-4 inline-block rounded-full border border-primary-300/40 bg-primary-500/20 px-3 py-1 text-[11.5px] font-medium tracking-wider text-primary-100">
          ★ {totalJobs} offre{totalJobs > 1 ? "s" : ""} ouverte{totalJobs > 1 ? "s" : ""} sur la plateforme T-ERP
        </div>

        <h1 className="mb-3 text-4xl font-bold leading-tight tracking-tight sm:text-[42px]">
          Trouvez votre prochaine mission BTP au Cameroun
        </h1>
        <p className="mx-auto mb-7 max-w-[640px] text-[15px] opacity-80">
          Offres publiées par les entreprises clientes T-ERP. Postulez en quelques clics
          et suivez vos candidatures en temps réel.
        </p>

        <form
          role="search"
          aria-label="Rechercher des offres d'emploi"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch?.(q, region === REGIONS[0] ? "" : region);
          }}
          className="mx-auto flex max-w-[720px] gap-2 rounded-[10px] border border-white/15 bg-white/8 p-2 backdrop-blur"
        >
          <div className="flex flex-1 items-center gap-2 rounded-md bg-white/5 px-3.5">
            <Search className="h-4 w-4 text-white/70" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Métier, mot-clé (ingénieur, maçon, comptable…)"
              className="h-10 flex-1 bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
            />
          </div>
          <div className="flex min-w-[160px] items-center gap-1.5 rounded-md bg-white/5 px-3 text-white/85">
            <MapPin className="h-4 w-4" />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="h-10 cursor-pointer bg-transparent text-[13px] text-white focus:outline-none"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r} className="text-black">
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-10 rounded-md bg-primary-500 px-5 text-sm font-medium text-white transition hover:bg-primary-600 hover:shadow-brand"
          >
            Rechercher
          </button>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-x-12 gap-y-2 text-xs text-white/70">
          {["Candidature en ligne", "Suivi des candidatures", "Alertes personnalisées"].map((label) => (
            <span key={label} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
