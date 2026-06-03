"use client";

import { useState } from "react";
import { Star, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { clsx } from "clsx";
import { useLogSuppliers } from "@/hooks/useLogSuppliers";
import { PageHelp } from "@/components/help/PageHelp";
import { LogFournisseursTutorial } from "@/components/help/tutorials/LogFournisseursTutorial";

type Tab = "frameworks" | "all" | "fiscal" | "evaluations";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "frameworks", label: "Contrats-cadres" },
  { key: "all", label: "Tous fournisseurs" },
  { key: "fiscal", label: "Conformité fiscale" },
  { key: "evaluations", label: "Évaluations" },
];

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  if (n >= 1_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return n.toLocaleString("fr-FR");
}

function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-3">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={clsx("h-3 w-3", i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300")}
        />
      ))}
      <span className="ml-1 text-[10.5px] font-semibold text-ink-2">{value.toFixed(1)}</span>
    </span>
  );
}

export default function LogSuppliersPage() {
  const { data, isLoading } = useLogSuppliers();
  const [tab, setTab] = useState<Tab>("frameworks");

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Fournisseurs</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            <strong>{data.kpis.activeCount}</strong> fournisseurs actifs ·{" "}
            <strong>{data.kpis.frameworkCount}</strong> contrats-cadres ·{" "}
            <strong>{fmt(data.kpis.totalEngagementsYtd)} FCFA</strong> engagements YTD
          </p>
        </div>
        <PageHelp title="Aide — Fournisseurs Log"><LogFournisseursTutorial /></PageHelp>
      </header>

      <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative shrink-0 px-3 py-2 text-[12.5px] font-medium",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "frameworks" && (
        <div className="rounded-xl border border-line bg-white">
          <div className="hidden md:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Fournisseur</th>
                  <th className="px-3 py-2 text-left font-medium">Objet</th>
                  <th className="px-3 py-2 text-right font-medium">Plafond</th>
                  <th className="px-3 py-2 text-right font-medium">Utilisé</th>
                  <th className="px-3 py-2 text-left font-medium">Fin contrat</th>
                  <th className="px-3 py-2 text-left font-medium">Échéance</th>
                </tr>
              </thead>
              <tbody>
                {data.frameworks.map((f) => (
                  <tr key={f.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{f.supplierName}</td>
                    <td className="px-3 py-2 text-ink-2">{f.subject}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(f.maxAmount)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {fmt(f.usedAmount)}
                      <div className="mt-0.5 h-1 w-16 rounded-full bg-line">
                        <div
                          className="h-1 rounded-full bg-primary-500"
                          style={{ width: `${Math.min(100, (f.usedAmount / f.maxAmount) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-ink-2">
                      {format(new Date(f.endDate), "dd/MM/yy", { locale: fr })}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                          f.expiringSoon ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}
                      >
                        {f.expiringSoon ? `J-${f.daysLeft}` : "Actif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {data.frameworks.map((f) => (
              <div key={f.id} className="rounded-lg border border-line p-3">
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">{f.supplierName}</div>
                    <div className="text-[11.5px] text-ink-3">{f.subject}</div>
                  </div>
                  <span
                    className={clsx(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      f.expiringSoon ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    )}
                  >
                    {f.expiringSoon ? `J-${f.daysLeft}` : "Actif"}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between text-[11.5px]">
                  <span className="text-ink-3">Plafond / Utilisé</span>
                  <span className="font-mono">{fmt(f.maxAmount)} / {fmt(f.usedAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "all" && (
        <div className="rounded-xl border border-line bg-white">
          <div className="hidden md:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Fournisseur</th>
                  <th className="px-3 py-2 text-left font-medium">Catégorie</th>
                  <th className="px-3 py-2 text-left font-medium">Qualité</th>
                  <th className="px-3 py-2 text-right font-medium">Volume YTD</th>
                  <th className="px-3 py-2 text-right font-medium">BC</th>
                  <th className="px-3 py-2 text-left font-medium">Stratégique</th>
                </tr>
              </thead>
              <tbody>
                {data.suppliers.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{s.name}</td>
                    <td className="px-3 py-2 text-ink-2">{s.category}</td>
                    <td className="px-3 py-2"><Stars value={s.ratingQuality} /></td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(s.volumeYTD)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.poCount}</td>
                    <td className="px-3 py-2">{s.strategic && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10.5px] font-semibold text-violet-700">⭐ Stratégique</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {data.suppliers.map((s) => (
              <div key={s.id} className="rounded-lg border border-line p-3">
                <div className="flex justify-between gap-2">
                  <div className="text-[13px] font-semibold text-ink">{s.name}</div>
                  <Stars value={s.ratingQuality} />
                </div>
                <div className="mt-1 text-[11.5px] text-ink-3">{s.category}</div>
                <div className="mt-1 flex justify-between text-[11.5px]">
                  <span className="text-ink-3">Volume YTD</span>
                  <span className="font-mono">{fmt(s.volumeYTD)} FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "fiscal" && (
        <div className="rounded-xl border border-line bg-white">
          <div className="border-b border-line bg-surface-alt/50 px-4 py-2 text-[12px] text-ink-2">
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> {data.kpis.fiscalCompliantCount} valides
            </span>
            <span className="mx-3 text-line">·</span>
            <span className="inline-flex items-center gap-1 text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" /> {data.kpis.fiscalPendingCount} en attente / non vérifiés
            </span>
          </div>
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fournisseur</th>
                <th className="px-3 py-2 text-left font-medium">NIU</th>
                <th className="px-3 py-2 text-left font-medium">CNPS</th>
                <th className="px-3 py-2 text-left font-medium">DGI</th>
                <th className="px-3 py-2 text-left font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.suppliers.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="px-3 py-2 font-medium text-ink">{s.name}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ink-2">{s.taxId ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{s.fiscalCnps}</td>
                  <td className="px-3 py-2 text-ink-2">{s.fiscalDgi}</td>
                  <td className="px-3 py-2">
                    {s.fiscalOk ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Valide
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertCircle className="h-3 w-3" /> À vérifier
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "evaluations" && (
        <div className="space-y-2">
          {data.evaluations.length === 0 ? (
            <div className="rounded-xl border border-line bg-white px-4 py-6 text-center text-[12.5px] text-ink-3">
              Aucune évaluation enregistrée.
            </div>
          ) : (
            data.evaluations.map((e) => (
              <article key={e.id} className="rounded-xl border border-line bg-white p-3">
                <header className="flex flex-wrap items-baseline justify-between gap-1">
                  <div>
                    <h3 className="text-[13px] font-semibold text-ink">{e.supplierName}</h3>
                    <span className="text-[11px] text-ink-3">{e.period}</span>
                  </div>
                  <span className="font-mono text-[14px] font-bold text-primary-700">{e.avg.toFixed(1)} / 5</span>
                </header>
                <dl className="mt-2 grid grid-cols-3 gap-x-3 text-[11.5px]">
                  <div>
                    <dt className="text-ink-3">Qualité</dt>
                    <dd className="font-medium">{e.ratingQuality.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Délai</dt>
                    <dd className="font-medium">{e.ratingDelay.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Prix</dt>
                    <dd className="font-medium">{e.ratingPrice.toFixed(1)}</dd>
                  </div>
                </dl>
                {e.comments && <p className="mt-2 text-[11.5px] text-ink-2">{e.comments}</p>}
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
