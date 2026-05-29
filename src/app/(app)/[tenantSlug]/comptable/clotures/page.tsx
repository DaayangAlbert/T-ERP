"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Lock, LockOpen, ShieldCheck } from "lucide-react";

interface PeriodRow {
  period: string;
  status: "OPEN" | "CLOSING" | "CLOSED" | "LOCKED";
  closedAt: string | null;
  entries: number;
  debit: string;
  credit: string;
  balanced: boolean;
}

const STATUS_TONE: Record<string, string> = {
  OPEN: "bg-success/10 text-success",
  CLOSING: "bg-warning/10 text-warning",
  CLOSED: "bg-ink-3/15 text-ink-2",
  LOCKED: "bg-danger/10 text-danger",
};
const STATUS_LABEL: Record<string, string> = {
  OPEN: "Ouverte",
  CLOSING: "En clôture",
  CLOSED: "Clôturée",
  LOCKED: "Verrouillée",
};

const fmt = (s: string) => new Intl.NumberFormat("fr-FR").format(BigInt(s));
const monthLabel = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

export default function CloturesPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["comptable", "periods"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/periods", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items?: PeriodRow[]; isDirection?: boolean; forbidden?: boolean }>;
    },
  });

  const mutate = useMutation({
    mutationFn: async ({ period, action }: { period: string; action: "close" | "reopen" }) => {
      const res = await fetch("/api/comptable/periods", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, action }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      return res.json();
    },
    onMutate: () => setError(null),
    onError: (e) => setError((e as Error).message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comptable", "periods"] }),
  });

  if (data?.forbidden) {
    return (
      <div data-rh-screen className="space-y-3" id="screen-cpt-clotures">
        <header className="border-b border-line pb-3">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Clôtures comptables</h1>
        </header>
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-4 text-[13px] text-warning">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Réservé au Comptable Direction</p>
            <p className="text-[12.5px] text-ink-3">La clôture mensuelle est gérée par le Comptable Direction / DAF.</p>
          </div>
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-clotures">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Clôtures comptables</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Clôture mensuelle SYSCOHADA — une période clôturée n&apos;accepte plus de saisie ni de validation.
        </p>
      </header>

      {error && <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-[12.5px] text-danger">{error}</div>}

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12.5px]">
              <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2">Période</th>
                  <th className="px-3 py-2 text-right">Écritures</th>
                  <th className="px-3 py-2 text-right">Débit</th>
                  <th className="px-3 py-2 text-right">Crédit</th>
                  <th className="px-3 py-2">Équilibre</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.period} className="border-b border-line">
                    <td className="px-3 py-2 font-medium text-ink capitalize">{monthLabel(p.period)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.entries}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(p.debit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(p.credit)}</td>
                    <td className="px-3 py-2">
                      {p.entries === 0 ? (
                        <span className="text-ink-3">—</span>
                      ) : p.balanced ? (
                        <span className="text-success">✓ équilibré</span>
                      ) : (
                        <span className="text-danger">✗ déséquilibre</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={clsx("rounded px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[p.status])}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.status === "OPEN" ? (
                        <button
                          type="button"
                          disabled={mutate.isPending || !p.balanced || p.entries === 0}
                          title={!p.balanced ? "Période déséquilibrée" : p.entries === 0 ? "Aucune écriture" : "Clôturer la période"}
                          onClick={() => {
                            if (confirm(`Clôturer ${monthLabel(p.period)} ? Plus aucune saisie ne sera possible sur ce mois.`)) {
                              mutate.mutate({ period: p.period, action: "close" });
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-primary-700 disabled:opacity-40"
                        >
                          <Lock className="h-3 w-3" /> Clôturer
                        </button>
                      ) : p.status === "CLOSED" ? (
                        <button
                          type="button"
                          disabled={mutate.isPending}
                          onClick={() => {
                            if (confirm(`Rouvrir ${monthLabel(p.period)} ? La saisie redevient possible.`)) {
                              mutate.mutate({ period: p.period, action: "reopen" });
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink-2 hover:border-primary-300 hover:text-primary-700"
                        >
                          <LockOpen className="h-3 w-3" /> Rouvrir
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-ink-3"><ShieldCheck className="h-3 w-3" /> verrouillée</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
