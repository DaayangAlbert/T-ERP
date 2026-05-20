"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Truck, ShoppingCart, Package } from "lucide-react";
import { clsx } from "clsx";
import { useChantier } from "@/contexts/ChantierContext";

interface Po {
  id: string;
  reference: string;
  supplier: string;
  amount: number;
  status: string;
  createdAt: string;
}
interface StockAlert {
  id: string;
  articleCode: string;
  articleLabel: string;
  currentStock: number;
  weeklyNeed: number;
  daysOfCover: number;
  severity: string;
}
interface Delivery {
  id: string;
  scheduledAt: string;
  status: string;
  deliveryNoteRef: string | null;
  items: unknown;
}

export default function ApprosPage() {
  const { activeChantierId, activeChantier } = useChantier();

  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "appros", activeChantierId],
    enabled: !!activeChantierId,
    queryFn: async () => {
      const res = await fetch(`/api/dtrav/sites/${activeChantierId}/appros`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        purchaseOrders: Po[];
        stockAlerts: StockAlert[];
        upcomingDeliveries: Delivery[];
        kpis: { activePoCount: number; cumulativeAmount: number; upcomingDeliveriesCount: number; ruptureCount: number };
      }>;
    },
  });

  return (
    <div id="screen-dtrav-appros" className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Approvisionnements</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {activeChantier?.code} — BC, alertes ruptures, livraisons.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="BC actifs" value={(data?.kpis.activePoCount ?? 0).toString()} icon={ShoppingCart} />
        <Kpi
          label="Cumul"
          value={`${new Intl.NumberFormat("fr-FR").format(Math.round((data?.kpis.cumulativeAmount ?? 0)))}`}
          hint="FCFA"
          icon={ShoppingCart}
        />
        <Kpi label="Livraisons J+7" value={(data?.kpis.upcomingDeliveriesCount ?? 0).toString()} icon={Truck} />
        <Kpi
          label="Ruptures imminentes"
          value={(data?.kpis.ruptureCount ?? 0).toString()}
          icon={AlertTriangle}
          accent={data?.kpis.ruptureCount ? "danger" : undefined}
        />
      </section>

      {data && data.stockAlerts.length > 0 && (
        <section className="rounded-xl border border-danger/30 bg-danger/5 p-3 shadow-card">
          <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" /> {data.stockAlerts.length} ruptures imminentes
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.stockAlerts.map((a) => (
              <article key={a.id} className="rounded-lg border border-line bg-white p-2.5">
                <div className="font-medium text-ink">{a.articleLabel}</div>
                <div className="text-[11.5px] text-ink-3">
                  Stock {a.currentStock.toFixed(0)} · besoin {a.weeklyNeed.toFixed(0)}/sem
                </div>
                <div
                  className={clsx(
                    "mt-1 text-[12px] font-semibold",
                    a.daysOfCover < 2 ? "text-danger" : a.daysOfCover < 5 ? "text-warning" : "text-ink-2"
                  )}
                >
                  Couverture {a.daysOfCover.toFixed(1)} j
                </div>
                <button
                  type="button"
                  style={{ minHeight: 40 }}
                  className="mt-2 w-full rounded-md bg-danger px-2 text-[12px] font-medium text-white hover:bg-danger/90"
                >
                  Commander urgent
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Bons de commande
        </h2>
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : data?.purchaseOrders.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucun BC pour ce chantier.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">Référence</th>
                    <th className="px-3 py-2">Fournisseur</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.purchaseOrders.map((p) => (
                    <tr key={p.id} className="border-b border-line">
                      <td className="px-3 py-2 font-medium text-ink">{p.reference}</td>
                      <td className="px-3 py-2 text-ink-2">{p.supplier}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {new Intl.NumberFormat("fr-FR").format(Math.round(p.amount))}
                      </td>
                      <td className="px-3 py-2 text-ink-3">
                        {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={clsx(
                            "rounded px-2 py-0.5 text-[11px] font-medium",
                            p.status === "APPROVED" && "bg-success/10 text-success",
                            p.status === "PENDING_DAF" && "bg-warning/10 text-warning",
                            p.status === "REJECTED" && "bg-danger/10 text-danger"
                          )}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {data?.purchaseOrders.map((p) => (
                <div key={p.id} className="rounded-lg border border-line bg-white p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-ink">{p.reference}</div>
                      <div className="text-[11.5px] text-ink-3">{p.supplier}</div>
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums">
                      {new Intl.NumberFormat("fr-FR").format(Math.round(p.amount))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Livraisons attendues cette semaine
        </h2>
        {data?.upcomingDeliveries.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune livraison attendue cette semaine.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.upcomingDeliveries.map((d) => (
              <li
                key={d.id}
                style={{ minHeight: 56 }}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-[12.5px]"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-50 text-[12px] font-bold text-primary-700">
                    {new Date(d.scheduledAt).getDate()}
                  </span>
                  <div>
                    <div className="font-medium text-ink">
                      {new Date(d.scheduledAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                    <div className="text-[11.5px] text-ink-3">{d.deliveryNoteRef ?? "BL non renseigné"}</div>
                  </div>
                </div>
                <button
                  type="button"
                  style={{ minHeight: 40 }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12px] font-medium text-white"
                >
                  Réceptionner
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof ShoppingCart;
  accent?: "danger";
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        <Icon className={clsx("h-4 w-4", accent === "danger" ? "text-danger" : "text-primary-600")} />
      </div>
      <div className={clsx("mt-1 text-2xl font-bold", accent === "danger" ? "text-danger" : "text-ink")}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}
