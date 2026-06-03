"use client";

import { useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { clsx } from "clsx";
import { useLogTransfers, useArbitrateTransfer } from "@/hooks/useLogTransfers";
import { PageHelp } from "@/components/help/PageHelp";
import { LogTransfertsTutorial } from "@/components/help/tutorials/LogTransfertsTutorial";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  if (n >= 1_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return n.toLocaleString("fr-FR");
}

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: "bg-rose-100 text-rose-700",
  HIGH: "bg-amber-100 text-amber-700",
  NORMAL: "bg-slate-100 text-slate-700",
  LOW: "bg-slate-100 text-slate-500",
};

const PRIORITY_BORDER: Record<string, string> = {
  URGENT: "border-l-rose-500",
  HIGH: "border-l-amber-500",
  NORMAL: "border-l-slate-400",
  LOW: "border-l-slate-300",
};

export default function LogTransfersPage() {
  const { data, isLoading } = useLogTransfers();
  const arbitrate = useArbitrateTransfer();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Transferts inter-chantiers
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            <strong>{data.kpis.pendingCount}</strong> demandes en attente ·{" "}
            <strong>{data.kpis.validatedYtdCount}</strong> transferts validés YTD ·{" "}
            <strong>{fmt(data.kpis.ytdSavings)} FCFA</strong> d&apos;économies
          </p>
        </div>
        <PageHelp title="Aide — Transferts"><LogTransfertsTutorial /></PageHelp>
      </header>

      {/* Demandes en attente d'arbitrage */}
      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
          ⏳ Demandes en attente d&apos;arbitrage
        </h2>
        {data.pending.length === 0 ? (
          <div className="rounded-xl border border-line bg-emerald-50/60 px-4 py-3 text-[12.5px] text-emerald-700">
            Aucune demande en attente.
          </div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {data.pending.map((t) => (
              <article
                key={t.id}
                className={clsx(
                  "rounded-lg border border-l-[4px] bg-white p-3",
                  PRIORITY_BORDER[t.priority]
                )}
              >
                <header className="flex flex-wrap items-baseline justify-between gap-1">
                  <div>
                    <div className="font-mono text-[11px] text-ink-3">{t.reference}</div>
                    <div className="text-[13px] font-semibold text-ink">{t.category}</div>
                  </div>
                  <span
                    className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", PRIORITY_BADGE[t.priority])}
                  >
                    {t.priority}
                  </span>
                </header>

                {/* Grid 1fr-auto-1fr Depuis → Vers (passe en colonne mobile) */}
                <div className="mt-2 grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                  <div className="rounded border border-line bg-surface-alt/50 p-2 text-[11.5px]">
                    <div className="text-[10.5px] font-semibold uppercase text-ink-3">Depuis</div>
                    <div className="font-medium text-ink">{t.fromSite}</div>
                    <div className="font-mono text-[10.5px] text-ink-3">{t.fromSiteCode}</div>
                  </div>
                  <ArrowRight className="hidden h-4 w-4 self-center justify-self-center text-primary-600 sm:block" />
                  <div className="rounded border border-line bg-surface-alt/50 p-2 text-[11.5px]">
                    <div className="text-[10.5px] font-semibold uppercase text-ink-3">Vers</div>
                    <div className="font-medium text-ink">{t.toSite}</div>
                    <div className="font-mono text-[10.5px] text-ink-3">{t.toSiteCode}</div>
                  </div>
                </div>

                <dl className="mt-2 grid grid-cols-2 gap-x-3 text-[11.5px]">
                  <div>
                    <dt className="text-ink-3">Qté</dt>
                    <dd className="font-medium">
                      {t.items[0] ? `${t.items[0].quantity} ${t.items[0].unit}` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Économie estimée</dt>
                    <dd className="font-mono font-semibold text-emerald-700">{fmt(t.estimatedSavings)} FCFA</dd>
                  </div>
                  {t.context && (
                    <div className="col-span-2 mt-1">
                      <dt className="text-ink-3">Contexte</dt>
                      <dd className="text-ink-2">{t.context}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => arbitrate.mutate({ id: t.id, action: "approve" })}
                    className="flex-1 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700 active:bg-emerald-100"
                  >
                    <Check className="mr-1 inline h-3 w-3" /> Valider
                  </button>
                  <button
                    onClick={() => setRejectingId(t.id)}
                    className="flex-1 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700 active:bg-rose-100"
                  >
                    <X className="mr-1 inline h-3 w-3" /> Refuser
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Historique */}
      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
          Transferts récents
        </h2>
        <div className="rounded-xl border border-line bg-white">
          <div className="hidden md:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Réf</th>
                  <th className="px-3 py-2 text-left font-medium">Catégorie</th>
                  <th className="px-3 py-2 text-left font-medium">De → Vers</th>
                  <th className="px-3 py-2 text-right font-medium">Économie</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((t) => (
                  <tr key={t.id} className="border-t border-line">
                    <td className="px-3 py-2 font-mono text-[11.5px]">{t.reference}</td>
                    <td className="px-3 py-2 font-medium text-ink">{t.category}</td>
                    <td className="px-3 py-2 text-ink-2">
                      {t.fromSite} → {t.toSite}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-700">
                      {fmt(t.estimatedSavings)} FCFA
                    </td>
                    <td className="px-3 py-2 text-ink-2">
                      {t.completedAt
                        ? format(new Date(t.completedAt), "dd/MM/yy", { locale: fr })
                        : t.arbitratedAt
                          ? format(new Date(t.arbitratedAt), "dd/MM/yy", { locale: fr })
                          : "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-2">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {data.history.map((t) => (
              <div key={t.id} className="rounded-lg border border-line p-3 text-[12px]">
                <div className="flex justify-between gap-2">
                  <div className="font-mono text-[11px] text-ink-3">{t.reference}</div>
                  <span className="text-[10.5px] text-ink-3">{t.status}</span>
                </div>
                <div className="font-semibold text-ink">{t.category}</div>
                <div className="text-[11.5px] text-ink-3">{t.fromSite} → {t.toSite}</div>
                <div className="mt-1 text-right font-mono text-[11.5px] text-emerald-700">
                  Économie : {fmt(t.estimatedSavings)} FCFA
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modale refus */}
      {rejectingId && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setRejectingId(null)} aria-hidden />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl border border-line bg-white shadow-2xl">
              <header className="border-b border-line px-4 py-3">
                <h3 className="text-[14px] font-semibold text-ink">Refuser le transfert</h3>
              </header>
              <div className="p-4">
                <label className="block text-[11px] font-medium text-ink-2">Motif (obligatoire)</label>
                <textarea
                  rows={4}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Ex: planning incompatible, ressources indisponibles…"
                  className="mt-1 w-full rounded-md border border-line-2 bg-white p-2 text-[12.5px]"
                />
              </div>
              <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">
                <button
                  onClick={() => setRejectingId(null)}
                  className="rounded border border-line-2 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-2"
                >Annuler</button>
                <button
                  disabled={!rejectNote.trim()}
                  onClick={async () => {
                    await arbitrate.mutateAsync({ id: rejectingId, action: "reject", note: rejectNote });
                    setRejectingId(null);
                    setRejectNote("");
                  }}
                  className="rounded bg-rose-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >Refuser</button>
              </footer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
