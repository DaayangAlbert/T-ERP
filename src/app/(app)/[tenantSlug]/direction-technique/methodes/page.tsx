"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { clsx } from "clsx";
import { useDtMethods } from "@/hooks/useDtMethods";
import { PageHelp } from "@/components/help/PageHelp";
import { DtMethodesTutorial } from "@/components/help/tutorials/DtMethodesTutorial";

type Tab = "methods" | "templates" | "ratios" | "rex";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "methods", label: "Modes opératoires" },
  { key: "templates", label: "Plannings types" },
  { key: "ratios", label: "Ratios" },
  { key: "rex", label: "Retours d'expérience" },
];

const CATEGORY_LABEL: Record<string, string> = {
  EARTHWORKS: "Terrassement",
  FOUNDATIONS: "Fondations",
  STRUCTURE: "Gros œuvre",
  FORMWORK: "Coffrage",
  REBAR: "Ferraillage",
  FINISHING: "Finitions",
  ROADWORK: "Voirie",
  HYDRAULIC: "Hydraulique",
  SAFETY: "Sécurité",
  OTHER: "Autre",
};

export default function DtMethodsPage() {
  const { data, isLoading } = useDtMethods();
  const [tab, setTab] = useState<Tab>("methods");
  const [search, setSearch] = useState("");

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const filteredMethods = data.methods.filter(
    (m) =>
      !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      CATEGORY_LABEL[m.category]?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Méthodes et planification techniques
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Bibliothèque modes opératoires, plannings types, ratios, REX.
          </p>
        </div>
        <PageHelp title="Aide — Méthodes &amp; planification"><DtMethodesTutorial /></PageHelp>
      </header>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: "Modes opératoires actifs", v: data.kpis.methodsActive },
          { label: "Plannings types", v: data.kpis.templatesCount },
          { label: "Ratios de référence", v: data.kpis.ratiosCount },
          { label: "Retours d'expérience", v: data.kpis.rexCount },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-line bg-white px-3 py-2.5">
            <div className="text-[20px] font-bold leading-none text-ink">{k.v}</div>
            <div className="mt-1 text-[11.5px] text-ink-2">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative px-3 py-2 text-[12.5px] font-medium",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {tab === "methods" && (
        <div className="space-y-2">
          <input
            type="search"
            placeholder="Rechercher mode opératoire ou catégorie…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-line-2 bg-white px-3 text-[12.5px] focus:border-primary-500 focus:outline-none sm:max-w-md"
          />
          <div className="rounded-xl border border-line bg-white">
            <div className="hidden md:block">
              <table className="w-full text-[12.5px]">
                <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Catégorie</th>
                    <th className="px-3 py-2 text-left font-medium">Libellé</th>
                    <th className="px-3 py-2 text-left font-medium">Version</th>
                    <th className="px-3 py-2 text-left font-medium">Auteur</th>
                    <th className="px-3 py-2 text-right font-medium">Utilisations</th>
                    <th className="px-3 py-2 text-left font-medium">Dernière révision</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMethods.map((m) => (
                    <tr key={m.id} className="border-t border-line hover:bg-surface-alt/60">
                      <td className="px-3 py-2 text-ink-2">{CATEGORY_LABEL[m.category]}</td>
                      <td className="px-3 py-2 font-medium text-ink">{m.title}</td>
                      <td className="px-3 py-2 text-ink-2">v{m.version}</td>
                      <td className="px-3 py-2 text-ink-2">{m.author ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.usageCount}</td>
                      <td className="px-3 py-2 text-ink-2">
                        {m.lastReviewedAt
                          ? format(new Date(m.lastReviewedAt), "dd/MM/yy", { locale: fr })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 p-3 md:hidden">
              {filteredMethods.map((m) => (
                <div key={m.id} className="rounded-lg border border-line p-3">
                  <div className="text-[11px] text-ink-3">{CATEGORY_LABEL[m.category]}</div>
                  <div className="text-[13px] font-semibold text-ink">{m.title}</div>
                  <div className="mt-1 text-[11px] text-ink-3">
                    v{m.version} · {m.usageCount} utilisations · {m.author ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-line bg-white p-3">
              <h3 className="text-[13px] font-semibold text-ink">{t.siteTypology}</h3>
              <p className="text-[11.5px] text-ink-3">
                {t.totalDuration} j · {t.usageCount} usages
              </p>
              <div className="mt-2">
                <svg viewBox="0 0 200 60" className="block h-auto w-full">
                  {(() => {
                    let cumX = 0;
                    return t.phases.map((p, i) => {
                      const w = (p.durationDays / t.totalDuration) * 200;
                      const colors = ["#A855F7", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
                      const x = cumX;
                      cumX += w;
                      return (
                        <g key={i}>
                          <rect x={x} y={20} width={w - 2} height={18} fill={colors[i % colors.length]} rx={3} />
                          <text x={x + 2} y={14} fontSize="6" fill="#6F6280">
                            {p.name.slice(0, 14)}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              </div>
              <button
                disabled
                title="V2"
                className="mt-2 w-full rounded border border-line-2 bg-white py-1.5 text-[11.5px] font-semibold text-ink-3 disabled:cursor-not-allowed"
              >
                Cloner pour nouveau chantier
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "ratios" && (
        <div className="rounded-xl border border-line bg-white">
          <div className="hidden md:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Poste</th>
                  <th className="px-3 py-2 text-left font-medium">Unité</th>
                  <th className="px-3 py-2 text-right font-medium">Référence</th>
                  <th className="px-3 py-2 text-right font-medium">Observé</th>
                  <th className="px-3 py-2 text-right font-medium">Écart</th>
                  <th className="px-3 py-2 text-right font-medium">N obs.</th>
                </tr>
              </thead>
              <tbody>
                {data.ratios.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{r.workItem}</td>
                    <td className="px-3 py-2 text-ink-2">{r.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.refValue}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.observedValue}</td>
                    <td
                      className={clsx(
                        "px-3 py-2 text-right tabular-nums font-semibold",
                        r.gapPercent > 10 ? "text-rose-700" : r.gapPercent > 0 ? "text-amber-700" : "text-emerald-700"
                      )}
                    >
                      {r.gapPercent > 0 ? "+" : ""}
                      {r.gapPercent.toFixed(1)} %
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-3">{r.observationsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {data.ratios.map((r) => (
              <div key={r.id} className="rounded-lg border border-line p-3">
                <div className="text-[13px] font-semibold text-ink">{r.workItem}</div>
                <div className="mt-1 text-[11.5px] text-ink-2">
                  Réf {r.refValue} / Obs {r.observedValue} {r.unit} ({r.observationsCount} obs)
                </div>
                <div
                  className={clsx(
                    "mt-0.5 text-[11.5px] font-semibold",
                    r.gapPercent > 10 ? "text-rose-700" : r.gapPercent > 0 ? "text-amber-700" : "text-emerald-700"
                  )}
                >
                  Écart : {r.gapPercent > 0 ? "+" : ""}
                  {r.gapPercent.toFixed(1)} %
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "rex" && (
        <div className="space-y-2">
          {data.rex.map((r) => (
            <article key={r.id} className="rounded-xl border border-line bg-white p-3">
              <header className="flex flex-wrap items-baseline justify-between gap-1">
                <div>
                  <span className="font-mono text-[11px] text-ink-3">{r.siteCode}</span>
                  <h3 className="text-[13px] font-semibold text-ink">{r.siteName}</h3>
                </div>
                <span className="text-[11px] text-ink-3">
                  Clos le {format(new Date(r.closedAt), "dd MMM yyyy", { locale: fr })}
                </span>
              </header>
              <dl className="mt-2 space-y-1 text-[11.5px]">
                <div>
                  <dt className="font-semibold text-ink-2">Problèmes :</dt>
                  <dd className="text-ink">{r.issues}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink-2">Solutions :</dt>
                  <dd className="text-ink">{r.solutions}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink-2">Recommandations :</dt>
                  <dd className="text-ink">{r.recommendations}</dd>
                </div>
              </dl>
              {r.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700"
                    >
                      #{k}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
