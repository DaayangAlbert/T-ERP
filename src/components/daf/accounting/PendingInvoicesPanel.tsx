"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type { InvoiceStatus } from "@prisma/client";
import { usePendingSupplierInvoices, type PendingInvoiceItem } from "@/hooks/useDafAccounting";
import { useTenantHref } from "@/hooks/useTenantHref";
import { formatDate, formatFCFA } from "@/lib/format";

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  RECEIVED: "Reçue",
  PENDING_3WAY_MATCH: "3-way matching",
  ACCOUNTED: "Comptabilisée",
  PENDING_PAYMENT: "À payer",
  PAID: "Payée",
  DISPUTED: "Litige",
  REJECTED: "Rejetée",
};

const STATUS_TONE: Partial<Record<InvoiceStatus, string>> = {
  RECEIVED: "bg-info/10 text-info",
  PENDING_3WAY_MATCH: "bg-warning/10 text-warning",
  DISPUTED: "bg-danger/10 text-danger",
};

export function PendingInvoicesPanel() {
  const { data, isLoading } = usePendingSupplierInvoices();
  const tenantHref = useTenantHref();
  const factHref = tenantHref("/comptable/factures-frns");

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const nothing = data.summary.total === 0 && data.summary.disputedCount === 0;
  if (nothing) {
    return (
      <section className="rounded-xl border border-success/30 bg-success/5 p-4 text-[13px] text-success">
        ✓ Toutes les factures fournisseurs reçues sont comptabilisées.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Factures fournisseurs en attente — {data.summary.total} à comptabiliser
        </h3>
        <Link
          href={factHref}
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary-700 hover:underline"
          aria-label="Voir toutes les factures fournisseurs"
        >
          Page comptable <ChevronRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="mb-3 grid gap-2 grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Montant total"
          value={formatFCFA(BigInt(data.summary.totalAmount))}
          tone="primary"
        />
        <MiniStat
          label="Reçues"
          value={String(data.summary.byStatus.RECEIVED)}
          tone="info"
        />
        <MiniStat
          label="3-way matching"
          value={String(data.summary.byStatus.PENDING_3WAY_MATCH)}
          tone="warning"
        />
        <MiniStat
          label="En litige"
          value={String(data.summary.disputedCount)}
          sub={data.summary.disputedCount > 0 ? formatFCFA(BigInt(data.summary.disputedAmount)) : undefined}
          tone={data.summary.disputedCount > 0 ? "danger" : "muted"}
        />
      </div>

      {data.summary.overdueCount > 0 && (
        <div className="mb-3 inline-flex items-center gap-1 rounded bg-danger/10 px-2 py-1 text-[11.5px] font-semibold text-danger">
          <AlertTriangle className="h-3 w-3" /> {data.summary.overdueCount} dont l&apos;échéance est dépassée
        </div>
      )}

      <p className="mb-3 text-[11.5px] text-ink-3">
        À provisionner avant clôture pour respecter l&apos;image fidèle (charges à payer).
        Même périmètre que l&apos;onglet « À comptabiliser » de la page comptable.
      </p>

      <InvoicesTable items={data.items} emptyLabel="Aucune facture à comptabiliser." />

      {data.summary.disputedCount > 0 && (
        <>
          <h4 className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wide text-danger">
            Factures en litige ({data.summary.disputedCount})
          </h4>
          <InvoicesTable items={data.disputed} emptyLabel="" />
        </>
      )}
    </section>
  );
}

function InvoicesTable({ items, emptyLabel }: { items: PendingInvoiceItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return emptyLabel ? <p className="text-[12px] text-ink-3">{emptyLabel}</p> : null;
  }
  return (
    <>
      <div className="hidden overflow-x-auto rounded-md border border-line md:block">
        <table className="w-full min-w-[640px] text-[12px]">
          <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">N° Facture</th>
              <th className="py-2 text-left">Fournisseur</th>
              <th className="py-2 text-left">Date</th>
              <th className="py-2 text-right">Montant TTC</th>
              <th className="py-2 text-left">Statut</th>
              <th className="py-2 pr-3 text-right">Attente</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 10).map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="py-1.5 pl-3 font-mono text-[11px]">{i.invoiceNumber}</td>
                <td className="py-1.5 text-ink">{i.supplier}</td>
                <td className="py-1.5 text-ink-3">{formatDate(i.invoiceDate)}</td>
                <td className="py-1.5 text-right font-mono font-semibold tabular-nums">
                  {formatFCFA(BigInt(i.amountTtc))}
                </td>
                <td className="py-1.5">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_TONE[i.status] ?? "bg-ink-3/10 text-ink-3")}>
                    {STATUS_LABEL[i.status]}
                  </span>
                  {i.disputeReason && (
                    <span className="ml-2 text-[10.5px] italic text-ink-3">{i.disputeReason}</span>
                  )}
                </td>
                <td className="py-1.5 pr-3 text-right text-[11px] text-ink-3">{i.daysWaiting} j</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {items.slice(0, 6).map((i) => (
          <li key={i.id} className="rounded-md border border-line bg-surface-alt/40 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[10.5px] text-ink-3">{i.invoiceNumber}</div>
                <div className="text-[13px] font-semibold text-ink">{i.supplier}</div>
                <div className="text-[11px] text-ink-3">{i.daysWaiting} j d&apos;attente</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[13px] font-bold">{formatFCFA(BigInt(i.amountTtc))}</div>
                <span className={clsx("mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold", STATUS_TONE[i.status] ?? "bg-ink-3/10 text-ink-3")}>
                  {STATUS_LABEL[i.status]}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {items.length > 10 && (
        <p className="mt-2 text-[11px] text-ink-3">
          + {items.length - 10} autre{items.length - 10 > 1 ? "s" : ""} facture{items.length - 10 > 1 ? "s" : ""}
        </p>
      )}
    </>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "primary" | "info" | "warning" | "danger" | "muted";
}) {
  const cls = {
    primary: "border-primary-200 bg-primary-50 text-primary-800",
    info: "border-info/30 bg-info/5 text-info",
    warning: "border-warning/30 bg-warning/5 text-warning",
    danger: "border-danger/30 bg-danger/5 text-danger",
    muted: "border-line bg-surface-alt/40 text-ink-3",
  }[tone];
  return (
    <div className={clsx("rounded-md border px-2.5 py-2", cls)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-[14px] font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[10.5px] opacity-80">{sub}</div>}
    </div>
  );
}
