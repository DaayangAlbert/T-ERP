"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, AlertOctagon, CalendarClock, FileCheck, Wallet } from "lucide-react";
import { clsx } from "clsx";
import type { TaxType, TaxAuthority, DeclarationStatus, PaymentStatus } from "@prisma/client";

interface Deadline {
  id: string;
  type: TaxType;
  authority: TaxAuthority;
  period: string;
  dueDate: string;
  amount: number | null;
  declarationStatus: DeclarationStatus;
  paymentStatus: PaymentStatus;
}

const TYPE_LABEL: Record<TaxType, string> = {
  VAT: "TVA",
  IRPP: "IRPP",
  CNPS_DIPE: "CNPS / DIPE",
  CFC: "CFC",
  FNE: "FNE",
  RAV: "RAV",
  TC: "Taxe communale",
  CAC: "CAC",
  IS_INSTALLMENT: "IS acompte",
  IS_BALANCE: "IS solde",
  DSF_FILING: "Dépôt DSF",
  TAXES_ANNEXES: "Taxes annexes",
  OTHER: "Autre",
};

const AUTHORITY_LABEL: Record<TaxAuthority, string> = {
  DGI: "DGI",
  CNPS: "CNPS",
  COMMUNE: "Commune",
  CNAM_OCCUPATIONAL: "CNAM",
  OTHER: "Autre",
};

const DECL_LABEL: Record<DeclarationStatus, string> = {
  PENDING: "À déclarer",
  PREPARED: "Préparée",
  SUBMITTED: "Déclarée",
  ACCEPTED: "Acceptée",
  REJECTED: "Rejetée",
};

const PAY_LABEL: Record<PaymentStatus, string> = {
  PENDING: "À payer",
  SCHEDULED: "Programmé",
  PAID: "Payée",
  OVERDUE: "En retard",
};

const DECL_TONE: Record<DeclarationStatus, string> = {
  PENDING: "bg-warning/10 text-warning",
  PREPARED: "bg-info/10 text-info",
  SUBMITTED: "bg-success/10 text-success",
  ACCEPTED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
};

const PAY_TONE: Record<PaymentStatus, string> = {
  PENDING: "bg-warning/10 text-warning",
  SCHEDULED: "bg-info/10 text-info",
  PAID: "bg-success/10 text-success",
  OVERDUE: "bg-danger/10 text-danger",
};

export default function FiscalPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["comptable", "tax-preparation"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/tax/preparation", { credentials: "same-origin" });
      if (res.status === 403) return { forbidden: true } as const;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Deadline[] }>;
    },
  });

  const declare = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/daf/tax/deadlines/${id}/declare`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comptable", "tax-preparation"] }),
  });

  const pay = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/daf/tax/deadlines/${id}/pay`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comptable", "tax-preparation"] }),
  });

  if (data && "forbidden" in data) {
    return (
      <div data-rh-screen className="space-y-3" id="screen-cpt-fiscal">
        <header className="border-b border-line pb-3">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Déclarations fiscales</h1>
        </header>
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-4 text-[13px] text-warning">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Réservé au Comptable Direction</p>
            <p className="text-[12.5px] text-ink-3">
              Les déclarations fiscales et sociales sont gérées exclusivement par le Comptable Direction.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const items = data?.items ?? [];

  // KPIs dérivés
  const totalDue = items
    .filter((d) => d.paymentStatus !== "PAID" && d.amount !== null)
    .reduce((s, d) => s + (d.amount ?? 0), 0);
  const overdueCount = items.filter(
    (d) => new Date(d.dueDate).getTime() < now && d.paymentStatus !== "PAID"
  ).length;
  const toDeclare = items.filter((d) => d.declarationStatus === "PENDING" || d.declarationStatus === "PREPARED").length;
  const toPay = items.filter((d) => d.paymentStatus === "PENDING" || d.paymentStatus === "SCHEDULED").length;

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-fiscal">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Déclarations fiscales et sociales
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          TVA · DIPE CNPS · IRPP · IS · DSF — préparation, déclaration et paiement.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Total à payer (30 j)" value={`${(totalDue / 1_000_000).toFixed(1)} M`} icon={<Wallet className="h-4 w-4 text-primary-600" />} />
        <Kpi
          label="En retard"
          value={String(overdueCount)}
          icon={<AlertOctagon className="h-4 w-4 text-danger" />}
          accent={overdueCount > 0 ? "danger" : undefined}
        />
        <Kpi
          label="À déclarer"
          value={String(toDeclare)}
          icon={<FileCheck className="h-4 w-4 text-warning" />}
          accent={toDeclare > 0 ? "warning" : undefined}
        />
        <Kpi
          label="À payer"
          value={String(toPay)}
          icon={<CalendarClock className="h-4 w-4 text-info" />}
        />
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Échéances 30 prochains jours
        </h2>
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune échéance dans les 30 jours.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[12.5px]">
              <thead className="bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Autorité</th>
                  <th className="px-3 py-2">Période</th>
                  <th className="px-3 py-2">Échéance</th>
                  <th className="px-3 py-2 text-right">Montant</th>
                  <th className="px-3 py-2">Déclaration</th>
                  <th className="px-3 py-2">Paiement</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => {
                  const overdue = new Date(d.dueDate).getTime() < now && d.paymentStatus !== "PAID";
                  const daysLeft = Math.ceil((new Date(d.dueDate).getTime() - now) / 86_400_000);
                  return (
                    <tr key={d.id} className={clsx("border-b border-line", overdue && "bg-danger/5")}>
                      <td className="px-3 py-2 font-medium text-ink">{TYPE_LABEL[d.type]}</td>
                      <td className="px-3 py-2 text-ink-2">{AUTHORITY_LABEL[d.authority]}</td>
                      <td className="px-3 py-2 text-ink-3 font-mono text-[11.5px]">{d.period}</td>
                      <td className={clsx("px-3 py-2", overdue ? "font-semibold text-danger" : "text-ink-3")}>
                        {new Date(d.dueDate).toLocaleDateString("fr-FR")}
                        {overdue && <span className="ml-1 text-[10.5px]">(retard {Math.abs(daysLeft)} j)</span>}
                        {!overdue && daysLeft <= 7 && (
                          <span className="ml-1 text-[10.5px] text-warning">(J-{daysLeft})</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {d.amount !== null ? d.amount.toLocaleString("fr-FR") : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", DECL_TONE[d.declarationStatus])}>
                          {DECL_LABEL[d.declarationStatus]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", PAY_TONE[d.paymentStatus])}>
                          {PAY_LABEL[d.paymentStatus]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          {d.declarationStatus === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => declare.mutate(d.id)}
                              disabled={declare.isPending}
                              className="text-[11.5px] font-medium text-primary-700 hover:underline disabled:opacity-50"
                            >
                              Déclarer
                            </button>
                          )}
                          {d.paymentStatus !== "PAID" && d.declarationStatus !== "PENDING" && (
                            <button
                              type="button"
                              onClick={() => pay.mutate(d.id)}
                              disabled={pay.isPending}
                              className="text-[11.5px] font-medium text-success hover:underline disabled:opacity-50"
                            >
                              Payer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Workflow de préparation
        </h2>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-[12.5px] text-ink-2">
          <li>Préparation comptable — pré-remplissage automatique sur la base des écritures TVA/CNPS</li>
          <li>Bouton « Déclarer » : passe le statut en SUBMITTED, génère l&apos;accusé interne</li>
          <li>Bouton « Payer » : crée automatiquement l&apos;écriture comptable D 447x / C 521 et marque l&apos;échéance PAID</li>
          <li>Soumission officielle via téléprocédure DGI/CNPS (hors plateforme pour l&apos;instant)</li>
        </ol>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: "warning" | "danger" | "success";
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-white p-3 shadow-card",
        accent === "danger" && "border-danger/30 bg-danger/5",
        accent === "warning" && "border-warning/30 bg-warning/5",
        !accent && "border-line"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        {icon}
      </div>
      <div
        className={clsx(
          "mt-1 text-2xl font-bold",
          accent === "danger" && "text-danger",
          accent === "warning" && "text-warning",
          !accent && "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}
