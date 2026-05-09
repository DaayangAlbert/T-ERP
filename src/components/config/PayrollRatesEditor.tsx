"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useUpdateConfigSection } from "@/hooks/useConfig";
import type { PayrollRatesSettings } from "@/lib/tenant-settings";

interface Props {
  initial: PayrollRatesSettings;
}

export function PayrollRatesEditor({ initial }: Props) {
  const [data, setData] = useState<PayrollRatesSettings>(initial);
  const [saved, setSaved] = useState(false);
  const update = useUpdateConfigSection();

  const submit = async () => {
    await update.mutateAsync({ section: "paie", payload: data });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ic = "w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-mono focus:border-primary-300 focus:outline-none";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Date d'effet
          </h2>
          <input
            type="date"
            value={data.effectiveDate}
            onChange={(e) => setData((d) => ({ ...d, effectiveDate: e.target.value }))}
            className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[12.5px]"
          />
        </div>
        <p className="text-[11.5px] text-ink-3">
          Les modifications s'appliqueront aux nouveaux bulletins à partir de cette date.
          Les paramètres précédents sont historisés dans l'audit log.
        </p>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Tranches IRPP
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Tranche min</th>
                <th className="py-2 text-left">Tranche max</th>
                <th className="py-2 pr-3 text-right">Taux %</th>
              </tr>
            </thead>
            <tbody>
              {data.irppBrackets.map((b, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5 pl-3">
                    <input
                      type="number"
                      value={b.min}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          irppBrackets: d.irppBrackets.map((x, idx) => (idx === i ? { ...x, min: Number(e.target.value) } : x)),
                        }))
                      }
                      className={ic}
                    />
                  </td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={b.max ?? ""}
                      placeholder="∞"
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          irppBrackets: d.irppBrackets.map((x, idx) =>
                            idx === i ? { ...x, max: e.target.value ? Number(e.target.value) : null } : x
                          ),
                        }))
                      }
                      className={ic}
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="number"
                      step="0.1"
                      value={b.rate}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          irppBrackets: d.irppBrackets.map((x, idx) => (idx === i ? { ...x, rate: Number(e.target.value) } : x)),
                        }))
                      }
                      className={ic + " text-right"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Cotisations sociales et fiscales (%)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Rate label="CNPS salarié" value={data.cnpsEmployee} onChange={(v) => setData((d) => ({ ...d, cnpsEmployee: v }))} />
          <Rate label="CNPS patronal" value={data.cnpsEmployer} onChange={(v) => setData((d) => ({ ...d, cnpsEmployer: v }))} />
          <Rate label="CFC salarié" value={data.cfcEmployee} onChange={(v) => setData((d) => ({ ...d, cfcEmployee: v }))} />
          <Rate label="CFC patronal" value={data.cfcEmployer} onChange={(v) => setData((d) => ({ ...d, cfcEmployer: v }))} />
          <Rate label="FNE" value={data.fne} onChange={(v) => setData((d) => ({ ...d, fne: v }))} />
          <Rate label="Taxe communale" value={data.tcCommunal} onChange={(v) => setData((d) => ({ ...d, tcCommunal: v }))} />
          <Rate label="CAC" value={data.cacRate} onChange={(v) => setData((d) => ({ ...d, cacRate: v }))} />
          <Rate label="CFS" value={data.cfsRate} onChange={(v) => setData((d) => ({ ...d, cfsRate: v }))} />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Périodicité paie
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          {(["MONTHLY", "BIWEEKLY"] as const).map((p) => (
            <label
              key={p}
              className={
                "cursor-pointer rounded-md border p-3 text-center text-[12.5px] " +
                (p === data.payPeriodicity
                  ? "border-primary-500 bg-primary-50 text-primary-800 font-semibold"
                  : "border-line bg-white text-ink-3 hover:border-primary-300")
              }
            >
              <input type="radio" checked={p === data.payPeriodicity} onChange={() => setData((d) => ({ ...d, payPeriodicity: p }))} className="sr-only" />
              {p === "MONTHLY" ? "Mensuelle" : "Quinzaine (journaliers)"}
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-[12.5px] text-success">✓ Enregistré</span>}
        <button
          type="submit"
          disabled={update.isPending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" /> {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function Rate({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold text-ink-2">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-right text-[13px] font-mono focus:border-primary-300 focus:outline-none"
        />
        <span className="text-[11px] text-ink-3">%</span>
      </div>
    </label>
  );
}
