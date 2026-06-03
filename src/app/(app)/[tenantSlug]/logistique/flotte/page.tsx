"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Truck, Fuel, AlertOctagon, Wrench } from "lucide-react";
import { clsx } from "clsx";
import { useLogFleet } from "@/hooks/useLogFleet";
import { PageHelp } from "@/components/help/PageHelp";
import { LogFlotteTutorial } from "@/components/help/tutorials/LogFlotteTutorial";

const TYPE_TABS: Array<{ key: string; label: string }> = [
  { key: "", label: "Tous" },
  { key: "TP_HEAVY", label: "Engins TP" },
  { key: "TRUCK", label: "Camions" },
  { key: "CONCRETE_MIXER", label: "Bétonnières" },
  { key: "SERVICE_VEHICLE", label: "Véhicules service" },
];

const STATUS_BADGE: Record<string, string> = {
  IN_SERVICE: "bg-emerald-100 text-emerald-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
  BREAKDOWN: "bg-rose-100 text-rose-700",
  RETIRED: "bg-slate-100 text-slate-500",
  TRANSFER: "bg-blue-100 text-blue-700",
};

const STATUS_LABEL: Record<string, string> = {
  IN_SERVICE: "En service",
  MAINTENANCE: "Maintenance",
  BREAKDOWN: "Panne",
  RETIRED: "Réformé",
  TRANSFER: "Transfert",
};

const TYPE_LABEL: Record<string, string> = {
  TP_HEAVY: "Engin TP",
  TRUCK: "Camion",
  CONCRETE_MIXER: "Bétonnière",
  SERVICE_VEHICLE: "Véhicule",
  OTHER: "Autre",
};

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  if (n >= 1_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return n.toLocaleString("fr-FR");
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function LogFleetPage() {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading } = useLogFleet({ type, status, search: debouncedSearch });

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Flotte engins</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            <strong>{data.kpis.total}</strong> unités · <strong>{data.kpis.inService}</strong> en service ·{" "}
            <strong>{data.kpis.maintenance}</strong> maintenance · <strong>{data.kpis.breakdown}</strong> panne · valorisation{" "}
            <strong>{fmt(data.kpis.totalValue)} FCFA</strong>
          </p>
        </div>
        <PageHelp title="Aide — Flotte"><LogFlotteTutorial /></PageHelp>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div className="text-[20px] font-bold leading-none text-emerald-700">
            {data.kpis.inService}/{data.kpis.total}
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">En service</div>
          <div className="text-[10.5px] text-ink-3">{data.kpis.availability} % dispo</div>
        </div>
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div className={clsx("text-[20px] font-bold leading-none", data.kpis.maintenance > 0 ? "text-amber-700" : "text-ink")}>
            {data.kpis.maintenance}
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">Maintenance</div>
          <div className="text-[10.5px] text-ink-3">{data.kpis.maintenancesUpcoming} prévues sous 30 j</div>
        </div>
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div className={clsx("text-[20px] font-bold leading-none", data.kpis.breakdown > 0 ? "text-rose-700" : "text-ink")}>
            {data.kpis.breakdown}
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">En panne</div>
          <div className="text-[10.5px] text-ink-3">Indispo immédiate</div>
        </div>
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div className="text-[20px] font-bold leading-none text-ink">
            {(data.kpis.fuelLitersWeek / 1000).toFixed(1)}k L
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">Conso gasoil semaine</div>
          <div className="text-[10.5px] text-ink-3">≈ {fmt(data.kpis.fuelCostWeek)} FCFA</div>
        </div>
      </div>

      {/* Onglets type */}
      <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-line">
        {TYPE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={clsx(
              "relative shrink-0 px-3 py-2 text-[12.5px] font-medium",
              type === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.label}
            {t.key && (
              <span className="ml-1 inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                {data.countByType[t.key] ?? 0}
              </span>
            )}
            {type === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {/* Recherche + statut */}
      <div className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            placeholder="Immatriculation, désignation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-line-2 bg-white pl-8 pr-2 text-[12.5px]"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 w-full rounded-md border border-line-2 bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous statuts</option>
          <option value="IN_SERVICE">En service</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="BREAKDOWN">Panne</option>
        </select>
      </div>

      {/* Tableau engins */}
      <div className="rounded-xl border border-line bg-white">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Immat</th>
                <th className="px-3 py-2 text-left font-medium">Désignation</th>
                <th className="px-3 py-2 text-left font-medium">Chantier</th>
                <th className="px-3 py-2 text-right font-medium">Compteur</th>
                <th className="px-3 py-2 text-left font-medium">Conducteur</th>
                <th className="px-3 py-2 text-left font-medium">État</th>
                <th className="px-3 py-2 text-left font-medium">Prochaine maint.</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.id} className="border-t border-line hover:bg-surface-alt/60">
                  <td className="px-3 py-2 font-mono text-[11.5px]">{e.registration}</td>
                  <td className="px-3 py-2 font-medium text-ink">{e.designation}</td>
                  <td className="px-3 py-2 text-ink-2">{e.site}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {e.counter.toLocaleString("fr-FR")} {e.counterUnit}
                  </td>
                  <td className="px-3 py-2 text-ink-2">{e.driver}</td>
                  <td className="px-3 py-2">
                    <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", STATUS_BADGE[e.status])}>
                      {STATUS_LABEL[e.status] ?? e.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-2">
                    {e.nextMaintenance?.scheduledAt
                      ? format(new Date(e.nextMaintenance.scheduledAt), "dd/MM/yy", { locale: fr })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 p-3 md:hidden">
          {data.items.map((e) => (
            <div key={e.id} className="rounded-lg border border-line p-3">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-mono text-[11px] text-ink-3">{e.registration}</div>
                  <div className="text-[13px] font-semibold text-ink">{e.designation}</div>
                  <div className="text-[11px] text-ink-3">{TYPE_LABEL[e.type] ?? e.type}</div>
                </div>
                <span className={clsx("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", STATUS_BADGE[e.status])}>
                  {STATUS_LABEL[e.status] ?? e.status}
                </span>
              </div>
              <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
                <div>
                  <dt className="text-ink-3">Chantier</dt>
                  <dd className="font-medium">{e.site}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Conducteur</dt>
                  <dd className="font-medium">{e.driver}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Compteur</dt>
                  <dd className="font-mono">{e.counter.toLocaleString("fr-FR")} {e.counterUnit}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Prochaine maint.</dt>
                  <dd className="font-medium">
                    {e.nextMaintenance?.scheduledAt
                      ? format(new Date(e.nextMaintenance.scheduledAt), "dd/MM/yy", { locale: fr })
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
