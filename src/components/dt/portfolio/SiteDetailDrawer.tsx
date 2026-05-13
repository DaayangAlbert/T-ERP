"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDtSiteDetail } from "@/hooks/useDtPortfolio";
import { clsx } from "clsx";

type Tab = "market" | "team" | "progress" | "documents" | "history";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "market", label: "Marché" },
  { key: "team", label: "Équipe" },
  { key: "progress", label: "Avancement" },
  { key: "documents", label: "Documents" },
  { key: "history", label: "Historique" },
];

function fmt(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} Md FCFA`;
  return `${Math.round(amount / 1_000_000)} M FCFA`;
}

interface Props {
  siteId: string | null;
  onClose: () => void;
}

export function SiteDetailDrawer({ siteId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("market");
  const { data, isLoading } = useDtSiteDetail(siteId);

  useEffect(() => {
    if (siteId) setTab("market");
  }, [siteId]);

  if (!siteId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer (right side desktop, fullscreen mobile) */}
      <aside className="fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col overflow-hidden bg-white shadow-2xl sm:inset-y-0 sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:w-[480px] sm:border-l sm:border-line">
        <header className="flex items-center justify-between gap-2 border-b border-line bg-surface-alt px-4 py-3">
          <div className="min-w-0">
            <div className="font-mono text-[11px] text-ink-3">
              {data?.code ?? "Chargement…"}
            </div>
            <h2 className="truncate text-[14px] font-semibold text-ink">
              {data?.name ?? ""}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-2 hover:bg-line"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <nav className="flex shrink-0 overflow-x-auto border-b border-line bg-white">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "shrink-0 px-3 py-2 text-[12px] font-medium transition",
                tab === t.key
                  ? "border-b-2 border-primary-500 text-primary-700"
                  : "text-ink-3 hover:text-ink"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading || !data ? (
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-alt" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-surface-alt" />
            </div>
          ) : tab === "market" ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
              <div>
                <dt className="text-ink-3">Maître d&apos;ouvrage</dt>
                <dd className="font-medium">{data.moaName ?? data.client}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Type MOA</dt>
                <dd className="font-medium">{data.moaTypeKind ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Type contrat</dt>
                <dd className="font-medium">{data.contractTypeKind ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Région</dt>
                <dd className="font-medium">{data.region ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Budget initial</dt>
                <dd className="font-mono font-medium">{fmt(data.budget)}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Dépenses réelles</dt>
                <dd className="font-mono font-medium">{fmt(data.actualSpent)}</dd>
              </div>
              {data.contract && (
                <>
                  <div className="col-span-2 mt-2 border-t border-line pt-2 text-[11px] uppercase text-ink-3">
                    Contrat
                  </div>
                  <div>
                    <dt className="text-ink-3">Référence</dt>
                    <dd className="font-medium">{data.contract.reference}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Marché public</dt>
                    <dd className="font-medium">{data.contract.publicMarket ? "Oui" : "Non"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-ink-3">Montant en cours</dt>
                    <dd className="font-mono font-medium">{fmt(data.contract.currentAmount)}</dd>
                  </div>
                </>
              )}
            </dl>
          ) : tab === "team" ? (
            <dl className="space-y-2 text-[12px]">
              <div>
                <dt className="text-ink-3">Directeur de travaux</dt>
                <dd className="font-medium">{data.manager?.name ?? "Non affecté"}</dd>
              </div>
            </dl>
          ) : tab === "progress" ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-ink-3">
                  <span>Avancement physique</span>
                  <span className="font-mono">{Math.round(data.progress)} %</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-line">
                  <div
                    className="h-2 rounded-full bg-violet-500"
                    style={{ width: `${data.progress}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-ink-3">
                  <span>Avancement financier</span>
                  <span className="font-mono">{Math.round(data.financialProgress)} %</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-line">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${data.financialProgress}%` }}
                  />
                </div>
              </div>
              <div className="rounded-md bg-surface-alt p-2 text-[11.5px]">
                <div className="flex justify-between">
                  <span>Dérive coût</span>
                  <strong
                    className={clsx(
                      "font-mono",
                      data.deviationPercent > 10 ? "text-rose-700" : data.deviationPercent > 5 ? "text-amber-700" : "text-emerald-700"
                    )}
                  >
                    {data.deviationPercent > 0 ? "+" : ""}
                    {data.deviationPercent.toFixed(1)} %
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Marge réelle / cible</span>
                  <span className="font-mono">
                    {data.margin.toFixed(1)} % / {data.marginTarget.toFixed(1)} %
                  </span>
                </div>
              </div>
              <div className="space-y-1 text-[11.5px]">
                <div className="text-ink-3">Démarré le</div>
                <div className="font-medium">
                  {format(new Date(data.startDate), "dd MMM yyyy", { locale: fr })}
                </div>
                <div className="text-ink-3">Livraison prévue</div>
                <div className="font-medium">
                  {format(new Date(data.plannedEndDate), "dd MMM yyyy", { locale: fr })}
                </div>
              </div>
            </div>
          ) : tab === "documents" ? (
            <div className="space-y-2">
              {data.photos.length === 0 ? (
                <p className="text-[12px] text-ink-3">Aucun document / photo.</p>
              ) : (
                <ul className="space-y-1 text-[12px]">
                  {data.photos.map((p) => (
                    <li key={p.id} className="rounded-md border border-line p-2">
                      <div className="font-medium">{p.caption ?? "Photo"}</div>
                      <div className="text-[11px] text-ink-3">
                        {format(new Date(p.takenAt), "dd MMM yyyy", { locale: fr })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {data.alerts.length > 0 && (
                <>
                  <h3 className="text-[11px] font-semibold uppercase text-ink-3">Alertes</h3>
                  <ul className="space-y-1 text-[12px]">
                    {data.alerts.map((a) => (
                      <li key={a.id} className="rounded-md border border-line p-2">
                        <div className="font-medium">{a.message}</div>
                        <div className="text-[11px] text-ink-3">
                          {format(new Date(a.createdAt), "dd MMM yyyy", { locale: fr })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {data.decisions.length > 0 && (
                <>
                  <h3 className="mt-3 text-[11px] font-semibold uppercase text-ink-3">
                    Décisions
                  </h3>
                  <ul className="space-y-1 text-[12px]">
                    {data.decisions.map((d) => (
                      <li key={d.id} className="rounded-md border border-line p-2">
                        <div className="font-semibold">{d.title}</div>
                        <p className="text-[11.5px] text-ink-2">{d.body}</p>
                        <div className="mt-1 text-[11px] text-ink-3">
                          {format(new Date(d.createdAt), "dd MMM yyyy", { locale: fr })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {data.alerts.length === 0 && data.decisions.length === 0 && (
                <p className="text-[12px] text-ink-3">Aucun historique disponible.</p>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
