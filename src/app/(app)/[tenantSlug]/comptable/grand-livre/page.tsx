"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";

interface LedgerLine {
  id: string;
  date: string;
  journal: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  siteCode: string | null;
  lettering: string | null;
  balance: number;
}

interface BalanceAccount {
  code: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function GrandLivrePage() {
  const [tab, setTab] = useState<"ledger" | "balance" | "auxiliary" | "lettering">("ledger");
  const [account, setAccount] = useState("401");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  const ledger = useQuery({
    queryKey: ["comptable", "ledger", account, period],
    enabled: tab === "ledger" || tab === "lettering",
    queryFn: async () => {
      const res = await fetch(`/api/comptable/general-ledger?account=${account}&period=${period}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: LedgerLine[]; finalBalance: number; scope: { isDirection: boolean } }>;
    },
  });

  const balance = useQuery({
    queryKey: ["comptable", "balance", period, tab],
    enabled: tab === "balance" || tab === "auxiliary",
    queryFn: async () => {
      const type = tab === "auxiliary" ? "auxiliary" : "general";
      const res = await fetch(`/api/comptable/balance?period=${period}&type=${type}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        accounts: BalanceAccount[];
        totals: { debit: number; credit: number };
      }>;
    },
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-grand-livre">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Grand livre · balance · lettrage</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Consultation détaillée des comptes, balance générale et auxiliaire, lettrage manuel.
        </p>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-line">
        <TabBtn active={tab === "ledger"} onClick={() => setTab("ledger")} label="Grand livre" />
        <TabBtn active={tab === "balance"} onClick={() => setTab("balance")} label="Balance générale" />
        <TabBtn active={tab === "auxiliary"} onClick={() => setTab("auxiliary")} label="Balance auxiliaire" />
        <TabBtn active={tab === "lettering"} onClick={() => setTab("lettering")} label="Lettrage" />
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="Compte (ex: 401)"
          className="h-9 rounded-md border border-line bg-white px-2 text-[13px]"
        />
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2 text-[13px]"
        />
      </div>

      {(tab === "ledger" || tab === "lettering") && (
        <section className="rounded-xl border border-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-[12px]">
              <thead className="border-b border-line bg-surface-alt text-left text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Journal</th>
                  <th className="px-3 py-2">Référence</th>
                  <th className="px-3 py-2">Libellé</th>
                  <th className="px-3 py-2 text-right">Débit</th>
                  <th className="px-3 py-2 text-right">Crédit</th>
                  <th className="px-3 py-2 text-right">Solde</th>
                  <th className="px-3 py-2">Lettrage</th>
                </tr>
              </thead>
              <tbody>
                {ledger.data?.items.map((l) => (
                  <tr key={l.id} className="border-b border-line">
                    <td className="px-3 py-1.5 text-ink-3">{new Date(l.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-3 py-1.5">
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-medium text-primary-700">
                        {l.journal}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-medium text-ink">{l.reference}</td>
                    <td className="px-3 py-1.5 text-ink-2">{l.description}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{l.debit.toLocaleString("fr-FR")}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{l.credit.toLocaleString("fr-FR")}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium text-ink">
                      {l.balance.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-success">{l.lettering ?? ""}</td>
                  </tr>
                ))}
                {ledger.data?.items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-ink-3">
                      Aucun mouvement.
                    </td>
                  </tr>
                )}
              </tbody>
              {ledger.data && (
                <tfoot className="border-t border-line bg-surface-alt">
                  <tr className="text-[12px] font-semibold">
                    <td colSpan={6} className="px-3 py-2 text-right uppercase tracking-wider text-ink-3">
                      Solde final
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {ledger.data.finalBalance.toLocaleString("fr-FR")}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}

      {(tab === "balance" || tab === "auxiliary") && (
        <section className="rounded-xl border border-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2">Compte</th>
                  <th className="px-3 py-2 text-right">Débit</th>
                  <th className="px-3 py-2 text-right">Crédit</th>
                  <th className="px-3 py-2 text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {balance.data?.accounts.map((a) => (
                  <tr key={a.code} className="border-b border-line">
                    <td className="px-3 py-1.5 font-medium text-ink">{a.code}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{a.debit.toLocaleString("fr-FR")}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{a.credit.toLocaleString("fr-FR")}</td>
                    <td
                      className={clsx(
                        "px-3 py-1.5 text-right tabular-nums font-medium",
                        a.balance >= 0 ? "text-ink" : "text-danger"
                      )}
                    >
                      {a.balance.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
              {balance.data && (
                <tfoot className="border-t border-line bg-surface-alt">
                  <tr className="text-[12px] font-semibold">
                    <td className="px-3 py-2 uppercase tracking-wider text-ink-3">Total</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {balance.data.totals.debit.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {balance.data.totals.credit.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right text-ink-3">
                      {balance.data.totals.debit === balance.data.totals.credit ? "✓ Équilibré" : "⚠ Déséquilibre"}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
        active ? "text-primary-700" : "text-ink-3 hover:text-ink"
      )}
    >
      {label}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  );
}
