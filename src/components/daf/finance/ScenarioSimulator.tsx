"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import {
  usePreviewScenario,
  useSaveScenario,
  useScenarios,
  type ScenarioParameters,
  type ScenarioResults,
} from "@/hooks/useDafFinance";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function fmtSigned(s: string): string {
  const n = Number(s);
  return `${n > 0 ? "+" : ""}${fmt(n)}`;
}

function impactClasses(s: string): string {
  const n = Number(s);
  if (n > 0) return "text-emerald-700";
  if (n < 0) return "text-rose-700";
  return "text-ink-3";
}

const DEFAULT_PARAMS: ScenarioParameters = {
  cementPriceVar: 10,
  ironPriceVar: 0,
  fuelPriceVar: 0,
  salaryVar: 0,
  delayDays: 0,
};

function NumberSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[12px] font-medium text-ink">{label}</label>
        <span className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-ink">
          {value > 0 ? "+" : ""}
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-primary-500"
      />
      {hint && <p className="mt-1 text-[10.5px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function ScenarioSimulator() {
  const [params, setParams] = useState<ScenarioParameters>(DEFAULT_PARAMS);
  const [results, setResults] = useState<ScenarioResults | null>(null);
  const [name, setName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const preview = usePreviewScenario();
  const save = useSaveScenario();
  const { data: saved } = useScenarios();

  // Recompute on parameter change (debounced via useMemo + useEffect)
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);
  useEffect(() => {
    const handle = setTimeout(() => {
      preview.mutate(params, {
        onSuccess: (res) => setResults(res.results),
      });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const update = (k: keyof ScenarioParameters, v: number) => setParams((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,_1.1fr)_minmax(0,_1fr)]">
        {/* Hypothèses */}
        <div className="rounded-xl border border-line bg-white p-3">
          <header className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-ink">Hypothèses</h3>
              <p className="text-[11.5px] text-ink-3">Ajustez les variables, les résultats se recalculent.</p>
            </div>
            <Sparkles className="h-4 w-4 text-primary-500" />
          </header>
          <div className="grid gap-2 sm:grid-cols-2">
            <NumberSlider
              label="Prix ciment"
              value={params.cementPriceVar ?? 0}
              onChange={(v) => update("cementPriceVar", v)}
              min={-30}
              max={30}
              step={1}
              unit="%"
              hint="Volume base : 1.35 Md FCFA / an"
            />
            <NumberSlider
              label="Prix fer / acier"
              value={params.ironPriceVar ?? 0}
              onChange={(v) => update("ironPriceVar", v)}
              min={-30}
              max={30}
              step={1}
              unit="%"
              hint="Volume base : 920 M FCFA / an"
            />
            <NumberSlider
              label="Prix carburant"
              value={params.fuelPriceVar ?? 0}
              onChange={(v) => update("fuelPriceVar", v)}
              min={-30}
              max={30}
              step={1}
              unit="%"
              hint="Volume base : 540 M FCFA / an"
            />
            <NumberSlider
              label="Revalorisation salariale"
              value={params.salaryVar ?? 0}
              onChange={(v) => update("salaryVar", v)}
              min={0}
              max={20}
              step={1}
              unit="%"
              hint="Masse base : 2.18 Md FCFA / an"
            />
            <div className="sm:col-span-2">
              <NumberSlider
                label="Retard livraison Pont Mfoundi"
                value={params.delayDays ?? 0}
                onChange={(v) => update("delayDays", v)}
                min={0}
                max={120}
                step={5}
                unit="jours"
                hint="Mobilisation ~ 4.2 M / jour · CA différé ~ 6.8 M / jour"
              />
            </div>
          </div>
        </div>

        {/* Résultats */}
        <div className="rounded-xl border border-line bg-white p-3">
          <header className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-ink">Impact financier</h3>
              <p className="text-[11.5px] text-ink-3">Calcul instantané sur P&L, BFR et trésorerie.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSave(true)}
              disabled={!results}
              className="inline-flex items-center gap-1 rounded-md bg-primary-500 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Sauvegarder
            </button>
          </header>

          {!results ? (
            <div className="h-32 animate-pulse rounded-md bg-surface-alt" />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border border-line bg-surface-alt p-2.5">
                  <div className="flex items-center gap-1 text-[10.5px] uppercase text-ink-3">
                    {Number(results.plImpact) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    P&L
                  </div>
                  <div className={clsx("mt-1 font-mono text-[13px] font-bold", impactClasses(results.plImpact))}>
                    {fmtSigned(results.plImpact)}
                  </div>
                  <div className="text-[10px] text-ink-3">FCFA</div>
                </div>
                <div className="rounded-md border border-line bg-surface-alt p-2.5">
                  <div className="text-[10.5px] uppercase text-ink-3">BFR</div>
                  <div className={clsx("mt-1 font-mono text-[13px] font-bold", impactClasses(`-${results.bfrImpact}`))}>
                    +{fmt(Number(results.bfrImpact))}
                  </div>
                  <div className="text-[10px] text-ink-3">FCFA</div>
                </div>
                <div className="rounded-md border border-line bg-surface-alt p-2.5">
                  <div className="text-[10.5px] uppercase text-ink-3">Trésorerie</div>
                  <div className={clsx("mt-1 font-mono text-[13px] font-bold", impactClasses(results.treasuryImpact))}>
                    {fmtSigned(results.treasuryImpact)}
                  </div>
                  <div className="text-[10px] text-ink-3">FCFA</div>
                </div>
              </div>

              <div className="space-y-1 text-[12px]">
                {results.breakdown.map((b) => (
                  <div key={b.key} className="flex items-center justify-between rounded-md border border-line px-2 py-1.5">
                    <span className="text-ink">{b.label}</span>
                    <span className={clsx("font-mono font-semibold", impactClasses(b.impact))}>
                      {fmtSigned(b.impact)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scénarios sauvegardés */}
      {saved && saved.items.length > 0 && (
        <div className="rounded-xl border border-line bg-white p-3">
          <h3 className="text-[13px] font-semibold text-ink">Scénarios sauvegardés</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {saved.items.slice(0, 6).map((s) => (
              <div key={s.id} className="rounded-md border border-line bg-surface-alt/40 p-2.5">
                <div className="text-[12.5px] font-semibold text-ink">{s.name}</div>
                {s.description && <div className="text-[11px] text-ink-3">{s.description}</div>}
                <div className="mt-1 text-[11px] text-ink-3">P&L</div>
                <div className={clsx("font-mono text-[12px] font-bold", impactClasses(s.results.plImpact))}>
                  {fmtSigned(s.results.plImpact)} FCFA
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSave && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={() => setShowSave(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-sm font-semibold text-ink">Sauvegarder le scénario</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Hausse ciment +10% sur S2"
              className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-500 focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSave(false)}
                className="h-8 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!name.trim() || save.isPending}
                onClick={() => {
                  save.mutate(
                    { name: name.trim(), parameters: params },
                    {
                      onSuccess: () => {
                        setShowSave(false);
                        setName("");
                      },
                    }
                  );
                }}
                className="h-8 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {save.isPending ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky bottom recap on mobile */}
      {results && (
        <div className="sticky bottom-2 z-30 rounded-xl border border-line bg-white p-2.5 shadow-lg lg:hidden">
          <div className="flex items-center justify-between gap-2 text-[11.5px]">
            <div>
              <div className="text-ink-3">P&L</div>
              <div className={clsx("font-mono text-[12.5px] font-bold", impactClasses(results.plImpact))}>
                {fmtSigned(results.plImpact)}
              </div>
            </div>
            <div>
              <div className="text-ink-3">BFR</div>
              <div className="font-mono text-[12.5px] font-bold text-rose-700">
                +{fmt(Number(results.bfrImpact))}
              </div>
            </div>
            <div>
              <div className="text-ink-3">Tréso</div>
              <div className={clsx("font-mono text-[12.5px] font-bold", impactClasses(results.treasuryImpact))}>
                {fmtSigned(results.treasuryImpact)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
