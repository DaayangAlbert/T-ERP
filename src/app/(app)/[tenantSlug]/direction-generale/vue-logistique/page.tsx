"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, Wrench, AlertOctagon, CheckCircle2, Power, ArrowLeftRight, InfoIcon } from "lucide-react";
import { clsx } from "clsx";
import { PageHelp } from "@/components/help/PageHelp";
import { DgVuesTutorial } from "@/components/help/tutorials/DgVuesTutorial";

type Status = "IN_SERVICE" | "MAINTENANCE" | "BREAKDOWN" | "RETIRED" | "TRANSFER";

interface EquipmentItem {
  id: string;
  registration: string;
  designation: string;
  type: string;
  status: Status;
  counter: number;
  counterUnit: string;
  acquisitionValue: string;
  currentValue: string;
  insuranceUntil: string | null;
  visiteUntil: string | null;
  site: { id: string; code: string; name: string } | null;
  driver: string | null;
  maintenance: { status: string; description: string; scheduledAt: string | null } | null;
}

interface Summary {
  summary: {
    total: number;
    inService: number;
    inMaintenance: number;
    breakdown: number;
    retired: number;
    transfer: number;
    totalCurrentValue: string;
  };
  inService: EquipmentItem[];
  inMaintenance: EquipmentItem[];
  breakdown: EquipmentItem[];
  retired: EquipmentItem[];
  transfer: EquipmentItem[];
  productionBySite: Array<{
    siteId: string;
    code: string;
    name: string;
    equipmentCount: number;
    totalHours: number;
    totalKm: number;
  }>;
}

const TYPE_LABEL: Record<string, string> = {
  TP_HEAVY: "Engin TP",
  TRUCK: "Camion",
  CONCRETE_MIXER: "Bétonnière",
  SERVICE_VEHICLE: "Véh. service",
  OTHER: "Autre",
};

function fmtFCFA(n: string): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}

export default function DgVueLogistiquePage() {
  const [tab, setTab] = useState<"production" | "in-service" | "maintenance" | "breakdown" | "retired" | "rental">("production");
  const { data, isLoading } = useQuery({
    queryKey: ["dg", "logistics-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/dg/logistics-summary`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Summary>;
    },
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-2.5">
        <div>
          <h1 className="text-[20px] font-bold text-ink flex items-center gap-2">
            <Truck className="h-5 w-5 text-violet-600" /> Vue Logistique
          </h1>
          <p className="text-[12.5px] text-ink-3">Matériel du groupe · production par chantier · maintenance · location</p>
        </div>
        <PageHelp title="Aide — Vue Logistique DG"><DgVuesTutorial domaine="Logistique" /></PageHelp>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Total matériel" value={String(data.summary.total)} icon={<Truck className="h-4 w-4" />} tone="primary" />
        <Kpi label="En service" value={String(data.summary.inService)} icon={<CheckCircle2 className="h-4 w-4" />} tone="ok" />
        <Kpi label="En réparation" value={String(data.summary.inMaintenance)} icon={<Wrench className="h-4 w-4" />} tone="warn" />
        <Kpi label="En panne" value={String(data.summary.breakdown)} icon={<AlertOctagon className="h-4 w-4" />} tone="danger" alert={data.summary.breakdown > 0} />
        <Kpi label="Retirés" value={String(data.summary.retired)} icon={<Power className="h-4 w-4" />} tone="default" />
        <Kpi label="Valeur résiduelle" value={fmtFCFA(data.summary.totalCurrentValue)} icon={<Truck className="h-4 w-4" />} tone="default" />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        <TabBtn active={tab === "production"} onClick={() => setTab("production")}>Production par chantier</TabBtn>
        <TabBtn active={tab === "in-service"} onClick={() => setTab("in-service")}>En service ({data.summary.inService})</TabBtn>
        <TabBtn active={tab === "maintenance"} onClick={() => setTab("maintenance")}>En réparation ({data.summary.inMaintenance})</TabBtn>
        <TabBtn active={tab === "breakdown"} onClick={() => setTab("breakdown")}>En panne ({data.summary.breakdown})</TabBtn>
        <TabBtn active={tab === "retired"} onClick={() => setTab("retired")}>Retirés / transfert</TabBtn>
        <TabBtn active={tab === "rental"} onClick={() => setTab("rental")}>Location externe</TabBtn>
      </div>

      {tab === "production" && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Chantier</th>
                <th className="py-2 text-right">Engins affectés</th>
                <th className="py-2 text-right">Heures cumulées</th>
                <th className="py-2 pr-3 text-right">Km cumulés</th>
              </tr>
            </thead>
            <tbody>
              {data.productionBySite.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-ink-3">Aucun engin affecté.</td></tr>
              ) : (
                data.productionBySite.map((s) => (
                  <tr key={s.siteId} className="border-t border-line hover:bg-surface-alt">
                    <td className="py-2.5 pl-3">
                      <div className="font-bold text-ink">{s.code}</div>
                      <div className="text-[10.5px] text-ink-3">{s.name}</div>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold">{s.equipmentCount}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{s.totalHours.toFixed(0)} h</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{s.totalKm.toFixed(0)} km</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "in-service" && <EquipmentTable items={data.inService} showSite />}
      {tab === "maintenance" && <EquipmentTable items={data.inMaintenance} showMaintenance />}
      {tab === "breakdown" && <EquipmentTable items={data.breakdown} showMaintenance breakdownMode />}
      {tab === "retired" && (
        <div className="space-y-3">
          {data.retired.length > 0 && (
            <div>
              <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-3">
                Retirés ({data.retired.length})
              </h2>
              <EquipmentTable items={data.retired} />
            </div>
          )}
          {data.transfer.length > 0 && (
            <div>
              <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-3">
                En transfert ({data.transfer.length})
              </h2>
              <EquipmentTable items={data.transfer} showSite />
            </div>
          )}
          {data.retired.length === 0 && data.transfer.length === 0 && (
            <p className="text-[12.5px] italic text-ink-3">Aucun matériel retiré ou en transfert.</p>
          )}
        </div>
      )}

      {tab === "rental" && (
        <div className="rounded-xl border border-line bg-white p-6 text-center shadow-card">
          <InfoIcon className="mx-auto mb-2 h-10 w-10 text-ink-3" />
          <h3 className="text-[13.5px] font-bold text-ink">Location externe — non tracée en base</h3>
          <p className="mt-1.5 text-[12px] text-ink-3 max-w-md mx-auto">
            Les équipements loués à des tiers ne sont pas encore distingués dans le modèle de données.
            Pour activer cette vue, il faut ajouter un champ <code className="rounded bg-surface-alt px-1">Equipment.isLeased</code>{" "}
            ou créer un modèle <code className="rounded bg-surface-alt px-1">LeasedEquipment</code> avec contrat, durée, locataire et compteur de production.
          </p>
        </div>
      )}
    </div>
  );
}

function EquipmentTable({
  items,
  showSite,
  showMaintenance,
  breakdownMode,
}: {
  items: EquipmentItem[];
  showSite?: boolean;
  showMaintenance?: boolean;
  breakdownMode?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-4 py-12 text-center">
        <p className="text-[12.5px] italic text-ink-3">Aucun matériel dans cette catégorie.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
      <table className="w-full min-w-[860px] text-[12.5px]">
        <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
          <tr>
            <th className="py-2 pl-3 text-left">Immat / Désignation</th>
            <th className="py-2 text-left">Type</th>
            <th className="py-2 text-right">Compteur</th>
            {showSite && <th className="py-2 text-left">Chantier / Conducteur</th>}
            {showMaintenance && <th className="py-2 text-left">Intervention</th>}
            <th className="py-2 pr-3 text-right">Valeur résiduelle</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id} className={clsx("border-t border-line hover:bg-surface-alt", breakdownMode && !e.maintenance && "bg-rose-50/40")}>
              <td className="py-2.5 pl-3">
                <div className="font-mono font-bold text-ink">{e.registration}</div>
                <div className="text-[10.5px] text-ink-3">{e.designation}</div>
              </td>
              <td className="py-2.5 text-[11.5px] text-ink-2">{TYPE_LABEL[e.type] ?? e.type}</td>
              <td className="py-2.5 text-right font-mono tabular-nums">{e.counter.toFixed(0)} {e.counterUnit}</td>
              {showSite && (
                <td className="py-2.5 text-[11.5px]">
                  {e.site ? (
                    <>
                      <div className="font-semibold text-ink">{e.site.code}</div>
                      {e.driver && <div className="text-[10.5px] text-ink-3">{e.driver}</div>}
                    </>
                  ) : <span className="text-ink-3">—</span>}
                </td>
              )}
              {showMaintenance && (
                <td className="py-2.5 text-[11.5px]">
                  {e.maintenance ? (
                    <>
                      <div className="font-semibold text-ink">{e.maintenance.description}</div>
                      <div className="text-[10.5px] text-ink-3">
                        {e.maintenance.status}
                        {e.maintenance.scheduledAt && ` · ${new Date(e.maintenance.scheduledAt).toLocaleDateString("fr-FR")}`}
                      </div>
                    </>
                  ) : breakdownMode ? (
                    <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                      <AlertOctagon className="h-2.5 w-2.5" /> Pas encore traité
                    </span>
                  ) : <span className="text-ink-3">—</span>}
                </td>
              )}
              <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{fmtFCFA(e.currentValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({ label, value, icon, tone, alert }: { label: string; value: string; icon: React.ReactNode; tone: "primary" | "default" | "ok" | "warn" | "danger"; alert?: boolean }) {
  const cls = {
    primary: "border-l-violet-500 text-violet-700",
    default: "border-l-slate-400 text-slate-700",
    ok: "border-l-emerald-500 text-emerald-700",
    warn: "border-l-amber-500 text-amber-700",
    danger: "border-l-rose-500 text-rose-700",
  }[tone];
  return (
    <div className={clsx("rounded-xl border border-line border-l-4 bg-white p-3 shadow-card", cls, alert && "ring-2 ring-rose-200")}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-3">{icon}{label}</div>
      <div className="mt-1 text-[15px] font-bold text-ink">{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "border-b-2 px-3 py-2 text-[12px] font-semibold transition",
        active ? "border-violet-600 text-violet-700" : "border-transparent text-ink-3 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
