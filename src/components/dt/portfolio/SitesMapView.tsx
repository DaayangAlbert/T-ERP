"use client";

import { useDtSitesMap } from "@/hooks/useDtPortfolio";
import { clsx } from "clsx";
import { useState } from "react";

const STATUS_FILL: Record<string, string> = {
  ACTIVE: "fill-emerald-500",
  AT_RISK: "fill-amber-500",
  DRIFTING: "fill-rose-500",
  PLANNED: "fill-slate-400",
  ON_HOLD: "fill-slate-500",
  COMPLETED: "fill-blue-500",
  ARCHIVED: "fill-slate-300",
};

// Bbox approximative du Cameroun pour projection orthonormée
const BBOX = { minLat: 1.5, maxLat: 13, minLng: 8.4, maxLng: 16.5 };

function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * w;
  const y = h - ((lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat)) * h;
  return { x, y };
}

interface Props {
  onSelect: (id: string) => void;
}

export function SitesMapView({ onSelect }: Props) {
  const { data, isLoading } = useDtSitesMap();
  const [hover, setHover] = useState<string | null>(null);

  if (isLoading) {
    return <div className="h-[420px] animate-pulse rounded-xl bg-surface-alt" />;
  }
  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white px-4 py-6 text-center text-[12.5px] text-ink-3">
        Aucun chantier géolocalisé.
      </div>
    );
  }

  const W = 600;
  const H = 420;

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <h3 className="mb-2 text-[13px] font-semibold text-ink">
        Carte du portefeuille — {data.items.length} chantiers
      </h3>
      <div className="relative w-full overflow-hidden rounded-lg bg-gradient-to-b from-emerald-50 via-white to-amber-50">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Contour pays simplifié — losange du Cameroun */}
          <polygon
            points={`${0.15 * W},${0.95 * H} ${0.05 * W},${0.55 * H} ${0.4 * W},${0.05 * H} ${0.7 * W},${0.1 * H} ${0.85 * W},${0.4 * H} ${0.6 * W},${0.95 * H}`}
            className="fill-emerald-100/60 stroke-emerald-300"
            strokeWidth={1.5}
          />
          {data.items.map((s) => {
            const { x, y } = project(s.lat, s.lng, W, H);
            const radius = Math.min(20, 6 + Math.log10(s.budget / 1_000_000) * 2);
            return (
              <g
                key={s.id}
                onMouseEnter={() => setHover(s.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(s.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  className={clsx(STATUS_FILL[s.status] ?? "fill-slate-400", "opacity-70")}
                  stroke="white"
                  strokeWidth={2}
                />
                {hover === s.id && (
                  <g>
                    <rect
                      x={x + radius + 4}
                      y={y - 18}
                      width={140}
                      height={36}
                      rx={4}
                      className="fill-white stroke-line"
                    />
                    <text
                      x={x + radius + 10}
                      y={y - 4}
                      className="fill-ink"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {s.code}
                    </text>
                    <text x={x + radius + 10} y={y + 10} className="fill-ink-3" fontSize="10">
                      {s.name.slice(0, 20)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-3">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
          En cours
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
          Vigilance
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
          Dérive
        </span>
      </div>
    </div>
  );
}
