"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package, TrendingDown, AlertTriangle, ClipboardList, Truck, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { clsx } from "clsx";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";

interface MagDashboard {
  warehouse: { id: string; code: string; name: string; keeperId?: string | null; site: { code: string; name: string } };
  kpis: {
    totalValue: number;
    stockedArticles: number;
    movementsToday: number;
    movementsTodayIn: number;
    movementsTodayOut: number;
    ruptureCount: number;
    pendingInventoryCount: number;
  };
  ruptures: Array<{
    articleCode: string;
    articleName: string;
    quantity: number;
    unit: string;
    minThreshold: number | null;
    daysOfCover: number;
  }>;
  pendingInventories: Array<{ id: string; type: string; scope: string; plannedDate: string; status: string }>;
  expectedDeliveries: Array<{ id: string; scheduledAt: string; status: string; deliveryNoteRef: string | null }>;
  recentMovements: Array<{
    id: string;
    direction: string;
    reference: string;
    reason: string;
    articleCode: string;
    articleName: string;
    quantity: number;
    unit: string;
    totalValue: number;
    occurredAt: string;
  }>;
}

export default function MagDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["mag", "dashboard"],
    queryFn: async (): Promise<MagDashboard> => {
      const res = await fetch("/api/mag/dashboard", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {data?.warehouse.name ?? "Magasin"}
            {data?.warehouse.site && <span className="ml-2 text-[13px] font-normal text-ink-3">· {data.warehouse.site.code}</span>}
          </h1>
          <p className="text-[12.5px] text-ink-3">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {data && (
              <span className="ml-2 font-semibold text-primary-700">
                · {(data.kpis.totalValue / 1_000_000).toFixed(1)} M FCFA en stock
              </span>
            )}
          </p>
        </div>
        <SyncStatusBadge />
      </section>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Valeur stock" value={data ? `${(data.kpis.totalValue / 1_000_000).toFixed(1)} M` : "—"} icon={Package} />
        <Kpi
          label="Mouvements jour"
          value={data ? `${data.kpis.movementsToday}` : "—"}
          icon={TrendingDown}
          hint={data ? `${data.kpis.movementsTodayIn} in · ${data.kpis.movementsTodayOut} out` : undefined}
        />
        <Kpi
          label="Ruptures imminentes"
          value={data ? `${data.kpis.ruptureCount}` : "—"}
          icon={AlertTriangle}
          tone={data && data.kpis.ruptureCount > 0 ? "danger" : "ok"}
        />
        <Kpi
          label="Inventaires à faire"
          value={data ? `${data.kpis.pendingInventoryCount}` : "—"}
          icon={ClipboardList}
          tone="warning"
        />
      </section>

      {data && data.expectedDeliveries.length > 0 && (
        <Link
          href="/magasin/entrees"
          style={{ minHeight: 80 }}
          className="block rounded-xl bg-gradient-to-r from-violet-600 to-primary-600 p-4 text-white shadow-md"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-white/80">
                <Truck className="h-4 w-4" /> {data.expectedDeliveries.length} livraison{data.expectedDeliveries.length > 1 ? "s" : ""} à réceptionner
              </div>
              <div className="mt-1 text-[14px] font-semibold">
                {data.expectedDeliveries.slice(0, 3).map((d) => new Date(d.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })).join(" · ")}
              </div>
            </div>
            <button
              type="button"
              style={{ minHeight: 52 }}
              className="rounded-md bg-white px-4 text-[13.5px] font-semibold text-primary-700 hover:bg-white/95"
            >
              Réceptionner →
            </button>
          </div>
        </Link>
      )}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickAction href="/magasin/entrees" icon={ArrowDownToLine} label="Entrée" tone="success" />
        <QuickAction href="/magasin/sorties" icon={ArrowUpFromLine} label="Sortie" tone="danger" />
        <QuickAction href="/magasin/inventaires" icon={ClipboardList} label="Inventaire" tone="info" />
        <QuickAction href="/magasin/catalogue?onlyRuptures=1" icon={AlertTriangle} label="Ruptures" tone="warning" />
      </section>

      {data && data.ruptures.length > 0 && (
        <section className="rounded-xl border border-danger/30 bg-danger/5 p-3">
          <h2 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-danger">
            <AlertTriangle className="h-3.5 w-3.5" /> Articles en rupture imminente
          </h2>
          <ul className="space-y-1.5">
            {data.ruptures.map((r) => (
              <li
                key={r.articleCode}
                style={{ minHeight: 68 }}
                className="flex items-center justify-between gap-3 rounded-md bg-white p-3 text-[12.5px]"
              >
                <div className="min-w-0">
                  <div className="font-medium text-ink">{r.articleCode} · {r.articleName}</div>
                  <div className="text-[11.5px] text-ink-3">Seuil min : {r.minThreshold} {r.unit}</div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-bold text-danger">{r.quantity} {r.unit}</div>
                  <div className="text-[11px] text-ink-3">~{r.daysOfCover} j de couverture</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Activité du jour</h2>
        {isLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />)}
          </div>
        ) : data?.recentMovements.length === 0 ? (
          <p className="text-[12.5px] text-ink-3">Aucun mouvement pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.recentMovements.map((m) => {
              const isIn = m.direction === "IN";
              return (
                <li key={m.id} className="flex items-center gap-2 py-2 text-[12.5px]">
                  <span className={clsx(
                    "grid h-8 w-8 place-items-center rounded-full",
                    isIn ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  )}>
                    {isIn ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink">{m.articleCode} · {m.articleName}</div>
                    <div className="text-[11px] text-ink-3">
                      {m.reference} · {m.quantity} {m.unit} · {new Date(m.occurredAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className={clsx("text-right text-[12px] font-semibold tabular-nums", isIn ? "text-success" : "text-danger")}>
                    {isIn ? "+" : "-"}{(m.totalValue / 1_000_000).toFixed(2)} M
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  hint?: string;
  tone?: "ok" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        <Icon className={clsx(
          "h-4 w-4",
          tone === "danger" && "text-danger",
          tone === "warning" && "text-warning",
          (!tone || tone === "ok") && "text-primary-600"
        )} />
      </div>
      <div className={clsx(
        "mt-1 text-2xl font-bold",
        tone === "danger" && "text-danger",
        tone === "warning" && "text-warning",
        (!tone || tone === "ok") && "text-ink"
      )}>
        {value}
      </div>
      {hint && <div className="text-[10.5px] text-ink-3">{hint}</div>}
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: typeof Package;
  label: string;
  tone: "success" | "danger" | "info" | "warning";
}) {
  return (
    <Link
      href={href}
      style={{ minHeight: 80 }}
      className={clsx(
        "flex flex-col items-center justify-center gap-1 rounded-xl border p-3 shadow-card transition",
        tone === "success" && "border-success/30 bg-success/5 hover:bg-success/10",
        tone === "danger" && "border-danger/30 bg-danger/5 hover:bg-danger/10",
        tone === "info" && "border-primary-200 bg-primary-50 hover:bg-primary-100",
        tone === "warning" && "border-warning/30 bg-warning/5 hover:bg-warning/10"
      )}
    >
      <Icon className={clsx(
        "h-6 w-6",
        tone === "success" && "text-success",
        tone === "danger" && "text-danger",
        tone === "info" && "text-primary-700",
        tone === "warning" && "text-warning"
      )} />
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
    </Link>
  );
}
