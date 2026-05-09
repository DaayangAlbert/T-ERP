"use client";

import Link from "next/link";
import { useState } from "react";
import { Calendar, Clock, Download, FileText } from "lucide-react";
import { useMyPayslips, type PayslipItem } from "@/hooks/usePayslips";
import { useProfile } from "@/hooks/useProfile";
import { formatDate, formatFCFA } from "@/lib/format";
import { PayslipStatus } from "@prisma/client";
import { clsx } from "clsx";

const STATUS_LABEL: Record<PayslipStatus, string> = {
  DRAFT: "Brouillon",
  CALCULATED: "Calculé",
  VALIDATED_N1: "Validé N1",
  VALIDATED_N2: "Validé N2",
  VALIDATED_N3: "Validé N3",
  PAID: "Payé",
  CANCELLED: "Annulé",
};

const STATUS_TONE: Record<PayslipStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  CALCULATED: "bg-amber-100 text-amber-700",
  VALIDATED_N1: "bg-amber-100 text-amber-700",
  VALIDATED_N2: "bg-amber-100 text-amber-700",
  VALIDATED_N3: "bg-primary-100 text-primary-700",
  PAID: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export default function PaiePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyPayslips(page);
  const { data: profile } = useProfile();

  const latest: PayslipItem | undefined = data?.items[0];

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Ma paie</h1>
          {profile && (
            <p className="mt-1 text-[12.5px] text-ink-3">
              {profile.firstName} {profile.lastName}
              {profile.employeeId && ` · ${profile.employeeId}`}
              {profile.category && ` · ${profile.category}`}
              {profile.contractType && ` · ${profile.contractType}`}
            </p>
          )}
        </div>
      </header>

      {latest && (
        <section
          className="rounded-xl border border-primary-200 p-5"
          style={{ background: "linear-gradient(135deg,#FAF5FF 0%,#E9D5FF 100%)" }}
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-primary-700">
                Dernier bulletin
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink capitalize">
                {formatDate(latest.period, "MMMM yyyy")}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-3">
                Période payée · {latest.paymentMode} le {formatDate(latest.paymentDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={clsx(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  STATUS_TONE[latest.status]
                )}
              >
                {STATUS_LABEL[latest.status]}
              </span>
              <Link
                href={`/paie/bulletin/${latest.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300"
              >
                <FileText className="h-3.5 w-3.5" /> Bulletin officiel
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Brut imposable" value={formatFCFA(BigInt(latest.grossAmount))} />
            <Tile
              label="Cotisations sal."
              value={`- ${formatFCFA(BigInt(latest.socialCharges) + BigInt(latest.fiscalCharges))}`}
              tone="danger"
            />
            <Tile label="Avantages nature" value="—" tone="muted" />
            <Tile label="Net à payer" value={formatFCFA(BigInt(latest.netAmount))} tone="primary" />
          </div>
        </section>
      )}

      {data && (
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Net moyen"
            value={formatFCFA(BigInt(data.summary.avgNet))}
            meta="Sur bulletins payés"
            icon={<Clock className="h-3.5 w-3.5" />}
          />
          <Kpi
            label="Cumul brut YTD"
            value={formatFCFA(BigInt(data.summary.ytdGross))}
            meta="Année en cours"
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
          <Kpi label="Solde congés" value="22 jours" meta="Restants 2026" />
          <Kpi label="Heures supp." value="—" meta="À venir J5+" />
        </div>
      )}

      <div className="mt-4 rounded-xl border border-line bg-white shadow-card">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Historique des bulletins</h2>
          <span className="text-[11.5px] text-ink-3">
            {data?.total ?? 0} bulletin{(data?.total ?? 0) > 1 ? "s" : ""}
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2.5 pl-4 text-left">Période</th>
                <th className="py-2.5 text-left">Paiement</th>
                <th className="py-2.5 text-right">Brut</th>
                <th className="py-2.5 text-right">Cotisations</th>
                <th className="py-2.5 text-right">Net</th>
                <th className="py-2.5 text-left">Statut</th>
                <th className="py-2.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-line">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="py-3 pl-4 last:pr-4">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-surface-alt" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && (data?.items.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-ink-3">
                    Aucun bulletin pour l'instant.
                  </td>
                </tr>
              )}
              {data?.items.map((p, i) => (
                <tr
                  key={p.id}
                  className={clsx(
                    "transition hover:bg-surface-alt",
                    i < data.items.length - 1 && "border-b border-line"
                  )}
                >
                  <td className="py-2.5 pl-4 capitalize font-medium text-ink">
                    {formatDate(p.period, "MMMM yyyy")}
                  </td>
                  <td className="py-2.5 text-ink-2">
                    {formatDate(p.paymentDate)} <span className="text-ink-3">· {p.paymentMode}</span>
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-ink-2">
                    {formatFCFA(BigInt(p.grossAmount))}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-danger">
                    - {formatFCFA(BigInt(p.socialCharges) + BigInt(p.fiscalCharges))}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-ink">
                    {formatFCFA(BigInt(p.netAmount))}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                        STATUS_TONE[p.status]
                      )}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <Link
                      href={`/paie/bulletin/${p.id}`}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary-700 hover:underline"
                    >
                      Voir bulletin
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[12px] text-ink-3">
            <span>Page {page} / {data.pages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-line bg-white px-2 py-1 hover:border-primary-300 disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-line bg-white px-2 py-1 hover:border-primary-300 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      <section className="mt-4 grid gap-3.5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink">Conformité fiscale &amp; sociale</h2>
          <ul className="mt-3 divide-y divide-line text-[12.5px]">
            <li className="flex items-center justify-between py-2">
              <span className="text-ink-2">CNPS</span>
              <span className="font-mono tabular-nums text-success">À jour</span>
            </li>
            <li className="flex items-center justify-between py-2">
              <span className="text-ink-2">IRPP</span>
              <span className="font-mono tabular-nums text-success">À jour</span>
            </li>
            <li className="flex items-center justify-between py-2">
              <span className="text-ink-2">DIPE mensuelle</span>
              <span className="font-mono tabular-nums text-warning">Échéance le 15</span>
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-4 text-[12.5px] text-primary-800">
          La décomposition graphique 12 mois et l'export Excel des états de salaire arrivent dans la
          session "RH &amp; Paie" du roadmap.
        </div>
      </section>
    </>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "primary" | "muted";
}) {
  const valueClass =
    tone === "danger"
      ? "text-danger"
      : tone === "primary"
        ? "text-white"
        : "text-ink";
  const bg = tone === "primary" ? "bg-primary-500" : "bg-white";

  return (
    <div className={`rounded-lg ${bg} p-3 shadow-sm`}>
      <div className={`text-[11px] uppercase tracking-wide ${tone === "primary" ? "text-primary-100" : "text-ink-3"}`}>
        {label}
      </div>
      <div className={`mt-1 font-mono text-lg font-bold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function Kpi({
  label,
  value,
  meta,
  icon,
}: {
  label: string;
  value: string;
  meta?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-mono text-[18px] font-semibold tabular-nums text-ink">{value}</div>
      {meta && <div className="mt-1 text-[11.5px] text-ink-3">{meta}</div>}
    </div>
  );
}
