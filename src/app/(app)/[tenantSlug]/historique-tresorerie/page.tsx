"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  Wallet,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Role } from "@prisma/client";
import { useTreasuryHistory, type TreasuryHistoryItem } from "@/hooks/useTreasuryHistory";
import { formatDate, formatFCFA } from "@/lib/format";

type DirectionFilter = "" | "IN" | "OUT";
type SourceFilter = "" | "ENTRY" | "CASHBOX";

const ROLE_TITLE: Partial<Record<Role, string>> = {
  DAF: "Historique trésorerie — supervision DAF",
  ACCOUNTANT: "Historique trésorerie — Comptable",
  DG: "Historique trésorerie — Direction Générale",
  TECH_DIRECTOR: "Historique trésorerie — vue chantiers",
};

const ROLE_SUBTITLE: Partial<Record<Role, string>> = {
  DAF: "Entrées et sorties consolidées : banques + caisses chantiers.",
  ACCOUNTANT: "Toutes les opérations de trésorerie passées dans la période.",
  DG: "Lecture seule · arbitrages stratégiques.",
  TECH_DIRECTOR: "Mouvements rattachés à un chantier uniquement.",
};

export default function TreasuryHistoryPage() {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [direction, setDirection] = useState<DirectionFilter>("");
  const [source, setSource] = useState<SourceFilter>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useTreasuryHistory({
    from,
    to,
    direction: direction || undefined,
    source: source || undefined,
    q: q.trim() || undefined,
    page,
  });

  const role = data?.scope.role;
  const title = (role && ROLE_TITLE[role]) ?? "Historique trésorerie";
  const subtitle = (role && ROLE_SUBTITLE[role]) ?? "";

  return (
    <>
      <header className="mb-4 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">{subtitle}</p>
        {data?.scope.restrictedToSites && (
          <div className="mt-2 inline-flex items-center gap-1 rounded bg-info/10 px-2 py-0.5 text-[11px] font-medium text-info">
            <Building2 className="h-3 w-3" /> Filtre actif : uniquement mouvements rattachés à un chantier
          </div>
        )}
      </header>

      {/* Filtres */}
      <section className="mb-4 grid gap-2 rounded-xl border border-line bg-white p-3 shadow-card lg:grid-cols-6">
        <div>
          <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Du</label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
          />
        </div>
        <div>
          <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Au</label>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
          />
        </div>
        <div>
          <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Sens</label>
          <select
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value as DirectionFilter);
              setPage(1);
            }}
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
          >
            <option value="">Tous</option>
            <option value="IN">Entrées</option>
            <option value="OUT">Sorties</option>
          </select>
        </div>
        <div>
          <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Source</label>
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value as SourceFilter);
              setPage(1);
            }}
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
          >
            <option value="">Toutes</option>
            <option value="ENTRY">Écritures comptables</option>
            <option value="CASHBOX">Caisses chantiers</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Recherche</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Libellé, contrepartie, référence…"
              className="h-9 w-full rounded-md border border-line bg-white pl-7 pr-2 text-[12.5px]"
            />
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="mb-4 grid gap-2 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Entrées"
          value={data ? formatFCFA(BigInt(data.summary.totalIn)) : "—"}
          icon={<ArrowDownLeft className="h-4 w-4 text-success" />}
          tone="success"
        />
        <KpiCard
          label="Sorties"
          value={data ? formatFCFA(BigInt(data.summary.totalOut)) : "—"}
          icon={<ArrowUpRight className="h-4 w-4 text-danger" />}
          tone="danger"
        />
        <KpiCard
          label="Solde net"
          value={data ? formatFCFA(BigInt(data.summary.net)) : "—"}
          icon={<Banknote className="h-4 w-4 text-primary-600" />}
          tone={
            data && BigInt(data.summary.net) < 0n ? "danger" : "primary"
          }
        />
        <KpiCard
          label="Répartition"
          value={data ? `${data.summary.countEntry} écr · ${data.summary.countCashbox} caisses` : "—"}
          icon={<Wallet className="h-4 w-4 text-info" />}
          tone="info"
        />
      </section>

      {/* Liste */}
      <section className="rounded-xl border border-line bg-white shadow-card">
        {isError ? (
          <p className="p-6 text-center text-[13px] text-danger">Erreur de chargement.</p>
        ) : isLoading || !data ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <p className="p-8 text-center text-[13px] text-ink-3">
            Aucun mouvement sur la période et les filtres choisis.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[800px] text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Libellé</th>
                    <th className="px-3 py-2">Contrepartie</th>
                    <th className="px-3 py-2">Chantier</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((m) => (
                    <Row key={m.id} m={m} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-2 p-3 md:hidden">
              {data.items.map((m) => (
                <MobileRow key={m.id} m={m} />
              ))}
            </ul>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[12px]">
              <span className="text-ink-3">
                {data.total} mouvement{data.total > 1 ? "s" : ""} · page {data.page}/{data.totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="grid h-7 w-7 place-items-center rounded border border-line bg-white text-ink-3 disabled:opacity-40 enabled:hover:bg-surface-alt"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="grid h-7 w-7 place-items-center rounded border border-line bg-white text-ink-3 disabled:opacity-40 enabled:hover:bg-surface-alt"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function Row({ m }: { m: TreasuryHistoryItem }) {
  const isIn = m.direction === "IN";
  return (
    <tr className="border-b border-line">
      <td className="px-3 py-2 text-ink-3">{formatDate(m.occurredAt, "dd/MM/yyyy")}</td>
      <td className="px-3 py-2">
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
            m.source === "ENTRY" ? "bg-primary-50 text-primary-700" : "bg-warning/10 text-warning"
          )}
        >
          {m.source === "ENTRY" ? <Building2 className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
          {m.sourceLabel}
        </span>
      </td>
      <td className="px-3 py-2 text-ink">{m.label}</td>
      <td className="px-3 py-2 text-ink-3">{m.counterparty ?? "—"}</td>
      <td className="px-3 py-2 font-mono text-[11px] text-ink-3">{m.siteCode ?? "—"}</td>
      <td className={clsx("px-3 py-2 text-right font-mono font-semibold tabular-nums", isIn ? "text-success" : "text-danger")}>
        {isIn ? "+ " : "− "}
        {formatFCFA(BigInt(m.amount))}
      </td>
    </tr>
  );
}

function MobileRow({ m }: { m: TreasuryHistoryItem }) {
  const isIn = m.direction === "IN";
  return (
    <li className="rounded-md border border-line bg-white p-2.5">
      <div className="flex items-start gap-2">
        <span
          className={clsx(
            "mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full",
            isIn ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
          )}
        >
          {isIn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink">{m.label}</div>
          <div className="text-[11px] text-ink-3">
            {m.sourceLabel}
            {m.counterparty && ` · ${m.counterparty}`}
            {m.siteCode && ` · ${m.siteCode}`}
          </div>
          <div className="text-[10.5px] text-ink-3">{formatDate(m.occurredAt, "dd/MM/yyyy")}</div>
        </div>
        <span className={clsx("font-mono text-[13px] font-semibold tabular-nums", isIn ? "text-success" : "text-danger")}>
          {isIn ? "+ " : "− "}
          {formatFCFA(BigInt(m.amount))}
        </span>
      </div>
    </li>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "primary" | "success" | "danger" | "info";
}) {
  const cls = {
    primary: "border-primary-200 bg-primary-50",
    success: "border-success/30 bg-success/5",
    danger: "border-danger/30 bg-danger/5",
    info: "border-info/30 bg-info/5",
  }[tone];
  const valCls = {
    primary: "text-primary-800",
    success: "text-success",
    danger: "text-danger",
    info: "text-info",
  }[tone];
  return (
    <div className={clsx("rounded-xl border p-3 shadow-card sm:p-4", cls)}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className={clsx("mt-1 font-mono text-[16px] font-bold tabular-nums sm:text-[18px]", valCls)}>{value}</div>
    </div>
  );
}
