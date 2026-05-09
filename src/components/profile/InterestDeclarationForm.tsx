"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useInterests, useSubmitInterests, type Mandate, type Shareholding, type Conflict } from "@/hooks/useDgProfile";
import { formatDate } from "@/lib/format";

export function InterestDeclarationForm() {
  const { data, isLoading } = useInterests();
  const submit = useSubmitInterests();
  const currentYear = new Date().getFullYear();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [shareholdings, setShareholdings] = useState<Shareholding[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && data.items.length > 0) {
      const latest = data.items[0];
      setMandates(latest.mandates);
      setShareholdings(latest.shareholdings);
      setConflicts(latest.conflictsOfInterest);
    }
  }, [data]);

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const submitAll = async () => {
    await submit.mutateAsync({ year: currentYear, mandates, shareholdings, conflictsOfInterest: conflicts });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      {data?.renewalDue && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-[13px] text-warning">
          <AlertTriangle className="mr-1 inline h-4 w-4" />
          Mise à jour annuelle requise — échéance{" "}
          {data.renewalDeadline ? formatDate(data.renewalDeadline) : "—"}.
        </div>
      )}

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Mandats externes
          </h3>
          <button
            type="button"
            onClick={() => setMandates((m) => [...m, { entity: "", role: "", since: new Date().toISOString().slice(0, 10), end: null }])}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-line-2 bg-white px-2.5 text-[11.5px] text-ink-2"
          >
            <Plus className="h-3 w-3" /> Ajouter
          </button>
        </div>
        <ul className="space-y-2">
          {mandates.length === 0 ? (
            <li className="text-[12.5px] text-ink-3">Aucun mandat externe déclaré.</li>
          ) : (
            mandates.map((m, i) => (
              <li key={i} className="grid gap-2 rounded-md border border-line bg-surface-alt p-2 sm:grid-cols-[2fr_2fr_1fr_auto]">
                <input
                  value={m.entity}
                  onChange={(e) => setMandates((s) => s.map((x, idx) => (idx === i ? { ...x, entity: e.target.value } : x)))}
                  placeholder="Entité"
                  className="h-8 rounded-md border border-line bg-white px-2 text-[12px]"
                />
                <input
                  value={m.role}
                  onChange={(e) => setMandates((s) => s.map((x, idx) => (idx === i ? { ...x, role: e.target.value } : x)))}
                  placeholder="Rôle"
                  className="h-8 rounded-md border border-line bg-white px-2 text-[12px]"
                />
                <input
                  type="date"
                  value={m.since.slice(0, 10)}
                  onChange={(e) => setMandates((s) => s.map((x, idx) => (idx === i ? { ...x, since: e.target.value } : x)))}
                  className="h-8 rounded-md border border-line bg-white px-2 text-[12px]"
                />
                <button
                  type="button"
                  onClick={() => setMandates((s) => s.filter((_, idx) => idx !== i))}
                  className="grid h-8 w-8 place-items-center rounded text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Détentions de parts sociales
          </h3>
          <button
            type="button"
            onClick={() => setShareholdings((s) => [...s, { entity: "", percent: 0, value: null }])}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-line-2 bg-white px-2.5 text-[11.5px] text-ink-2"
          >
            <Plus className="h-3 w-3" /> Ajouter
          </button>
        </div>
        <ul className="space-y-2">
          {shareholdings.length === 0 ? (
            <li className="text-[12.5px] text-ink-3">Aucune détention déclarée.</li>
          ) : (
            shareholdings.map((sh, i) => (
              <li key={i} className="grid gap-2 rounded-md border border-line bg-surface-alt p-2 sm:grid-cols-[3fr_1fr_auto]">
                <input
                  value={sh.entity}
                  onChange={(e) => setShareholdings((s) => s.map((x, idx) => (idx === i ? { ...x, entity: e.target.value } : x)))}
                  placeholder="Entité"
                  className="h-8 rounded-md border border-line bg-white px-2 text-[12px]"
                />
                <input
                  type="number"
                  step="0.1"
                  value={sh.percent}
                  onChange={(e) => setShareholdings((s) => s.map((x, idx) => (idx === i ? { ...x, percent: Number(e.target.value) } : x)))}
                  placeholder="%"
                  className="h-8 rounded-md border border-line bg-white px-2 text-right text-[12px] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShareholdings((s) => s.filter((_, idx) => idx !== i))}
                  className="grid h-8 w-8 place-items-center rounded text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Conflits d'intérêts potentiels
          </h3>
          <button
            type="button"
            onClick={() => setConflicts((c) => [...c, { description: "", mitigation: "" }])}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-line-2 bg-white px-2.5 text-[11.5px] text-ink-2"
          >
            <Plus className="h-3 w-3" /> Ajouter
          </button>
        </div>
        <ul className="space-y-2">
          {conflicts.length === 0 ? (
            <li className="text-[12.5px] text-success">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> Aucun conflit d'intérêts identifié.
            </li>
          ) : (
            conflicts.map((c, i) => (
              <li key={i} className="grid gap-2 rounded-md border border-line bg-surface-alt p-2 sm:grid-cols-[2fr_2fr_auto]">
                <input
                  value={c.description}
                  onChange={(e) => setConflicts((s) => s.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))}
                  placeholder="Description du conflit"
                  className="h-8 rounded-md border border-line bg-white px-2 text-[12px]"
                />
                <input
                  value={c.mitigation ?? ""}
                  onChange={(e) => setConflicts((s) => s.map((x, idx) => (idx === i ? { ...x, mitigation: e.target.value } : x)))}
                  placeholder="Mesure d'atténuation"
                  className="h-8 rounded-md border border-line bg-white px-2 text-[12px]"
                />
                <button
                  type="button"
                  onClick={() => setConflicts((s) => s.filter((_, idx) => idx !== i))}
                  className="grid h-8 w-8 place-items-center rounded text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-[12.5px] text-success">✓ Déclaration {currentYear} enregistrée</span>}
        <button
          type="button"
          onClick={submitAll}
          disabled={submit.isPending}
          className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          {submit.isPending ? "Enregistrement…" : `Soumettre la déclaration ${currentYear}`}
        </button>
      </div>
    </div>
  );
}
