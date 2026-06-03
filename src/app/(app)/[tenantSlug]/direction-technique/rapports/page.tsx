"use client";

import { useState } from "react";
import {
  CalendarDays,
  TrendingUp,
  BarChart,
  Shield,
  ClipboardList,
  Award,
  Send,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHelp } from "@/components/help/PageHelp";
import { DtRapportsTutorial } from "@/components/help/tutorials/DtRapportsTutorial";

interface DtTemplate {
  type: string;
  title: string;
  description: string;
  audience: string;
  frequency: string;
  icon: string;
  batch?: boolean;
}

const ICONS: Record<string, LucideIcon> = {
  "calendar-days": CalendarDays,
  "trending-up": TrendingUp,
  "bar-chart": BarChart,
  shield: Shield,
  "clipboard-list": ClipboardList,
  award: Award,
  send: Send,
};

function useDtTemplates() {
  return useQuery({
    queryKey: ["dt", "reports", "templates"],
    queryFn: async (): Promise<{ templates: DtTemplate[] }> => {
      const res = await fetch("/api/dt/reports/templates", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export default function DtReportsPage() {
  const { data, isLoading } = useDtTemplates();
  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Rapports techniques
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            7 templates DT — reporting hebdo, production, QHSE, MOA, ISO.
          </p>
        </div>
        <PageHelp title="Aide — Rapports techniques"><DtRapportsTutorial /></PageHelp>
      </header>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Rapports planifiés DT
        </h2>
        <div className="rounded-xl border border-line bg-white p-3 text-[12px]">
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
              Reporting hebdo envoyé chaque <strong>lundi 7h</strong> au DG
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
              Reporting MOA envoyé <strong>fin de mois</strong> aux 23 maîtres d&apos;ouvrage
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-500" />
              Bilan trimestriel envoyé <strong>5 jours avant le COMEX trimestriel</strong>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Templates disponibles
        </h2>
        {isLoading || !data ? (
          <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.templates.map((t) => {
              const Icon = ICONS[t.icon] ?? ClipboardList;
              return (
                <article
                  key={t.type}
                  className="flex flex-col rounded-xl border border-line bg-white p-3"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-2 text-[13px] font-semibold text-ink">{t.title}</h3>
                  <p className="mt-1 flex-1 text-[11.5px] text-ink-3">{t.description}</p>
                  <dl className="mt-2 space-y-0.5 text-[11px]">
                    <div className="flex justify-between">
                      <dt className="text-ink-3">Destinataire</dt>
                      <dd className="font-medium text-ink-2">{t.audience}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-3">Fréquence</dt>
                      <dd className="font-medium text-ink-2">{t.frequency}</dd>
                    </div>
                  </dl>
                  {t.batch ? (
                    <button
                      onClick={() => setBatchOpen(true)}
                      className="mt-3 w-full rounded-md border border-primary-300 bg-primary-50 px-3 py-2 text-[11.5px] font-semibold text-primary-700 hover:bg-primary-100"
                    >
                      Générer en lot (23 MOA)
                    </button>
                  ) : (
                    <button
                      onClick={() => alert(`Génération ${t.title} (à venir V2)`)}
                      className="mt-3 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-[11.5px] font-semibold text-ink-2 hover:border-primary-300"
                    >
                      Générer PDF
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {batchOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setBatchOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col bg-white sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:w-[480px] sm:border-l sm:border-line">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="text-[14px] font-semibold text-ink">Envoi MOA en lot</h3>
              <button
                onClick={() => setBatchOpen(false)}
                className="rounded p-1 text-ink-3 hover:bg-line"
              >
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-[12.5px] text-ink-3">
                Sélectionnez les chantiers à inclure (23 disponibles). Un PDF sera généré et envoyé
                à chaque MOA correspondant.
              </p>
              <div className="mt-3 space-y-1">
                {Array.from({ length: 23 }).map((_, i) => {
                  const code = `CHT-2026-${String(i + 1).padStart(3, "0")}`;
                  return (
                    <label
                      key={code}
                      className="flex items-center gap-2 rounded border border-line p-2 text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSites.has(code)}
                        onChange={() => {
                          setSelectedSites((prev) => {
                            const next = new Set(prev);
                            if (next.has(code)) next.delete(code);
                            else next.add(code);
                            return next;
                          });
                        }}
                        className="h-4 w-4 accent-primary-500"
                      />
                      <span className="font-mono text-[11px]">{code}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">
              <button
                onClick={() => setBatchOpen(false)}
                className="rounded border border-line-2 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-2"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert(`Envoi simulé : ${selectedSites.size} MOA notifiés.`);
                  setBatchOpen(false);
                }}
                disabled={selectedSites.size === 0}
                className="rounded bg-primary-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Envoyer ({selectedSites.size})
              </button>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
