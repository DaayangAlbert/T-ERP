"use client";

import { useState } from "react";
import { ShieldCheck, AlertOctagon, Plus, FlaskConical, Camera, CheckCircle2, X, Save } from "lucide-react";
import { clsx } from "clsx";
import type { QcCategory, QcType } from "@prisma/client";
import { useCreateQualityControl, useLabTests, useQualityControls, type QcCheckpoint } from "@/hooks/useCdtQuality";

const CATEGORY_LABEL: Record<QcCategory, string> = {
  CONCRETE: "Béton",
  REBAR: "Ferraillage",
  FORMWORK: "Coffrage",
  GEOMETRY: "Géométrie",
  EARTHWORKS: "Terrassement",
  WATERPROOFING: "Étanchéité",
  ELECTRICAL: "Électricité",
  OTHER: "Autre",
};

const TYPE_LABEL: Record<QcType, string> = {
  SELF_CONTROL: "Auto-contrôle",
  LAB_TEST: "Test labo",
  EXTERNAL_INSPECTION: "Inspection externe",
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CdtQualitePage() {
  const { data, isLoading } = useQualityControls();
  const { data: labs } = useLabTests();
  const [showWizard, setShowWizard] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />)}
        </div>
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  const todayControls = 3; // narratif proto

  return (
    <div className="space-y-3 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Contrôles qualité</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">Auto-contrôles internes · tests labo · non-conformités.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="inline-flex h-12 items-center gap-2 rounded-md bg-primary-500 px-4 text-[13px] font-semibold text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" /> Nouvel auto-contrôle
        </button>
      </header>

      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Contrôles ce mois" value={String(data.kpis.monthlyCount)} icon={<ShieldCheck className="h-4 w-4 text-primary-600" />} />
        <Kpi label="NC ouverte" value={String(data.kpis.openNc)} icon={<AlertOctagon className="h-4 w-4 text-rose-600" />} alert={data.kpis.openNc > 0} />
        <Kpi label="Tests labo en cours" value={String(labs?.pending ?? 5)} icon={<FlaskConical className="h-4 w-4 text-amber-600" />} />
        <Kpi label="Conformité YTD" value={`${data.kpis.conformRate}%`} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
      </div>

      {/* Contrôles à faire aujourd'hui */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <h2 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-900">
          <FlaskConical className="h-3.5 w-3.5" /> ⏳ {todayControls} contrôles à faire aujourd&apos;hui
        </h2>
        <ul className="mt-2 space-y-1.5">
          {[
            { icon: "🧪", label: "Slump test béton culée Nord", category: "CONCRETE" as QcCategory },
            { icon: "🧪", label: "Contrôle aciers HA tablier Z3", category: "REBAR" as QcCategory },
            { icon: "📐", label: "Vérification géométrie pile 3", category: "GEOMETRY" as QcCategory },
          ].map((c) => (
            <li key={c.label} className="flex items-center gap-3 rounded-md bg-white p-2.5">
              <span className="text-xl">{c.icon}</span>
              <span className="flex-1 truncate text-[13px] text-ink">{c.label}</span>
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="inline-flex h-10 items-center rounded-md bg-amber-600 px-3 text-[12px] font-semibold text-white hover:bg-amber-700"
              >
                Saisir
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* NC ouverte */}
      {data.nonConformities.length > 0 && (
        <section>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-rose-700">Non-conformité ouverte</h2>
          {data.nonConformities.map((nc) => (
            <article key={nc.id} className="rounded-xl border-l-[4px] border-l-rose-500 border border-rose-200 bg-rose-50 p-3">
              <header className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[11px] text-rose-700">{nc.reference}</div>
                  <h3 className="text-[14px] font-bold text-ink">Recouvrement HA insuffisant</h3>
                  <p className="text-[11.5px] text-ink-3">{nc.phase} · {nc.location}</p>
                </div>
                <AlertOctagon className="h-5 w-5 flex-shrink-0 text-rose-600" />
              </header>
              {nc.notes && <p className="mt-2 text-[12px] italic text-rose-700">« {nc.notes} »</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="inline-flex h-12 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12.5px] font-semibold text-white hover:bg-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Marquer levée
                </button>
                <button type="button" className="inline-flex h-12 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt">
                  <Camera className="h-4 w-4" /> Photos avant/après
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Tests labo récents */}
      {labs && labs.items.length > 0 && (
        <section>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Tests labo récents</h2>
          <ul className="space-y-2">
            {labs.items.slice(0, 5).map((t) => (
              <li key={t.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10.5px] text-ink-3">{t.sampleRef}</div>
                    <div className="text-[13px] font-semibold text-ink">{t.labName} · {t.testType}</div>
                    <div className="text-[11px] text-ink-3">Échantillon {fmtDate(t.samplingDate)} · attendu {fmtDate(t.expectedDate)}</div>
                  </div>
                  <span className={clsx(
                    "rounded px-1.5 py-0.5 text-[10.5px] font-semibold flex-shrink-0",
                    t.conform === true ? "bg-emerald-100 text-emerald-800" : t.conform === false ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                  )}>
                    {t.conform === true ? "Conforme" : t.conform === false ? "Non conforme" : "En attente"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Historique contrôles récents */}
      {data.items.length > 0 && (
        <section>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Historique récent</h2>
          <ul className="space-y-2">
            {data.items.slice(0, 5).map((qc) => (
              <li key={qc.id} className={clsx("rounded-xl border bg-white p-3", qc.overallConform ? "border-line" : "border-rose-200 bg-rose-50")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10.5px] text-ink-3">{qc.reference}</div>
                    <div className="text-[13px] font-semibold text-ink">{CATEGORY_LABEL[qc.category]} — {qc.location ?? "—"}</div>
                    <div className="text-[11px] text-ink-3">{TYPE_LABEL[qc.type]} · {fmtDate(qc.performedAt)}</div>
                  </div>
                  <span className={clsx(
                    "rounded px-1.5 py-0.5 text-[10.5px] font-semibold flex-shrink-0",
                    qc.overallConform ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  )}>
                    {qc.overallConform ? "Conforme" : "NC"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showWizard && <QcWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}

function Kpi({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div className={clsx("rounded-xl border bg-white p-3 shadow-card min-w-0", alert ? "border-rose-200 bg-rose-50" : "border-line")}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className={clsx("mt-1 font-mono text-[18px] font-bold sm:text-[20px]", alert ? "text-rose-700" : "text-ink")}>{value}</div>
    </div>
  );
}

function QcWizard({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<QcCategory>("REBAR");
  const [phase, setPhase] = useState("Gros œuvre");
  const [location, setLocation] = useState("");
  const [checkpoints, setCheckpoints] = useState<QcCheckpoint[]>([
    { label: "", expected: "", measured: "", conform: true },
  ]);
  const create = useCreateQualityControl();

  const addCp = () => setCheckpoints((p) => [...p, { label: "", expected: "", measured: "", conform: true }]);
  const updateCp = (i: number, patch: Partial<QcCheckpoint>) => setCheckpoints((p) => p.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeCp = (i: number) => setCheckpoints((p) => p.filter((_, idx) => idx !== i));

  const submit = () => {
    const valid = checkpoints.filter((c) => c.label.trim());
    if (valid.length === 0) return;
    create.mutate(
      {
        type: "SELF_CONTROL",
        category,
        phase: phase.trim() || undefined,
        location: location.trim() || undefined,
        checkpoints: valid,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Nouvel auto-contrôle</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded text-ink-3 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3">
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Catégorie</div>
            <select value={category} onChange={(e) => setCategory(e.target.value as QcCategory)} className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]">
              {(Object.keys(CATEGORY_LABEL) as QcCategory[]).map((k) => (
                <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Phase</div>
              <input type="text" value={phase} onChange={(e) => setPhase(e.target.value)} className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]" />
            </label>
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Localisation</div>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ex. Pile 3" className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]" />
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Points de contrôle</div>
              <button type="button" onClick={addCp} className="inline-flex h-9 items-center gap-1 rounded-md border border-line bg-white px-2.5 text-[11.5px] font-medium text-primary-700 hover:bg-surface-alt">
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
            <ul className="space-y-2">
              {checkpoints.map((c, i) => (
                <li key={i} className={clsx("rounded-md border p-2.5", c.conform ? "border-line bg-white" : "border-rose-200 bg-rose-50")}>
                  <input
                    type="text"
                    value={c.label}
                    onChange={(e) => updateCp(i, { label: e.target.value })}
                    placeholder="Libellé du point (ex. Diamètre HA conforme plans)"
                    className="h-11 w-full rounded-md border border-line bg-white px-2.5 text-[13.5px]"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input type="text" value={c.expected} onChange={(e) => updateCp(i, { expected: e.target.value })} placeholder="Attendu" className="h-11 rounded-md border border-line bg-white px-2.5 text-[13px]" />
                    <input type="text" value={c.measured} onChange={(e) => updateCp(i, { measured: e.target.value })} placeholder="Mesuré" className="h-11 rounded-md border border-line bg-white px-2.5 text-[13px]" />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-[12px]">
                      <input type="checkbox" checked={c.conform} onChange={(e) => updateCp(i, { conform: e.target.checked })} className="h-5 w-5 accent-emerald-600" />
                      Conforme
                    </label>
                    {checkpoints.length > 1 && (
                      <button type="button" onClick={() => removeCp(i)} className="inline-flex h-9 items-center gap-1 rounded text-[11.5px] text-rose-600 hover:bg-rose-50 px-2">
                        <X className="h-3.5 w-3.5" /> Retirer
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            disabled={create.isPending || !checkpoints.some((c) => c.label.trim())}
            onClick={submit}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-[14px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {create.isPending ? "Enregistrement..." : "Enregistrer le contrôle"}
          </button>
          <p className="text-[11px] text-ink-3">
            Si un point est non conforme, une NC est ouverte automatiquement.
          </p>
        </div>
      </div>
    </div>
  );
}
