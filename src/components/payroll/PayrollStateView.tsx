"use client";

import { useMemo, useState } from "react";
import { Download, FileDown, Search } from "lucide-react";
import type { PayrollStateData, PayrollStateRow } from "@/lib/payroll/build-payroll-state";
import { formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

interface Props {
  state: PayrollStateData;
  pdfHref?: string;
  exportHref?: string;
}

function money(value: number): string {
  return formatFCFA(BigInt(Math.round(value)));
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function PayrollStateView({ state, pdfHref, exportHref }: Props) {
  const [search, setSearch] = useState("");
  const [site, setSite] = useState("all");
  const [category, setCategory] = useState("all");
  const [bank, setBank] = useState("all");
  const [status, setStatus] = useState("all");
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);

  const filterOptions = useMemo(() => {
    const unique = (values: Array<string | null>) =>
      Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
    return {
      sites: unique(state.rows.map((row) => row.site)),
      categories: unique(state.rows.map((row) => row.category)),
      banks: unique(state.rows.map((row) => row.bankName)),
      statuses: unique(state.rows.map((row) => row.status)),
    };
  }, [state.rows]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.rows.filter((row) => {
      const textMatch =
        !term ||
        [row.matricule, row.fullName, row.position, row.site, row.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return (
        textMatch &&
        (site === "all" || row.site === site) &&
        (category === "all" || row.category === category) &&
        (bank === "all" || row.bankName === bank) &&
        (status === "all" || row.status === status) &&
        (!anomaliesOnly || row.anomalies.length > 0)
      );
    });
  }, [anomaliesOnly, bank, category, search, site, state.rows, status]);

  const donut = state.kpis.grossPayroll
    ? Math.min(100, Math.round((state.kpis.netToPay / state.kpis.grossPayroll) * 100))
    : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Etat des salaires</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {state.tenant.name} · periode {state.cycle.period} · statut {state.cycle.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {exportHref && (
            <a
              href={exportHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300"
            >
              <Download className="h-3.5 w-3.5" /> Exporter
            </a>
          )}
          {pdfHref && (
            <a
              href={pdfHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
            >
              <FileDown className="h-3.5 w-3.5" /> Imprimer / PDF
            </a>
          )}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Masse salariale brute" value={money(state.kpis.grossPayroll)} />
        <Kpi label="Total des retenues" value={money(state.kpis.totalDeductions)} tone="warning" />
        <Kpi label="Charges patronales" value={money(state.kpis.employerCharges)} />
        <Kpi label="Net a payer" value={money(state.kpis.netToPay)} tone="primary" />
        <Kpi label="Effectif paye" value={String(state.kpis.paidHeadcount)} />
      </section>

      {state.warnings.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900">
          <div className="font-semibold">Anomalies a traiter</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {state.warnings.slice(0, 8).map((warning, index) => (
              <span key={`${warning.code}-${index}`} className="rounded-full bg-white px-2 py-1 ring-1 ring-amber-200">
                {warning.message}
                {warning.count ? ` (${warning.count})` : ""}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink">Recapitulatif general</h2>
          <div className="mt-3 grid gap-x-5 gap-y-2 text-[12.5px] sm:grid-cols-2">
            <Metric label="Total des salaires bruts" value={money(state.recap.grossSalaries)} />
            <Metric label="Total primes & indemnites" value={money(state.recap.primesAndAllowances)} />
            <Metric label="Total avantages en nature" value={money(state.recap.benefitsInKind)} />
            <Metric label="Brut imposable" value={money(state.recap.taxableGross)} />
            <Metric label="Total retenues salariales" value={money(state.recap.salaryDeductions)} />
            <Metric label="CNPS salarie" value={money(state.recap.cnpsEmployee)} />
            <Metric label="IRPP" value={money(state.recap.irpp)} />
            <Metric label="CAC" value={money(state.recap.cac)} />
            <Metric label="Avances" value={money(state.recap.advances)} />
            <Metric label="Autres retenues" value={money(state.recap.otherDeductions)} />
            <Metric label="Net a payer aux employes" value={money(state.recap.netToPay)} strong />
            <Metric label="Cout total employeur" value={money(state.recap.employerCost)} strong />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink">Synthese visuelle</h2>
          <div className="mt-4 flex items-center gap-4">
            <div
              className="grid h-28 w-28 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#A855F7 ${donut}%, #E5E7EB 0)`,
              }}
            >
              <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center">
                <span className="font-mono text-lg font-bold text-ink">{donut}%</span>
              </div>
            </div>
            <div className="space-y-2 text-[12.5px] text-ink-2">
              <Legend color="bg-primary-500" label="Net a payer / brut" value={`${donut}%`} />
              <Legend color="bg-amber-400" label="Retenues" value={money(state.kpis.totalDeductions)} />
              <Legend color="bg-slate-400" label="Charges patronales" value={money(state.kpis.employerCharges)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <DetailBlock title="Detail des retenues salariales" groups={state.retentionDetails} />
        <DetailBlock title="Detail des charges patronales" groups={state.employerChargeDetails} />
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink">Synthese fiscale & declarations</h2>
          <div className="mt-3 space-y-2 text-[12.5px]">
            <Metric label="Base imposable IRPP" value={money(state.fiscalSummary.irppTaxableBase)} />
            <Metric label="IRPP preleve" value={money(state.fiscalSummary.irppWithheld)} />
            <Metric label="CNPS salarie a declarer" value={money(state.fiscalSummary.cnpsEmployeeDeclared)} />
            <Metric label="CNPS employeur a declarer" value={money(state.fiscalSummary.cnpsEmployerDeclared)} />
            <Metric label="CAC a declarer" value={money(state.fiscalSummary.cacDeclared)} />
            <Metric label="Total organismes sociaux" value={money(state.fiscalSummary.socialOrganizationsTotal)} strong />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <header className="border-b border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Tableau detaille etat des salaires</h2>
            <label className="inline-flex items-center gap-2 text-[12px] text-ink-2">
              <input
                type="checkbox"
                checked={anomaliesOnly}
                onChange={(event) => setAnomaliesOnly(event.target.checked)}
                className="h-4 w-4 rounded border-line text-primary-500"
              />
              Anomalies seulement
            </label>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-3" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Recherche"
                className="h-9 w-full rounded-md border border-line-2 bg-white pl-8 pr-3 text-[12.5px] outline-none focus:border-primary-400"
              />
            </div>
            <Filter value={site} onChange={setSite} options={filterOptions.sites} label="Chantier" />
            <Filter value={category} onChange={setCategory} options={filterOptions.categories} label="Categorie" />
            <Filter value={bank} onChange={setBank} options={filterOptions.banks} label="Banque" />
            <Filter value={status} onChange={setStatus} options={filterOptions.statuses} label="Statut" />
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1800px] text-[12px]">
            <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-3">
              <tr>
                {[
                  "Matricule",
                  "Photo",
                  "Nom et prenoms",
                  "Poste",
                  "Chantier",
                  "Categorie",
                  "Contrat",
                  "Jours",
                  "Heures",
                  "Base",
                  "HS",
                  "Primes",
                  "Avantages",
                  "Brut",
                  "Brut imposable",
                  "Base CNPS",
                  "CNPS sal.",
                  "IRPP",
                  "CAC",
                  "Avances",
                  "Prets",
                  "Autres ret.",
                  "Total ret.",
                  "Net",
                  "CNPS emp.",
                  "Alloc. fam.",
                  "AT",
                  "CFC emp.",
                  "FNE",
                  "Charges emp.",
                  "Cout total",
                  "Banque",
                  "Compte",
                  "Statut",
                ].map((head) => (
                  <th key={head} className="px-2 py-2 text-left">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <PayrollStateTableRow key={row.payslipId} row={row} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={34} className="py-10 text-center text-sm text-ink-3">
                    Aucun bulletin ne correspond aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Detail par categories professionnelles</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead className="bg-surface-alt text-[10.5px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left">Categorie</th>
                <th className="px-3 py-2 text-right">Effectif</th>
                <th className="px-3 py-2 text-right">Brut imposable</th>
                <th className="px-3 py-2 text-right">Retenues</th>
                <th className="px-3 py-2 text-right">Charges patronales</th>
                <th className="px-3 py-2 text-right">Net a payer</th>
                <th className="px-3 py-2 text-right">Cout total</th>
              </tr>
            </thead>
            <tbody>
              {state.categories.map((item) => (
                <tr key={item.category} className="border-t border-line">
                  <td className="px-3 py-2 font-medium text-ink">{item.category}</td>
                  <td className="px-3 py-2 text-right font-mono">{item.headcount}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(item.taxableGross)}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(item.salaryDeductions)}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(item.employerCharges)}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(item.netToPay)}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(item.employerCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "primary" | "warning" }) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-4 shadow-card",
        tone === "primary" ? "border-primary-500 bg-primary-500 text-white" : "border-line bg-white text-ink"
      )}
    >
      <div className={clsx("text-[11px] uppercase tracking-wide", tone === "primary" ? "text-primary-100" : "text-ink-3")}>
        {label}
      </div>
      <div className="mt-2 font-mono text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-1.5 last:border-0">
      <span className="text-ink-3">{label}</span>
      <span className={clsx("font-mono tabular-nums text-ink", strong && "font-bold text-primary-700")}>{value}</span>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx("h-2.5 w-2.5 rounded-full", color)} />
      <span className="flex-1">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}

function DetailBlock({
  title,
  groups,
}: {
  title: string;
  groups: Record<string, Array<{ label: string; amount: number }>>;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[12.5px]">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary-700">{group}</div>
            <div className="space-y-1.5">
              {items.map((item) => (
                <Metric key={item.label} label={item.label} value={money(item.amount)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border border-line-2 bg-white px-2 text-[12.5px] outline-none focus:border-primary-400"
    >
      <option value="all">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function PayrollStateTableRow({ row }: { row: PayrollStateRow }) {
  const amounts = [
    row.baseSalary,
    row.overtimeAmount,
    row.bonuses,
    row.benefits,
    row.gross,
    row.taxableGross,
    row.cnpsBase,
    row.cnpsEmployee,
    row.irpp,
    row.cac,
    row.advances,
    row.loans,
    row.otherDeductions,
    row.totalDeductions,
    row.netToPay,
    row.cnpsEmployer,
    row.familyAllowance,
    row.accidentWork,
    row.cfcEmployer,
    row.fneEmployer,
    row.employerCharges,
    row.employerCost,
  ];

  return (
    <tr className="border-t border-line hover:bg-surface-alt">
      <td className="px-2 py-2 font-mono text-ink-2">{row.matricule}</td>
      <td className="px-2 py-2">
        {row.photoUrl ? (
          <img src={row.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-line" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
            {initials(row.fullName)}
          </span>
        )}
      </td>
      <td className="px-2 py-2 font-medium text-ink">{row.fullName}</td>
      <td className="px-2 py-2 text-ink-2">{row.position ?? "-"}</td>
      <td className="px-2 py-2 text-ink-2">{row.site ?? "-"}</td>
      <td className="px-2 py-2 text-ink-2">{row.category ?? "-"}</td>
      <td className="px-2 py-2 text-ink-2">{row.contractType ?? "-"}</td>
      <td className="px-2 py-2 text-right font-mono">{row.workedDays}</td>
      <td className="px-2 py-2 text-right font-mono">{Math.round(row.reportedHours)}</td>
      {amounts.map((value, index) => (
        <td key={index} className="px-2 py-2 text-right font-mono tabular-nums">
          {money(value)}
        </td>
      ))}
      <td className="px-2 py-2 text-ink-2">{row.bankName ?? "-"}</td>
      <td className="px-2 py-2 font-mono text-ink-2">{row.bankAccount ?? "-"}</td>
      <td className="px-2 py-2">
        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10.5px] font-semibold text-primary-700">
          {row.status}
        </span>
      </td>
    </tr>
  );
}
