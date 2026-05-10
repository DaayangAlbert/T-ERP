"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader } from "lucide-react";
import { clsx } from "clsx";
import { useSaveInput, type PayrollInputRow } from "@/hooks/useRhPayrollInput";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

interface RowProps {
  cycleId: string;
  category: string;
  row: PayrollInputRow;
}

function EditableNumber({
  value,
  onChange,
  min = 0,
  max = 999,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      className={clsx(
        "h-9 rounded-md border border-line bg-white px-1.5 text-right font-mono text-[12.5px] focus:border-primary-500 focus:outline-none",
        className
      )}
    />
  );
}

function PayrollRow({ cycleId, category, row }: RowProps) {
  const [days, setDays] = useState(row.daysWorked);
  const [overtime, setOvertime] = useState(row.overtimeHours);
  const [bonus, setBonus] = useState(row.primaryBonus);
  const [saving, setSaving] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const save = useSaveInput(cycleId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recompute total
  const totalGross = Math.round(days * row.dailyRate + overtime * (row.dailyRate / 8) * 1.25 + bonus);

  // Auto-save 800ms after last change
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (days === row.daysWorked && overtime === row.overtimeHours && bonus === row.primaryBonus) return;
    timer.current = setTimeout(() => {
      setSaving(true);
      save.mutate(
        { employeeKey: row.employeeKey, daysWorked: days, overtimeHours: overtime, primaryBonus: bonus, category },
        {
          onSettled: () => {
            setSaving(false);
            setSavedJustNow(true);
            setTimeout(() => setSavedJustNow(false), 1500);
          },
        }
      );
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, overtime, bonus]);

  return (
    <>
      {/* Desktop : ligne tableau */}
      <tr className="hidden md:table-row hover:bg-surface-alt/40">
        <td className="px-3 py-2 font-mono text-[11.5px] text-ink-3">{row.matricule}</td>
        <td className="px-3 py-2">
          <div className="font-medium text-ink truncate">{row.firstName} {row.lastName}</div>
          <div className="text-[11px] text-ink-3">{row.site}</div>
        </td>
        <td className="px-3 py-2">
          <EditableNumber value={days} onChange={setDays} max={31} className="w-[68px]" />
        </td>
        <td className="px-3 py-2 text-right font-mono text-[12px] text-ink-3">{fmt(row.dailyRate)}</td>
        <td className="px-3 py-2">
          <EditableNumber value={overtime} onChange={setOvertime} max={120} className="w-[68px]" />
        </td>
        <td className="px-3 py-2">
          <EditableNumber value={bonus} onChange={setBonus} max={9_999_999} className="w-[100px]" />
        </td>
        <td className="px-3 py-2 text-right font-mono text-[13.5px] font-bold text-ink">{fmt(totalGross)}</td>
        <td className="px-3 py-2 w-12 text-center">
          {saving ? (
            <Loader className="mx-auto h-3.5 w-3.5 animate-spin text-primary-500" />
          ) : savedJustNow || row.savedAt ? (
            <Check className="mx-auto h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <span className="text-[10px] text-ink-3">—</span>
          )}
        </td>
      </tr>

      {/* Mobile : card */}
      <tr className="md:hidden">
        <td colSpan={8} className="px-0 py-1.5">
          <div className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10.5px] text-ink-3 truncate">{row.matricule}</div>
                <div className="text-[14px] font-bold text-ink">{row.firstName} {row.lastName}</div>
                <div className="text-[11.5px] text-ink-3 truncate">{row.site}</div>
              </div>
              {saving ? (
                <Loader className="h-3.5 w-3.5 animate-spin text-primary-500 flex-shrink-0" />
              ) : savedJustNow || row.savedAt ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
              ) : null}
            </div>
            <div className="my-2 border-t border-line" />
            <div className="space-y-2">
              <Field label="Jours travaillés">
                <EditableNumber value={days} onChange={setDays} max={31} className="w-full" />
              </Field>
              <div className="text-[11.5px] text-ink-3">
                Tarif/jour : <span className="font-mono text-ink">{fmt(row.dailyRate)} FCFA</span>
              </div>
              <Field label="Heures supplémentaires">
                <EditableNumber value={overtime} onChange={setOvertime} max={120} className="w-full" />
              </Field>
              <Field label="Prime mensuelle">
                <EditableNumber value={bonus} onChange={setBonus} max={9_999_999} className="w-full" />
              </Field>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
              <span className="text-[11.5px] text-ink-3">Total brut</span>
              <span className="font-mono text-[15px] font-bold text-ink">
                {fmt(totalGross)} FCFA {(savedJustNow || row.savedAt) && <Check className="ml-1 inline h-3.5 w-3.5 text-emerald-600" />}
              </span>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10.5px] uppercase tracking-wide text-ink-3">{label}</div>
      {children}
    </label>
  );
}

interface Props {
  cycleId: string;
  category: string;
  rows: PayrollInputRow[];
}

export function PayrollInputTable({ cycleId, category, rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
        Aucun employé à saisir pour cette catégorie.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl md:border md:border-line md:bg-white">
      <table className="w-full text-[13px]">
        <thead className="hidden bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3 md:table-header-group">
          <tr>
            <th className="px-3 py-2 text-left">Matricule</th>
            <th className="px-3 py-2 text-left">Identité</th>
            <th className="px-3 py-2 text-left">Jours</th>
            <th className="px-3 py-2 text-right">Tarif/jour</th>
            <th className="px-3 py-2 text-left">H. supp</th>
            <th className="px-3 py-2 text-left">Prime</th>
            <th className="px-3 py-2 text-right">Total brut</th>
            <th className="px-3 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <PayrollRow key={r.employeeKey} cycleId={cycleId} category={category} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
