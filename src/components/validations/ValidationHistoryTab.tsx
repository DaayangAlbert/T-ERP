"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { ValidationStatus, ValidationType } from "@prisma/client";
import { useValidationHistory } from "@/hooks/useValidations";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const TYPE_LABEL: Record<ValidationType, string> = {
  PAYROLL: "Paie",
  EXPENSE: "Dépense",
  PURCHASE: "Achat",
  HIRING: "Embauche",
  CONTRACT: "Marché",
  LEAVE: "Congé",
  OTHER: "Autre",
  AMENDMENT: "Avenant marché",
  SUBCONTRACTING: "Sous-traitance",
  EQUIPMENT: "Acquisition matériel",
  SPECIAL_METHOD: "Méthode spéciale",
  TECHNICAL_HANDOVER: "Mise en service",
};

export function ValidationHistoryTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const { data, isLoading } = useValidationHistory({
    page,
    q: search || undefined,
    type: type || undefined,
    status: status || undefined,
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher par titre ou référence…"
            className="h-9 w-full rounded-md border border-line bg-surface-alt pl-8 pr-3 text-[12.5px] focus:border-primary-300 focus:outline-none"
          />
        </div>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous types</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous statuts</option>
          <option value={ValidationStatus.APPROVED}>Approuvées</option>
          <option value={ValidationStatus.REJECTED}>Rejetées</option>
          <option value={ValidationStatus.EXPIRED}>Expirées</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-card">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Référence</th>
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Titre</th>
              <th className="py-2 text-right">Montant</th>
              <th className="py-2 text-left">Décidé par</th>
              <th className="py-2 text-left">Date</th>
              <th className="py-2 pr-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-3">
                  Chargement…
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-3">
                  Aucun résultat.
                </td>
              </tr>
            ) : (
              data.items.map((v) => (
                <tr key={v.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3 font-mono text-[11.5px]">{v.reference}</td>
                  <td className="py-2 text-ink-3">{TYPE_LABEL[v.type]}</td>
                  <td className="py-2">
                    <Link href={`/validations/${v.id}`} className="text-ink hover:text-primary-700">
                      {v.title}
                    </Link>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {v.amount ? formatFCFA(BigInt(v.amount)) : "—"}
                  </td>
                  <td className="py-2 text-ink-2">{v.decidedBy ?? "—"}</td>
                  <td className="py-2 text-ink-3">{v.decisionAt ? formatDate(v.decisionAt) : "—"}</td>
                  <td className="py-2 pr-3 text-center">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                        v.status === "APPROVED"
                          ? "bg-success/10 text-success"
                          : v.status === "REJECTED"
                          ? "bg-danger/10 text-danger"
                          : "bg-ink-3/10 text-ink-3"
                      )}
                    >
                      {v.status === "APPROVED" ? <Check className="h-3 w-3" /> : v.status === "REJECTED" ? <X className="h-3 w-3" /> : null}
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-ink-3">
          <span>
            {data.total} résultats · Page {data.page} / {data.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
              className="grid h-8 w-8 place-items-center rounded border border-line bg-white disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages}
              className="grid h-8 w-8 place-items-center rounded border border-line bg-white disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
