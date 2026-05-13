"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Download } from "lucide-react";
import { clsx } from "clsx";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";

interface Movement {
  id: string;
  direction: "IN" | "OUT" | "ADJUSTMENT_PLUS" | "ADJUSTMENT_MINUS";
  reference: string;
  reason: string;
  articleCode: string;
  articleName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  notes: string | null;
  occurredAt: string;
}

type DirFilter = "ALL" | "IN" | "OUT" | "ADJ";

export default function MagMouvementsPage() {
  const [filter, setFilter] = useState<DirFilter>("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["mag", "movements", filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === "IN" || filter === "OUT") params.set("direction", filter);
      params.set("limit", "100");
      const res = await fetch(`/api/mag/stock-movements?${params}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Movement[]; counts: { total: number; byDirection: Record<string, number> } }>;
    },
  });

  const filtered = filter === "ADJ"
    ? data?.items.filter((m) => m.direction.startsWith("ADJUSTMENT")) ?? []
    : data?.items ?? [];

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Historique mouvements</h1>
        <SyncStatusBadge />
      </header>

      <section className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] text-ink-3">
          <strong className="text-ink">{data?.counts.total ?? 0}</strong> mouvements ·
          traçabilité complète
        </p>
        <button
          type="button"
          style={{ minHeight: 40 }}
          onClick={() => alert("Export Excel : stub (génération côté serveur en phase 2)")}
          className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] font-medium text-ink-2"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
          Tous {data ? `(${data.counts.total})` : ""}
        </Chip>
        <Chip active={filter === "IN"} onClick={() => setFilter("IN")} tone="success">
          Entrées {data ? `(${data.counts.byDirection.IN ?? 0})` : ""}
        </Chip>
        <Chip active={filter === "OUT"} onClick={() => setFilter("OUT")} tone="danger">
          Sorties {data ? `(${data.counts.byDirection.OUT ?? 0})` : ""}
        </Chip>
        <Chip active={filter === "ADJ"} onClick={() => setFilter("ADJ")} tone="warning">
          Ajustements
        </Chip>
      </div>

      <section className="space-y-1.5">
        {isLoading ? (
          [1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 animate-pulse rounded-md bg-surface-alt" />)
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-ink-3">
            Aucun mouvement à afficher.
          </p>
        ) : (
          filtered.map((m) => <MovementRow key={m.id} movement={m} />)
        )}
      </section>
    </div>
  );
}

function MovementRow({ movement }: { movement: Movement }) {
  const isIn = movement.direction === "IN";
  const isOut = movement.direction === "OUT";
  const isAdj = movement.direction.startsWith("ADJUSTMENT");
  const Icon = isIn ? ArrowDownToLine : isOut ? ArrowUpFromLine : RefreshCw;
  const tone = isIn ? "success" : isOut ? "danger" : "warning";

  return (
    <article
      style={{ minHeight: 68 }}
      className="flex items-center gap-3 rounded-lg border border-line bg-white p-3"
    >
      <span className={clsx(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full",
        tone === "success" && "bg-success/10 text-success",
        tone === "danger" && "bg-danger/10 text-danger",
        tone === "warning" && "bg-warning/10 text-warning"
      )}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-ink">{movement.reference}</div>
        <div className="text-[11.5px] text-ink-3">
          {movement.articleCode} · {movement.articleName} · {movement.quantity} {movement.unit}
        </div>
        <div className="text-[10.5px] text-ink-3">
          {new Date(movement.occurredAt).toLocaleString("fr-FR")}
        </div>
      </div>
      <div className={clsx(
        "text-right text-[13px] font-semibold tabular-nums",
        tone === "success" && "text-success",
        tone === "danger" && "text-danger",
        tone === "warning" && "text-warning"
      )}>
        {isIn ? "+" : isOut ? "-" : ""}
        {(movement.totalValue / 1_000_000).toFixed(2)} M
      </div>
    </article>
  );
}

function Chip({
  children,
  active,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: "success" | "danger" | "warning";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minHeight: 36 }}
      className={clsx(
        "shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition",
        active && !tone && "border-primary-500 bg-primary-500 text-white",
        active && tone === "success" && "border-success bg-success text-white",
        active && tone === "danger" && "border-danger bg-danger text-white",
        active && tone === "warning" && "border-warning bg-warning text-white",
        !active && "border-line bg-white text-ink-2 hover:border-primary-300"
      )}
    >
      {children}
    </button>
  );
}
