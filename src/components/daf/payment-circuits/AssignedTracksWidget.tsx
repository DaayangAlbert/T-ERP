"use client";

import Link from "next/link";
import { ArrowRight, AlertOctagon, ClipboardCheck } from "lucide-react";
import { clsx } from "clsx";
import { useMyAssignedTracks } from "@/hooks/usePaymentCircuits";

function fmtFCFA(amount: string): string {
  const n = BigInt(amount);
  if (n >= 1_000_000_000n) return `${new Intl.NumberFormat("fr-FR").format(Math.round(Number(n)))} FCFA`;
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(Number(n)))} FCFA`;
}

interface Props {
  /** Limite d'items affichés (les autres restent accessibles via la page dédiée). */
  limit?: number;
  /** Affiche le bouton "Voir tout →" en bas. */
  showSeeAllLink?: boolean;
}

export function AssignedTracksWidget({ limit = 5, showSeeAllLink = true }: Props) {
  const { data, isLoading } = useMyAssignedTracks(false);

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const items = data?.items ?? [];
  const blockedCount = items.filter((i) => i.isBlocked).length;

  return (
    <section className="rounded-xl border border-line bg-white p-3 shadow-card sm:p-4">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary-600" />
          <h3 className="text-[13px] font-semibold text-ink">
            Mes suivis de paiement
            {items.length > 0 && (
              <span className="ml-1.5 rounded bg-primary-100 px-1.5 py-0.5 font-mono text-[10.5px] text-primary-700">
                {items.length}
              </span>
            )}
          </h3>
        </div>
        {blockedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-danger">
            <AlertOctagon className="h-3 w-3" /> {blockedCount} bloqué{blockedCount > 1 ? "s" : ""}
          </span>
        )}
      </header>

      {items.length === 0 ? (
        <p className="mt-3 text-center text-[12px] text-ink-3">
          Aucun dossier à suivre actuellement.
        </p>
      ) : (
        <>
          <ul className="mt-2 space-y-1.5">
            {items.slice(0, limit).map((t) => (
              <li key={t.id}>
                <Link
                  href="/direction-financiere/recouvrement"
                  className={clsx(
                    "flex items-center gap-2 rounded-md border p-2 transition hover:border-primary-300",
                    t.isBlocked ? "border-danger/30 bg-danger/5" : "border-line bg-surface-alt/30",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[12px]">
                      <span className="font-semibold text-ink truncate">{t.receivable.clientName}</span>
                      <span className="font-mono text-[10.5px] text-ink-3">{t.receivable.invoiceRef}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
                      <span className="font-mono font-semibold text-ink-2">
                        {fmtFCFA(t.receivable.amount)}
                      </span>
                      {t.currentStep && (
                        <span className={clsx(t.isBlocked && "text-danger font-medium")}>
                          · #{t.currentStep.order} {t.currentStep.label}
                          {t.isBlocked && " (bloquée)"}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1 flex-1 rounded-full bg-line">
                        <div
                          className={clsx(
                            "h-full rounded-full",
                            t.isBlocked ? "bg-danger" : "bg-primary-500",
                          )}
                          style={{ width: `${t.progress.percent}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-ink-3">
                        {t.progress.validated}/{t.progress.total}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
          {showSeeAllLink && items.length > limit && (
            <Link
              href="/suivi-paiement"
              className="mt-2 block text-center text-[11.5px] font-semibold text-primary-700 hover:text-primary-800"
            >
              Voir tout ({items.length}) →
            </Link>
          )}
        </>
      )}
    </section>
  );
}
