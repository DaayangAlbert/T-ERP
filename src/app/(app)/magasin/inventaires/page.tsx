"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Play, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";

interface Inventory {
  id: string;
  type: string;
  scope: string;
  plannedDate: string;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  totalGapValue: number;
}

const TYPE_LABELS: Record<string, string> = {
  MONTHLY: "Mensuel",
  ROLLING_WEEKLY: "Tournant hebdo",
  ROLLING_BIWEEKLY: "Tournant bimensuel",
  ROLLING_MONTHLY: "Tournant mensuel",
  ANNUAL: "Annuel",
  ADHOC: "Ad hoc",
};

const STATUS_LABELS: Record<string, { label: string; tone: "info" | "warning" | "success" | "danger" }> = {
  PLANNED: { label: "Planifié", tone: "info" },
  IN_PROGRESS: { label: "En cours", tone: "warning" },
  PENDING_VALIDATION: { label: "À valider", tone: "warning" },
  COMPLETED: { label: "Clôturé", tone: "success" },
  CANCELLED: { label: "Annulé", tone: "danger" },
};

export default function MagInventairesPage() {
  const qc = useQueryClient();
  const [scope, setScope] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["mag", "inventories"],
    queryFn: async () => {
      const res = await fetch("/api/mag/inventories", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Inventory[] }>;
    },
  });

  const start = useMutation({
    mutationFn: async ({ type, scope }: { type: string; scope: string }) => {
      const res = await fetch("/api/mag/inventories", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, scope }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mag", "inventories"] }),
  });

  const inProgress = data?.items.filter((i) => i.status === "IN_PROGRESS" || i.status === "PLANNED") ?? [];
  const history = data?.items.filter((i) => i.status === "COMPLETED" || i.status === "PENDING_VALIDATION") ?? [];

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Inventaires</h1>
        <SyncStatusBadge />
      </header>

      <section className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-white/80">
              <ClipboardList className="h-4 w-4" /> Démarrer un inventaire
            </div>
            <p className="mt-1 text-[13px]">Inventaire tournant ou mensuel — préchargement automatique des quantités théoriques</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{ minHeight: 48, fontSize: 16 }}
            className="rounded-md bg-white/95 px-2 text-ink"
          >
            <option value="all">Tous les articles</option>
            <option value="category:CEMENT_CONCRETE">Ciment / béton</option>
            <option value="category:STEEL_REBAR">Acier</option>
            <option value="category:AGGREGATES">Granulats</option>
            <option value="category:FORMWORK">Coffrage</option>
            <option value="category:FUEL">Carburants</option>
          </select>
          <button
            type="button"
            onClick={() => start.mutate({ type: scope === "all" ? "MONTHLY" : "ROLLING_MONTHLY", scope })}
            disabled={start.isPending}
            style={{ minHeight: 48 }}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-white px-3 text-[13.5px] font-semibold text-amber-700 hover:bg-white/95 disabled:opacity-50"
          >
            <Play className="h-4 w-4" /> Démarrer
          </button>
        </div>
        {start.error && (
          <p className="mt-2 rounded-md bg-white/20 p-1.5 text-[11.5px] text-white">
            {(start.error as Error).message}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">En cours / planifiés</h2>
        {isLoading ? (
          <div className="space-y-1.5">
            {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-md bg-surface-alt" />)}
          </div>
        ) : inProgress.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-ink-3">
            Aucun inventaire en cours.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {inProgress.map((i) => <InventoryCard key={i.id} inventory={i} />)}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Historique</h2>
          <ul className="space-y-1.5">
            {history.map((i) => <InventoryCard key={i.id} inventory={i} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

function InventoryCard({ inventory }: { inventory: Inventory }) {
  const status = STATUS_LABELS[inventory.status];
  return (
    <li
      style={{ minHeight: 68 }}
      className="flex items-center gap-3 rounded-lg border border-line bg-white p-3"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700">
        {inventory.status === "COMPLETED" ? <CheckCircle2 className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-ink">{TYPE_LABELS[inventory.type] ?? inventory.type}</div>
        <div className="text-[11.5px] text-ink-3">
          {inventory.scope === "all" ? "Tous articles" : inventory.scope.replace("category:", "")}
          {" · "}
          {new Date(inventory.plannedDate).toLocaleDateString("fr-FR")}
        </div>
      </div>
      <div className="text-right">
        <span className={clsx(
          "rounded-full px-2 py-0.5 text-[11px] font-medium",
          status?.tone === "info" && "bg-primary-50 text-primary-700",
          status?.tone === "warning" && "bg-warning/10 text-warning",
          status?.tone === "success" && "bg-success/10 text-success",
          status?.tone === "danger" && "bg-danger/10 text-danger"
        )}>
          {status?.label ?? inventory.status}
        </span>
        {inventory.totalGapValue !== 0 && (
          <div className={clsx(
            "mt-1 text-[11.5px] font-semibold tabular-nums",
            inventory.totalGapValue < 0 ? "text-danger" : "text-success"
          )}>
            {inventory.totalGapValue > 0 ? "+" : ""}{(inventory.totalGapValue / 1_000).toFixed(0)} k
          </div>
        )}
      </div>
    </li>
  );
}
