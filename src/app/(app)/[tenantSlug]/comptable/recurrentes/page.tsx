"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Plus, PlayCircle, Trash2, X } from "lucide-react";
import { AccountPicker } from "@/components/comptable/entries/AccountPicker";
import { ThirdPartyPicker, accountNeedsTiers } from "@/components/comptable/entries/ThirdPartyPicker";

interface TplLine {
  accountCode: string;
  description?: string | null;
  debit: number;
  credit: number;
  thirdPartyId?: string | null;
}
interface Tpl {
  id: string;
  label: string;
  journalCode: string;
  description: string;
  lines: TplLine[];
  active: boolean;
  dayOfMonth: number | null;
  lastRunAt: string | null;
  lastRunPeriod: string | null;
}

const JOURNALS = ["OD", "ACH", "VTE", "BQ", "CAI", "PAIE"] as const;
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
const monthLabel = (p: string | null) => {
  if (!p) return "—";
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
};

export default function RecurrentesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["comptable", "recurring-entries"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/recurring-entries", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Tpl[] }>;
    },
  });

  const action = async (path: string, method: "POST" | "PATCH" | "DELETE", body?: object) => {
    setErr(null);
    const res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? `HTTP ${res.status}`);
    }
    return res.json();
  };

  const run = async (id: string) => {
    setBusy(id);
    try {
      const r = await action(`/api/comptable/recurring-entries/${id}/run`, "POST");
      alert(`✓ Écriture ${r.reference} créée pour ${r.period}.`);
      qc.invalidateQueries({ queryKey: ["comptable", "recurring-entries"] });
      qc.invalidateQueries({ queryKey: ["comptable", "entries"] });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (id: string, active: boolean) => {
    try {
      await action(`/api/comptable/recurring-entries/${id}`, "PATCH", { active });
      qc.invalidateQueries({ queryKey: ["comptable", "recurring-entries"] });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const del = async (id: string, label: string) => {
    if (!confirm(`Supprimer définitivement le modèle « ${label} » ? Les écritures déjà générées sont conservées.`)) return;
    try {
      await action(`/api/comptable/recurring-entries/${id}`, "DELETE");
      qc.invalidateQueries({ queryKey: ["comptable", "recurring-entries"] });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const items = data?.items ?? [];
  const currentPeriod = new Date().toISOString().slice(0, 7);

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-recurrentes">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Écritures récurrentes</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Modèles d&apos;écritures à rejouer chaque mois (loyers, abonnements, provisions). Génère
            l&apos;écriture du mois en un clic, équilibrée et validée automatiquement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-3.5 w-3.5" /> Nouveau modèle
        </button>
      </header>

      {err && <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-[12.5px] text-danger">{err}</div>}

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />)}</div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">
            Aucun modèle. Cliquez « Nouveau modèle » pour automatiser un loyer, un abonnement…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[12.5px]">
              <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2">Libellé</th>
                  <th className="px-3 py-2">Journal</th>
                  <th className="px-3 py-2 text-right">Jour</th>
                  <th className="px-3 py-2">Dernier run</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Actif</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => {
                  const total = t.lines.reduce((s, l) => s + (l.debit || 0), 0);
                  const ranThisMonth = t.lastRunPeriod === currentPeriod;
                  return (
                    <tr key={t.id} className={clsx("border-b border-line", !t.active && "opacity-50")}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{t.label}</div>
                        <div className="text-[11px] text-ink-3">{t.description}</div>
                      </td>
                      <td className="px-3 py-2"><span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-medium text-primary-700">{t.journalCode}</span></td>
                      <td className="px-3 py-2 text-right text-ink-3">{t.dayOfMonth ? `J ${t.dayOfMonth}` : "—"}</td>
                      <td className="px-3 py-2 text-[11.5px] text-ink-3">
                        {t.lastRunPeriod
                          ? <>{monthLabel(t.lastRunPeriod)}{ranThisMonth && <span className="ml-1 rounded bg-success/10 px-1 py-0.5 text-[10px] text-success">ce mois</span>}</>
                          : "Jamais"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(total)} FCFA</td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-1 text-[11.5px] cursor-pointer">
                          <input type="checkbox" checked={t.active} onChange={(e) => toggle(t.id, e.target.checked)} />
                          {t.active ? "actif" : "inactif"}
                        </label>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={busy === t.id || !t.active || ranThisMonth}
                            onClick={() => run(t.id)}
                            title={ranThisMonth ? "Déjà généré ce mois" : !t.active ? "Modèle inactif" : "Générer l'écriture du mois"}
                            className="inline-flex items-center gap-1 rounded-md bg-success px-2 py-1 text-[11.5px] font-medium text-white hover:bg-success/90 disabled:opacity-40"
                          >
                            <PlayCircle className="h-3 w-3" /> Générer
                          </button>
                          <button
                            type="button"
                            onClick={() => del(t.id, t.label)}
                            title="Supprimer le modèle"
                            className="rounded p-1 text-ink-3 hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {creating && <CreateTemplateModal onClose={() => setCreating(false)} onCreated={() => qc.invalidateQueries({ queryKey: ["comptable", "recurring-entries"] })} />}
    </div>
  );
}

interface DraftLine { accountCode: string; thirdPartyId: string; description: string; debit: string; credit: string }
const emptyLine = (): DraftLine => ({ accountCode: "", thirdPartyId: "", description: "", debit: "", credit: "" });

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [label, setLabel] = useState("");
  const [journalCode, setJournalCode] = useState<typeof JOURNALS[number]>("OD");
  const [description, setDescription] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const setLine = (i: number, patch: Partial<DraftLine>) => setLines((cur) => cur.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((cur) => [...cur, emptyLine()]);
  const rmLine = (i: number) => setLines((cur) => (cur.length > 2 ? cur.filter((_, idx) => idx !== i) : cur));

  const totalD = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalC = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = totalD === totalC && totalD > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (label.trim().length < 2) return setErr("Libellé requis");
    if (description.trim().length < 1) return setErr("Description requise");
    if (!balanced) return setErr("Modèle non équilibré (D ≠ C, ou total = 0)");
    const cleanLines = lines
      .filter((l) => l.accountCode.trim() && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map((l) => ({
        accountCode: l.accountCode.trim(),
        description: l.description.trim() || undefined,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        thirdPartyId: l.thirdPartyId.trim() || undefined,
      }));
    if (cleanLines.length < 2) return setErr("Au moins 2 lignes avec un compte et un montant");
    setPending(true);
    try {
      const res = await fetch("/api/comptable/recurring-entries", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          journalCode,
          description: description.trim(),
          dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
          lines: cleanLines,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      onCreated();
      onClose();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-3xl flex-col rounded-t-xl bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line p-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Nouveau modèle récurrent</h2>
            <p className="text-[11.5px] text-ink-3">À rejouer chaque mois (loyer, abonnement, provision…).</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-surface-alt"><X className="h-4 w-4 text-ink-3" /></button>
        </header>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-[12px] font-medium text-ink-2">
              Libellé
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Loyer bureau Yaoundé" className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]" />
            </label>
            <label className="text-[12px] font-medium text-ink-2">
              Journal
              <select value={journalCode} onChange={(e) => setJournalCode(e.target.value as typeof JOURNALS[number])} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]">
                {JOURNALS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-medium text-ink-2">
              Jour du mois (optionnel)
              <input type="number" min={1} max={28} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} placeholder="ex: 5" className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]" />
            </label>
          </div>
          <label className="block text-[12px] font-medium text-ink-2">
            Description (libellé de l&apos;écriture générée)
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Loyer mensuel — Bureau Yaoundé" className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]" />
          </label>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Lignes d&apos;écriture</h3>
              <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-700 hover:underline">
                <Plus className="h-3 w-3" /> Ajouter une ligne
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="rounded-md border border-line p-2">
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-6">
                    <AccountPicker
                      value={l.accountCode}
                      onChange={(code) => setLine(i, { accountCode: code })}
                      placeholder="Compte"
                      className="h-8 rounded border border-line px-1.5 text-[12px]"
                    />
                    {accountNeedsTiers(l.accountCode) ? (
                      <ThirdPartyPicker
                        accountCode={l.accountCode}
                        value={l.thirdPartyId}
                        onChange={(v) => setLine(i, { thirdPartyId: v })}
                        className="h-8 rounded border border-line px-1.5 text-[12px]"
                      />
                    ) : (
                      <input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Libellé (option)" className="h-8 rounded border border-line px-1.5 text-[12px]" />
                    )}
                    {accountNeedsTiers(l.accountCode) && (
                      <input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Libellé (option)" className="h-8 rounded border border-line px-1.5 text-[12px] sm:col-span-2" />
                    )}
                    <input type="number" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: "" })} placeholder="Débit" className="h-8 rounded border border-line px-1.5 text-right text-[12px]" />
                    <input type="number" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: "" })} placeholder="Crédit" className="h-8 rounded border border-line px-1.5 text-right text-[12px]" />
                    <button type="button" disabled={lines.length <= 2} onClick={() => rmLine(i)} className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-danger/10 hover:text-danger disabled:opacity-30">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={clsx(
              "mt-2 flex items-center justify-between rounded-md border px-3 py-2 text-[12px] font-medium",
              balanced ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger",
            )}>
              <span>Débit : {fmt(totalD)} FCFA</span>
              <span>Crédit : {fmt(totalC)} FCFA</span>
              <span>{balanced ? "✓ Équilibré" : "✗ Non équilibré"}</span>
            </div>
          </div>

          {err && <div className="rounded-md bg-danger/10 p-2 text-[12px] text-danger">{err}</div>}
        </form>

        <footer className="flex justify-end gap-2 border-t border-line p-3">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2">Annuler</button>
          <button type="submit" form="" onClick={submit} disabled={pending || !balanced} className="h-9 rounded-md bg-primary-600 px-4 text-[12.5px] font-semibold text-white disabled:opacity-50">
            {pending ? "Création…" : "Créer le modèle"}
          </button>
        </footer>
      </div>
    </div>
  );
}
