"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Building2, Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PageHelp } from "@/components/help/PageHelp";
import { TresorerieTutorial } from "@/components/help/tutorials/TresorerieTutorial";

interface Cashbox {
  id: string;
  siteId: string;
  siteCode: string;
  siteName: string;
  balance: number;
  recentMovements: Array<{ id: string; direction: "IN" | "OUT"; amount: number; reason: string; occurredAt: string }>;
}

interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  currency: string;
  accountType: string;
}

export default function TresoreriePage() {
  const [tab, setTab] = useState<"cashboxes" | "banks" | "reconciliation">("cashboxes");
  const [movement, setMovement] = useState<{ cashboxId: string; direction: "IN" | "OUT" } | null>(null);
  const qc = useQueryClient();

  const cashQuery = useQuery({
    queryKey: ["comptable", "cashboxes"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/treasury/cashboxes", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        items: Cashbox[];
        today: { inflow: string; outflow: string; net: string };
        scope: { isDirection: boolean };
      }>;
    },
  });

  const banksQuery = useQuery({
    queryKey: ["comptable", "banks"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/treasury/banks", { credentials: "same-origin" });
      if (res.status === 403) return { items: [], forbidden: true };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Bank[]; forbidden?: boolean }>;
    },
  });

  const isDirection = cashQuery.data?.scope.isDirection ?? false;
  const totalCashboxBalance = cashQuery.data?.items.reduce((s, c) => s + c.balance, 0) ?? 0;
  const totalBankBalance = banksQuery.data?.items.reduce((s, b) => s + b.balance, 0) ?? 0;
  const inflowToday = cashQuery.data?.today ? Number(cashQuery.data.today.inflow) : null;
  const outflowToday = cashQuery.data?.today ? Number(cashQuery.data.today.outflow) : null;
  const fmtM = (n: number | null) => (n === null ? "—" : `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`);

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-tresorerie">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Trésorerie comptable</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {isDirection
              ? "Banques + caisses chantier · rapprochements + import relevés."
              : "Caisses des chantiers assignés · enregistrement des mouvements."}
          </p>
        </div>
        <PageHelp title="Aide — Trésorerie comptable"><TresorerieTutorial /></PageHelp>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Solde caisses" value={`${new Intl.NumberFormat("fr-FR").format(Math.round(totalCashboxBalance))}`} icon={Wallet} />
        {isDirection && (
          <>
            <Kpi label="Solde banques" value={`${new Intl.NumberFormat("fr-FR").format(Math.round(totalBankBalance))}`} icon={Building2} />
            <Kpi label="Encaissements jour" value={fmtM(inflowToday)} icon={ArrowDownToLine} />
            <Kpi label="Décaissements jour" value={fmtM(outflowToday)} icon={ArrowUpFromLine} />
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-1 border-b border-line">
        <TabBtn active={tab === "cashboxes"} onClick={() => setTab("cashboxes")} label="Caisses chantiers" />
        {isDirection && (
          <>
            <TabBtn active={tab === "banks"} onClick={() => setTab("banks")} label="Banques" />
            <TabBtn active={tab === "reconciliation"} onClick={() => setTab("reconciliation")} label="Rapprochements" />
          </>
        )}
      </div>

      {tab === "cashboxes" && (
        <section className="rounded-xl border border-line bg-white shadow-card">
          {cashQuery.isLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-surface-alt" />
              ))}
            </div>
          ) : cashQuery.data?.items.length === 0 ? (
            <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune caisse chantier configurée.</p>
          ) : (
            <ul className="divide-y divide-line">
              {cashQuery.data?.items.map((c) => (
                <li key={c.id} className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-ink">
                        {c.siteCode} <span className="text-ink-3">— {c.siteName}</span>
                      </div>
                      <div className="text-[12px] text-ink-3">
                        Solde : <strong className="text-ink-2 tabular-nums">{c.balance.toLocaleString("fr-FR")} FCFA</strong>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setMovement({ cashboxId: c.id, direction: "IN" })}
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-success px-3 text-[12px] font-medium text-white hover:bg-success/90"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5" /> Entrée
                      </button>
                      <button
                        type="button"
                        onClick={() => setMovement({ cashboxId: c.id, direction: "OUT" })}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-danger/40 bg-white px-3 text-[12px] font-medium text-danger hover:bg-danger/5"
                      >
                        <ArrowUpFromLine className="h-3.5 w-3.5" /> Sortie
                      </button>
                    </div>
                  </div>
                  {c.recentMovements.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[12px]">
                      {c.recentMovements.slice(0, 5).map((m) => (
                        <li
                          key={m.id}
                          className={clsx(
                            "flex items-center justify-between rounded px-2 py-1",
                            m.direction === "IN" ? "bg-success/5" : "bg-danger/5"
                          )}
                        >
                          <span className="text-ink-2">
                            {m.direction === "IN" ? "+" : "-"} {m.amount.toLocaleString("fr-FR")} FCFA — {m.reason}
                          </span>
                          <span className="text-[11px] text-ink-3">
                            {new Date(m.occurredAt).toLocaleDateString("fr-FR")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "banks" && isDirection && (
        <section className="rounded-xl border border-line bg-white shadow-card">
          {banksQuery.data?.forbidden ? (
            <p className="p-6 text-center text-[12.5px] text-ink-3">Banques réservées au Comptable Direction.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">Banque</th>
                    <th className="px-3 py-2">Compte</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {banksQuery.data?.items.map((b) => (
                    <tr key={b.id} className="border-b border-line">
                      <td className="px-3 py-2 font-medium text-ink">{b.bankName}</td>
                      <td className="px-3 py-2 text-ink-3">{b.accountNumber}</td>
                      <td className="px-3 py-2 text-ink-3">{b.accountType}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {b.balance.toLocaleString("fr-FR")} {b.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "reconciliation" && isDirection && (
        <section className="rounded-xl border border-line bg-white p-6 shadow-card text-center text-[12.5px] text-ink-3">
          <p>
            Le rapprochement bancaire (import CSV + pointage auto/manuel) se fait sur la page dédiée :
          </p>
          <a
            href="/comptable/rapprochement"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-primary-700"
          >
            Ouvrir le rapprochement bancaire →
          </a>
        </section>
      )}

      {movement && (
        <CashMovementModal
          cashboxId={movement.cashboxId}
          direction={movement.direction}
          onClose={() => setMovement(null)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["comptable", "cashboxes"] })}
        />
      )}
    </div>
  );
}

function CashMovementModal({
  cashboxId,
  direction,
  onClose,
  onCreated,
}: {
  cashboxId: string;
  direction: "IN" | "OUT";
  onClose: () => void;
  onCreated: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/comptable/treasury/cashboxes", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cashboxId, direction, amount: Number(amount), reason, reference }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
        <h2 className="text-[14px] font-semibold text-ink">
          Mouvement caisse · {direction === "IN" ? "Entrée" : "Sortie"}
        </h2>
        <div className="mt-3 space-y-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant FCFA"
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif"
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
          />
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Référence pièce"
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
          />
          {submit.error && (
            <div className="rounded-md bg-danger/10 p-2 text-[12px] text-danger">
              {(submit.error as Error).message}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-line-2 bg-white px-3 text-[12.5px]">
            Annuler
          </button>
          <button
            type="button"
            onClick={() => submit.mutate()}
            disabled={!amount || !reason || submit.isPending}
            className="h-9 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Wallet }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        <Icon className="h-4 w-4 text-primary-600" />
      </div>
      <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
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
