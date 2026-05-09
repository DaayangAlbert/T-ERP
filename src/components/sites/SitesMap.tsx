"use client";

import Link from "next/link";
import { useState } from "react";
import { useSitesMap, type SiteMapItem } from "@/hooks/useSites";
import { formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

// V1 : carte SVG simplifiée du Cameroun avec projection linéaire lat/lng → x/y.
// V2 envisagée : Leaflet + tuiles OSM.
// Bornes Cameroun : lat 1.6 → 13.1, lng 8.5 → 16.2

const BBOX = { latMin: 1.6, latMax: 13.1, lngMin: 8.5, lngMax: 16.2 };
const VIEW_W = 600;
const VIEW_H = 720;

function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - BBOX.lngMin) / (BBOX.lngMax - BBOX.lngMin)) * VIEW_W;
  const y = VIEW_H - ((lat - BBOX.latMin) / (BBOX.latMax - BBOX.latMin)) * VIEW_H;
  return { x, y };
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#15803D",
  AT_RISK: "#B45309",
  DRIFTING: "#B91C1C",
  ON_HOLD: "#6B7280",
  PLANNED: "#3B82F6",
  COMPLETED: "#1F2A3D",
};

export function SitesMap() {
  const { data, isLoading } = useSitesMap();
  const [hovered, setHovered] = useState<SiteMapItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  if (isLoading) {
    return <div className="h-[500px] animate-pulse rounded-xl bg-surface-alt" />;
  }
  if (!data || data.items.length === 0) {
    return <div className="rounded-xl border border-line bg-white p-6 text-center text-[13px] text-ink-3">Aucun chantier à cartographier.</div>;
  }

  const filtered = statusFilter ? data.items.filter((s) => s.status === statusFilter) : data.items;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-line bg-white px-2 text-[12px]"
          >
            <option value="">Tous statuts</option>
            <option value="ACTIVE">Actifs</option>
            <option value="AT_RISK">Vigilance</option>
            <option value="DRIFTING">Dérive</option>
            <option value="COMPLETED">Terminés</option>
          </select>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-ink-3">
            <Legend color={STATUS_COLOR.ACTIVE} label="Actif" />
            <Legend color={STATUS_COLOR.AT_RISK} label="Vigilance" />
            <Legend color={STATUS_COLOR.DRIFTING} label="Dérive" />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 to-amber-50">
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="block w-full">
            {/* Fond simplifié du Cameroun (silhouette approximative) */}
            <path
              d="M 195 60 L 280 50 L 360 80 L 440 110 L 480 220 L 510 340 L 480 450 L 410 540 L 330 600 L 260 660 L 190 630 L 130 540 L 100 410 L 95 280 L 130 180 L 170 110 Z"
              fill="#FFFFFF"
              stroke="#A7F3D0"
              strokeWidth="2"
              opacity="0.95"
            />
            {/* Marqueurs */}
            {filtered.map((s) => {
              const { x, y } = project(s.lat, s.lng);
              const color = STATUS_COLOR[s.status] ?? "#6B7280";
              return (
                <g
                  key={s.id}
                  transform={`translate(${x},${y})`}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(null)}
                  className="cursor-pointer"
                >
                  <circle r="9" fill={color} fillOpacity="0.25" />
                  <circle r="5" fill={color} stroke="#fff" strokeWidth="1.5" />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <aside className="space-y-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          {filtered.length} chantier{filtered.length > 1 ? "s" : ""}
        </h3>
        <ul className="max-h-[600px] space-y-1.5 overflow-y-auto pr-1">
          {filtered.map((s) => (
            <li
              key={s.id}
              className={clsx(
                "rounded-md border bg-white p-2.5 text-[12px] shadow-card transition",
                hovered?.id === s.id ? "border-primary-300 shadow-brand-lg" : "border-line"
              )}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s.status] }} />
                  <span className="font-mono text-[10.5px] text-ink-3">{s.code}</span>
                </span>
                <span className="text-[10px] text-ink-3">{s.region}</span>
              </div>
              <Link href={`/chantiers/${s.id}`} className="mt-0.5 block truncate font-medium text-ink hover:text-primary-700">
                {s.name}
              </Link>
              <div className="mt-0.5 flex items-center justify-between text-[11px] text-ink-3">
                <span>Avancement {s.progress} %</span>
                <span className="font-mono font-semibold text-ink">{formatFCFA(BigInt(s.budget))}</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
