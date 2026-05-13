"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplier: string;
  invoiceDate: string;
  dueDate: string;
  amountHt: number;
  vatAmount: number;
  amountTtc: number;
  siteCode: string | null;
  siteName: string | null;
  status: string;
  poRef: string | null;
}

interface InvoicesResponse {
  items: Invoice[];
  counts: { toAccount: number; dueSoon: number; disputed: number; paid: number };
  scope: { isDirection: boolean };
}

const TABS = [
  { key: "to-account", label: "À comptabiliser", filter: ["RECEIVED", "PENDING_3WAY_MATCH"] },
  { key: "accounted", label: "Comptabilisées", filter: ["ACCOUNTED"] },
  { key: "due-soon", label: "À payer J+7", filter: ["PENDING_PAYMENT"] },
  { key: "disputed", label: "En litige", filter: ["DISPUTED"] },
  { key: "paid", label: "Payées", filter: ["PAID"] },
] as const;

export default function FacturesFrnsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("to-account");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["comptable", "supplier-invoices"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/supplier-invoices", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<InvoicesResponse>;
    },
  });

  const action = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      const res = await fetch(`/api/comptable/supplier-invoices/${id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comptable", "supplier-invoices"] }),
  });

  const activeFilter = (TABS.find((t) => t.key === tab)?.filter ?? []) as readonly string[];
  const filtered = data?.items.filter((i) => activeFilter.includes(i.status)) ?? [];
  const today = new Date();
  const isDirection = data?.scope.isDirection ?? true;

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-factures-frns">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Factures fournisseurs</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Réception, OCR, comptabilisation 3-way matching, suivi paiement.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="À comptabiliser" value={data?.counts.toAccount ?? 0} icon={FileText} />
        <Kpi label="Échéant J+7" value={data?.counts.dueSoon ?? 0} icon={AlertTriangle} accent="warning" />
        <Kpi label="En litige" value={data?.counts.disputed ?? 0} icon={AlertTriangle} accent="danger" />
        <Kpi label="Payées ce mois" value={data?.counts.paid ?? 0} icon={CheckCircle2} accent="success" />
      </section>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune facture sur cet onglet.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">N°</th>
                    <th className="px-3 py-2">Fournisseur</th>
                    <th className="px-3 py-2">Émise</th>
                    <th className="px-3 py-2">Échéance</th>
                    <th className="px-3 py-2 text-right">TTC</th>
                    <th className="px-3 py-2">BC</th>
                    {isDirection && <th className="px-3 py-2">Chantier</th>}
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => {
                    const overdue = new Date(i.dueDate) < today;
                    return (
                      <tr key={i.id} className="border-b border-line">
                        <td className="px-3 py-2 font-medium text-ink">{i.invoiceNumber}</td>
                        <td className="px-3 py-2 text-ink-2">{i.supplier}</td>
                        <td className="px-3 py-2 text-ink-3">
                          {new Date(i.invoiceDate).toLocaleDateString("fr-FR")}
                        </td>
                        <td className={clsx("px-3 py-2", overdue ? "font-medium text-danger" : "text-ink-3")}>
                          {new Date(i.dueDate).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {i.amountTtc.toLocaleString("fr-FR")}
                        </td>
                        <td className="px-3 py-2 text-ink-3">{i.poRef ?? "—"}</td>
                        {isDirection && <td className="px-3 py-2 text-ink-3">{i.siteCode ?? "siège"}</td>}
                        <td className="px-3 py-2 text-right">
                          {i.status === "RECEIVED" || i.status === "PENDING_3WAY_MATCH" ? (
                            <button
                              type="button"
                              onClick={() => action.mutate({ id: i.id, action: "account" })}
                              className="text-[11.5px] font-medium text-primary-700 hover:underline"
                            >
                              Comptabiliser
                            </button>
                          ) : i.status === "PENDING_PAYMENT" || i.status === "ACCOUNTED" ? (
                            <button
                              type="button"
                              onClick={() => action.mutate({ id: i.id, action: "pay" })}
                              className="text-[11.5px] font-medium text-success hover:underline"
                            >
                              Marquer payée
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 p-3 md:hidden">
              {filtered.map((i) => {
                const overdue = new Date(i.dueDate) < today;
                return (
                  <div key={i.id} className="rounded-lg border border-line bg-white p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-ink">{i.invoiceNumber}</div>
                        <div className="text-[11.5px] text-ink-3">{i.supplier}</div>
                      </div>
                      <span className="text-[12.5px] font-semibold tabular-nums text-ink">
                        {(i.amountTtc / 1_000_000).toFixed(1)} M
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between text-[11.5px]">
                      <span className={clsx(overdue ? "font-medium text-danger" : "text-ink-3")}>
                        Échéance {new Date(i.dueDate).toLocaleDateString("fr-FR")}
                      </span>
                      <span className="text-ink-3">{i.siteCode ?? "siège"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  accent?: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        <Icon
          className={clsx(
            "h-4 w-4",
            accent === "danger" && "text-danger",
            accent === "warning" && "text-warning",
            accent === "success" && "text-success",
            !accent && "text-primary-600"
          )}
        />
      </div>
      <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
    </div>
  );
}
