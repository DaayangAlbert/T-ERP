"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Link2 } from "lucide-react";
import { PageHelp } from "@/components/help/PageHelp";
import { GrandLivreTutorial } from "@/components/help/tutorials/GrandLivreTutorial";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const letter = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/comptable/lettering", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ code: string; count: number }>;
    },
    onSuccess: () => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["comptable", "ledger"] });
    },
  });

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
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Grand livre · balance · lettrage</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Consultation détaillée des comptes, balance générale et auxiliaire, lettrage manuel.
          </p>
        </div>
        <PageHelp title="Aide — Grand livre · balance · lettrage"><GrandLivreTutorial /></PageHelp>
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
          {tab === "lettering" && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-primary-50 px-3 py-2 text-[12px]">
              <span className="text-primary-700">
                Sélectionne au moins 2 lignes équilibrées (D = C) pour les lettrer ensemble.
              </span>
              {selected.size > 0 && (
                <LetteringBar
                  items={ledger.data?.items ?? []}
                  selected={selected}
                  onClear={() => setSelected(new Set())}
                  onLetter={() => letter.mutate()}
                  pending={letter.isPending}
                  error={letter.error ? (letter.error as Error).message : null}
                />
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-[12px]">
              <thead className="border-b border-line bg-surface-alt text-left text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  {tab === "lettering" && <th className="w-8 px-2 py-2"></th>}
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
                {ledger.data?.items.map((l) => {
                  const isLettered = !!l.lettering;
                  const isSelected = selected.has(l.id);
                  return (
                    <tr
                      key={l.id}
                      className={clsx("border-b border-line", isSelected && "bg-primary-50/50")}
                    >
                      {tab === "lettering" && (
                        <td className="px-2 py-1.5">
                          {!isLettered && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setSelected((cur) => {
                                  const next = new Set(cur);
                                  if (e.target.checked) next.add(l.id);
                                  else next.delete(l.id);
                                  return next;
                                })
                              }
                              className="h-3.5 w-3.5 rounded border-line"
                            />
                          )}
                        </td>
                      )}
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
                      <td className="px-3 py-1.5 text-[11px] font-semibold text-success">{l.lettering ?? ""}</td>
                    </tr>
                  );
                })}
                {ledger.data?.items.length === 0 && (
                  <tr>
                    <td colSpan={tab === "lettering" ? 9 : 8} className="px-3 py-6 text-center text-ink-3">
                      Aucun mouvement.
                    </td>
                  </tr>
                )}
              </tbody>
              {ledger.data && (
                <tfoot className="border-t border-line bg-surface-alt">
                  <tr className="text-[12px] font-semibold">
                    <td
                      colSpan={tab === "lettering" ? 7 : 6}
                      className="px-3 py-2 text-right uppercase tracking-wider text-ink-3"
                    >
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

function LetteringBar({
  items,
  selected,
  onClear,
  onLetter,
  pending,
  error,
}: {
  items: LedgerLine[];
  selected: Set<string>;
  onClear: () => void;
  onLetter: () => void;
  pending: boolean;
  error: string | null;
}) {
  const selectedItems = items.filter((l) => selected.has(l.id));
  const totalDebit = selectedItems.reduce((s, l) => s + l.debit, 0);
  const totalCredit = selectedItems.reduce((s, l) => s + l.credit, 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0 && selected.size >= 2;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-semibold text-primary-700">{selected.size} sélectionnée(s)</span>
      <span className="text-ink-3">
        D : <strong className="tabular-nums">{totalDebit.toLocaleString("fr-FR")}</strong> · C :{" "}
        <strong className="tabular-nums">{totalCredit.toLocaleString("fr-FR")}</strong>
      </span>
      {!balanced && totalDebit > 0 && (
        <span className="text-danger">Écart {Math.abs(totalDebit - totalCredit).toLocaleString("fr-FR")}</span>
      )}
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] text-ink-3 hover:text-ink"
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={onLetter}
        disabled={!balanced || pending}
        className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-2.5 py-1 text-[11.5px] font-medium text-white disabled:opacity-50"
      >
        <Link2 className="h-3 w-3" /> {pending ? "Lettrage…" : "Lettrer"}
      </button>
      {error && <span className="text-[11px] text-danger">{error}</span>}
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
