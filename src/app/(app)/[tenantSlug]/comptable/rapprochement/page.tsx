"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Upload, Save, CheckCircle2, AlertTriangle, FileSpreadsheet, Link2 } from "lucide-react";

interface Bank { id: string; bankName: string; accountNumber: string; currency: string }
interface BookMovement {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  amount: string;
  label: string;
  reference: string | null;
  occurredAt: string;
}
interface RecResp {
  bank: { id: string; label: string; currency: string; balance: string };
  period: string;
  movements: BookMovement[];
  existing: { id: string; status: string; bookBalance: string; bankBalance: string; gap: string; reconciledItems: unknown; completedAt: string | null } | null;
}
interface CsvLine { id: number; date: string; label: string; amount: number /* signed: + inbound, - outbound */ }

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

/** Parse FR CSV (séparateur `;` ou `,`). Colonnes attendues (insensible à la casse) :
 *  Date | Libellé (ou Label) | Débit (ou Debit) | Crédit (ou Credit).
 *  Sinon, position : 0=date, 1=libellé, 2=débit, 3=crédit. */
function parseCsv(text: string): CsvLine[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const hasHeader = head.some((h) => h.includes("date") || h.includes("libell") || h.includes("débit") || h.includes("debit") || h.includes("crédit") || h.includes("credit"));
  const idx = hasHeader
    ? {
        date: head.findIndex((h) => h.includes("date")),
        label: head.findIndex((h) => h.includes("libell") || h.includes("label")),
        debit: head.findIndex((h) => h.includes("débit") || h.includes("debit")),
        credit: head.findIndex((h) => h.includes("crédit") || h.includes("credit")),
      }
    : { date: 0, label: 1, debit: 2, credit: 3 };

  const parseNum = (s: string): number => {
    const cleaned = (s ?? "").replace(/\s/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  };
  const parseDate = (s: string): string => {
    const t = (s ?? "").trim();
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); // YYYY-MM-DD
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = t.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})/); // DD/MM/YYYY
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return t;
  };

  const rows = hasHeader ? lines.slice(1) : lines;
  const out: CsvLine[] = [];
  rows.forEach((row, i) => {
    const cells = row.split(sep);
    const debit = parseNum(cells[idx.debit] ?? "");
    const credit = parseNum(cells[idx.credit] ?? "");
    const amount = credit - debit;
    if (amount === 0) return;
    out.push({
      id: i,
      date: parseDate(cells[idx.date] ?? ""),
      label: (cells[idx.label] ?? "").trim(),
      amount,
    });
  });
  return out;
}

export default function ReconciliationPage() {
  const qc = useQueryClient();
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [csv, setCsv] = useState<CsvLine[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [bookMatched, setBookMatched] = useState<Set<string>>(new Set());
  const [csvMatched, setCsvMatched] = useState<Set<number>>(new Set());
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const banks = useQuery({
    queryKey: ["comptable", "banks"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/treasury/banks", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Bank[] }>;
    },
  });

  useEffect(() => {
    if (!bankAccountId && banks.data?.items.length) setBankAccountId(banks.data.items[0].id);
  }, [banks.data, bankAccountId]);

  const rec = useQuery({
    queryKey: ["comptable", "reconciliation", bankAccountId, period],
    enabled: Boolean(bankAccountId && period),
    queryFn: async () => {
      const res = await fetch(`/api/comptable/reconciliation?bankAccountId=${bankAccountId}&period=${period}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<RecResp>;
    },
  });

  // Reset des pointages quand on change de banque/période
  useEffect(() => {
    setBookMatched(new Set());
    setCsvMatched(new Set());
    setCsv([]);
    setCsvFileName(null);
    setSaveMsg(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [bankAccountId, period]);

  // Restaure le pointage existant si présent
  useEffect(() => {
    const items = rec.data?.existing?.reconciledItems;
    if (Array.isArray(items)) setBookMatched(new Set(items as string[]));
  }, [rec.data?.existing]);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = parseCsv(text);
      setCsv(lines);
      setCsvFileName(file.name);
      // Auto-pointage
      const bm = new Set<string>();
      const cm = new Set<number>();
      const movements = rec.data?.movements ?? [];
      for (const cl of lines) {
        const target = movements.find((m) => {
          if (bm.has(m.id)) return false;
          const bookAmount = (m.direction === "INBOUND" ? 1n : -1n) * BigInt(m.amount);
          const csvAmount = BigInt(Math.round(cl.amount));
          if (bookAmount !== csvAmount) return false;
          const dDays = Math.abs((new Date(m.occurredAt).getTime() - new Date(cl.date).getTime()) / 86_400_000);
          return dDays <= 3;
        });
        if (target) {
          bm.add(target.id);
          cm.add(cl.id);
        }
      }
      setBookMatched(bm);
      setCsvMatched(cm);
    };
    reader.readAsText(file, "utf-8");
  }

  // Totaux
  const movements = rec.data?.movements ?? [];
  const bookDelta = useMemo(
    () => movements.reduce((s, m) => s + (m.direction === "INBOUND" ? 1 : -1) * Number(m.amount), 0),
    [movements],
  );
  const bankDelta = useMemo(() => csv.reduce((s, l) => s + l.amount, 0), [csv]);
  const gap = bookDelta - bankDelta;
  const matchedBook = movements.filter((m) => bookMatched.has(m.id)).length;
  const matchedCsv = csv.filter((l) => csvMatched.has(l.id)).length;

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        bankAccountId,
        period,
        bookBalance: String(Math.round(bookDelta)),
        bankBalance: String(Math.round(bankDelta)),
        reconciledItems: Array.from(bookMatched),
      };
      const res = await fetch("/api/comptable/reconciliation", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: (d: { status: string; gap: string }) => {
      setSaveMsg(`Rapprochement enregistré · statut ${d.status} · écart ${fmt(Number(d.gap))} FCFA`);
      qc.invalidateQueries({ queryKey: ["comptable", "reconciliation"] });
    },
    onError: (e: Error) => setSaveMsg(e.message),
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-rapprochement">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Rapprochement bancaire</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Importez le relevé bancaire de la période (CSV), pointez les mouvements avec votre comptabilité, enregistrez le snapshot.
        </p>
      </header>

      <section className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-3 shadow-card">
        <label className="text-[12px] font-medium text-ink-2">
          Banque
          <select
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            className="mt-1 h-9 w-full min-w-[240px] rounded-md border border-line bg-white px-2 text-[13px]"
          >
            <option value="">— Sélectionner —</option>
            {(banks.data?.items ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.bankName} · {b.accountNumber}</option>
            ))}
          </select>
        </label>
        <label className="text-[12px] font-medium text-ink-2">
          Période
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="mt-1 h-9 rounded-md border border-line bg-white px-2 text-[13px]"
          />
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300">
            <Upload className="h-3.5 w-3.5" /> Importer relevé CSV
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
          </label>
          {csvFileName && (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-3">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {csvFileName} · {csv.length} ligne{csv.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </section>

      {rec.data?.existing && (
        <div className="rounded-md border border-info/30 bg-primary-50 px-3 py-2 text-[12px] text-primary-700">
          Rapprochement existant · statut <strong>{rec.data.existing.status}</strong> · écart enregistré {fmt(Number(rec.data.existing.gap))} FCFA
          {rec.data.existing.completedAt && <> · clôturé le {new Date(rec.data.existing.completedAt).toLocaleDateString("fr-FR")}</>}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* BOOK movements */}
        <div className="rounded-xl border border-line bg-white shadow-card">
          <header className="flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Mouvements comptables ({movements.length})</h2>
            <span className="text-[11.5px] text-ink-3">
              <strong className={bookDelta >= 0 ? "text-success" : "text-danger"}>{fmt(bookDelta)}</strong> FCFA · {matchedBook} pointé{matchedBook > 1 ? "s" : ""}
            </span>
          </header>
          <div className="max-h-[440px] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface-alt text-left text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="w-8 px-2 py-1.5"></th>
                  <th className="px-2 py-1.5">Date</th>
                  <th className="px-2 py-1.5">Libellé</th>
                  <th className="px-2 py-1.5 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {rec.isLoading ? (
                  <tr><td colSpan={4} className="p-3 text-center text-ink-3">Chargement…</td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan={4} className="p-3 text-center text-ink-3">Aucun mouvement comptable sur la période.</td></tr>
                ) : (
                  movements.map((m) => {
                    const signed = (m.direction === "INBOUND" ? 1 : -1) * Number(m.amount);
                    const checked = bookMatched.has(m.id);
                    return (
                      <tr key={m.id} className={clsx("border-b border-line", checked && "bg-success/5")}>
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setBookMatched((s) => {
                              const next = new Set(s);
                              if (e.target.checked) next.add(m.id); else next.delete(m.id);
                              return next;
                            })}
                            className="h-3.5 w-3.5"
                          />
                        </td>
                        <td className="px-2 py-1 text-ink-3">{new Date(m.occurredAt).toLocaleDateString("fr-FR")}</td>
                        <td className="px-2 py-1 text-ink-2">{m.label}</td>
                        <td className={clsx("px-2 py-1 text-right tabular-nums", signed >= 0 ? "text-success" : "text-danger")}>
                          {fmt(signed)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CSV statement */}
        <div className="rounded-xl border border-line bg-white shadow-card">
          <header className="flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Relevé bancaire ({csv.length})</h2>
            <span className="text-[11.5px] text-ink-3">
              <strong className={bankDelta >= 0 ? "text-success" : "text-danger"}>{fmt(bankDelta)}</strong> FCFA · {matchedCsv} pointé{matchedCsv > 1 ? "s" : ""}
            </span>
          </header>
          <div className="max-h-[440px] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface-alt text-left text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="w-8 px-2 py-1.5"></th>
                  <th className="px-2 py-1.5">Date</th>
                  <th className="px-2 py-1.5">Libellé</th>
                  <th className="px-2 py-1.5 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {csv.length === 0 ? (
                  <tr><td colSpan={4} className="p-3 text-center text-ink-3">
                    Importez un CSV (colonnes : Date, Libellé, Débit, Crédit).
                  </td></tr>
                ) : (
                  csv.map((l) => {
                    const checked = csvMatched.has(l.id);
                    return (
                      <tr key={l.id} className={clsx("border-b border-line", checked && "bg-success/5")}>
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setCsvMatched((s) => {
                              const next = new Set(s);
                              if (e.target.checked) next.add(l.id); else next.delete(l.id);
                              return next;
                            })}
                            className="h-3.5 w-3.5"
                          />
                        </td>
                        <td className="px-2 py-1 text-ink-3">{l.date ? new Date(l.date).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="px-2 py-1 text-ink-2">{l.label}</td>
                        <td className={clsx("px-2 py-1 text-right tabular-nums", l.amount >= 0 ? "text-success" : "text-danger")}>
                          {fmt(l.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="flex flex-wrap gap-4 text-[13px]">
          <Stat label="Solde livres (Δ)" value={`${fmt(bookDelta)} FCFA`} accent={bookDelta >= 0 ? "success" : "danger"} />
          <Stat label="Solde relevé (Δ)" value={`${fmt(bankDelta)} FCFA`} accent={bankDelta >= 0 ? "success" : "danger"} />
          <Stat
            label="Écart"
            value={`${fmt(gap)} FCFA`}
            accent={gap === 0 ? "success" : "danger"}
            icon={gap === 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          />
          <Stat
            label="Pointés"
            value={`${matchedBook} / ${movements.length} · ${matchedCsv} / ${csv.length}`}
            icon={<Link2 className="h-3.5 w-3.5" />}
          />
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && <span className={clsx("text-[12px]", save.isError ? "text-danger" : "text-success")}>{saveMsg}</span>}
          <button
            type="button"
            disabled={!bankAccountId || save.isPending}
            onClick={() => save.mutate()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {save.isPending ? "Enregistrement…" : "Enregistrer le rapprochement"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent, icon }: { label: string; value: string; accent?: "success" | "danger"; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10.5px] uppercase tracking-wider text-ink-3">{label}</span>
      <span className={clsx(
        "inline-flex items-center gap-1 font-mono text-[14px] font-semibold tabular-nums",
        accent === "success" && "text-success",
        accent === "danger" && "text-danger",
        !accent && "text-ink",
      )}>
        {icon} {value}
      </span>
    </div>
  );
}
