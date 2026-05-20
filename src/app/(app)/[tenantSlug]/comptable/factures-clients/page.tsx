"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Plus } from "lucide-react";

interface Billing {
  id: string;
  billingNumber: string;
  period: string;
  siteCode: string;
  siteName: string;
  client: string;
  amountHt: number;
  amountTtc: number;
  netToReceive: number;
  guaranteeRetention: number;
  sourceWithholding: number;
  paidAmount: number | null;
  dueDate: string;
  paidAt: string | null;
  status: string;
}

const TABS = [
  { key: "to-issue", label: "Situations en cours", filter: ["DRAFT", "VALIDATED"] },
  { key: "issued", label: "Émises", filter: ["ISSUED"] },
  { key: "paid", label: "Encaissées", filter: ["PAID", "PARTIALLY_PAID"] },
  { key: "overdue", label: "En retard", filter: ["OVERDUE"] },
] as const;

export default function FacturesClientsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("to-issue");
  const [wizardOpen, setWizardOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["comptable", "progress-billings"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/progress-billings", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        items: Billing[];
        counts: { toIssue: number; issued: number; paid: number; overdue: number };
        scope: { isDirection: boolean };
      }>;
    },
  });

  const action = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "issue" | "payment" }) => {
      const res = await fetch(`/api/comptable/progress-billings/${id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comptable", "progress-billings"] }),
  });

  const activeFilter = (TABS.find((t) => t.key === tab)?.filter ?? []) as readonly string[];
  const filtered = data?.items.filter((b) => activeFilter.includes(b.status)) ?? [];

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-factures-clients">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Situations de travaux
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Émission BPU + TVA 19,25% + retenue garantie 5% + retenue source 2,2%.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvelle situation
        </button>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="À émettre" value={data?.counts.toIssue ?? 0} />
        <Kpi label="Émises" value={data?.counts.issued ?? 0} accent="info" />
        <Kpi label="Encaissées" value={data?.counts.paid ?? 0} accent="success" />
        <Kpi label="En retard" value={data?.counts.overdue ?? 0} accent="danger" />
      </section>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune situation sur cet onglet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-[12.5px]">
              <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2">N°</th>
                  <th className="px-3 py-2">Chantier</th>
                  <th className="px-3 py-2">Période</th>
                  <th className="px-3 py-2 text-right">HT</th>
                  <th className="px-3 py-2 text-right">TTC</th>
                  <th className="px-3 py-2 text-right">Net à recevoir</th>
                  <th className="px-3 py-2">Échéance</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-line">
                    <td className="px-3 py-2 font-medium text-ink">{b.billingNumber}</td>
                    <td className="px-3 py-2 text-ink-2">
                      {b.siteCode} <span className="text-ink-3">— {b.client}</span>
                    </td>
                    <td className="px-3 py-2 text-ink-3">{b.period}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {new Intl.NumberFormat("fr-FR").format(Math.round(b.amountHt))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {new Intl.NumberFormat("fr-FR").format(Math.round(b.amountTtc))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-success">
                      {new Intl.NumberFormat("fr-FR").format(Math.round(b.netToReceive))}
                    </td>
                    <td className="px-3 py-2 text-ink-3">
                      {new Date(b.dueDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={clsx(
                          "rounded px-2 py-0.5 text-[11px] font-medium",
                          b.status === "DRAFT" && "bg-warning/10 text-warning",
                          b.status === "ISSUED" && "bg-primary-50 text-primary-700",
                          b.status === "PAID" && "bg-success/10 text-success",
                          b.status === "OVERDUE" && "bg-danger/10 text-danger"
                        )}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(b.status === "DRAFT" || b.status === "VALIDATED") && (
                        <button
                          type="button"
                          onClick={() => action.mutate({ id: b.id, action: "issue" })}
                          className="text-[11.5px] font-medium text-primary-700 hover:underline"
                        >
                          Émettre
                        </button>
                      )}
                      {b.status === "ISSUED" && (
                        <button
                          type="button"
                          onClick={() => action.mutate({ id: b.id, action: "payment" })}
                          className="text-[11.5px] font-medium text-success hover:underline"
                        >
                          Encaisser
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {wizardOpen && <ProgressBillingWizard onClose={() => setWizardOpen(false)} onCreated={() => qc.invalidateQueries({ queryKey: ["comptable", "progress-billings"] })} />}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: "info" | "success" | "danger" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
      <div
        className={clsx(
          "mt-1 text-2xl font-bold",
          accent === "danger" && "text-danger",
          accent === "success" && "text-success",
          accent === "info" && "text-primary-700",
          !accent && "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ProgressBillingWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [siteId, setSiteId] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<
    Array<{ bpuCode: string; designation: string; unit: string; cumQty: number; prevCumQty: number; unitPrice: number }>
  >([{ bpuCode: "001", designation: "Béton C25/30", unit: "m³", cumQty: 0, prevCumQty: 0, unitPrice: 90000 }]);

  const sitesQuery = useQuery({
    queryKey: ["comptable", "sites-scope-bill"],
    queryFn: async () => {
      const res = await fetch("/api/sites", { credentials: "same-origin" });
      if (!res.ok) return { items: [] };
      return res.json() as Promise<{ items: Array<{ id: string; code: string; name: string }> }>;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/comptable/progress-billings", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, period, dueDate: new Date(dueDate).toISOString(), items }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  const totalHt = items.reduce((s, i) => s + (i.cumQty - i.prevCumQty) * i.unitPrice, 0);
  const vat = Math.round(totalHt * 0.1925);
  const ttc = totalHt + vat;
  const guarantee = Math.round(totalHt * 0.05);
  const source = Math.round(totalHt * 0.022);
  const netToReceive = ttc - guarantee - source;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-3xl flex-col rounded-t-xl bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line p-3">
          <h2 className="text-[14px] font-semibold text-ink">Nouvelle situation · étape {step}/4</h2>
          <button type="button" onClick={onClose} className="text-ink-3 hover:text-ink">×</button>
        </header>
        {/* Stepper */}
        <div className="flex flex-col gap-1 border-b border-line p-3 sm:flex-row sm:gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={clsx(
                "rounded-md px-3 py-1.5 text-[12px] font-medium",
                step === s ? "bg-primary-100 text-primary-700" : "text-ink-3"
              )}
            >
              {s}. {["Chantier", "Métré", "Calcul", "Récap"][s - 1]}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {step === 1 && (
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-ink-2">
                Chantier
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
                >
                  <option value="">— Sélectionner —</option>
                  {sitesQuery.data?.items.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] font-medium text-ink-2">
                Période (YYYY-MM)
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
                />
              </label>
              <label className="text-[12px] font-medium text-ink-2">
                Échéance MOA
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-1.5 rounded-md border border-line p-2 sm:grid-cols-6">
                  <input
                    placeholder="BPU"
                    value={it.bpuCode}
                    onChange={(e) => setItems((cur) => cur.map((c, i) => (i === idx ? { ...c, bpuCode: e.target.value } : c)))}
                    className="h-8 rounded border border-line px-1.5 text-[12px]"
                  />
                  <input
                    placeholder="Désignation"
                    value={it.designation}
                    onChange={(e) => setItems((cur) => cur.map((c, i) => (i === idx ? { ...c, designation: e.target.value } : c)))}
                    className="col-span-2 h-8 rounded border border-line px-1.5 text-[12px] sm:col-span-2"
                  />
                  <input
                    placeholder="Unité"
                    value={it.unit}
                    onChange={(e) => setItems((cur) => cur.map((c, i) => (i === idx ? { ...c, unit: e.target.value } : c)))}
                    className="h-8 rounded border border-line px-1.5 text-[12px]"
                  />
                  <input
                    type="number"
                    placeholder="Qté cum."
                    value={it.cumQty}
                    onChange={(e) => setItems((cur) => cur.map((c, i) => (i === idx ? { ...c, cumQty: Number(e.target.value) } : c)))}
                    className="h-8 rounded border border-line px-1.5 text-right text-[12px]"
                  />
                  <input
                    type="number"
                    placeholder="P.U."
                    value={it.unitPrice}
                    onChange={(e) => setItems((cur) => cur.map((c, i) => (i === idx ? { ...c, unitPrice: Number(e.target.value) } : c)))}
                    className="h-8 rounded border border-line px-1.5 text-right text-[12px]"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems((cur) => [...cur, { bpuCode: "", designation: "", unit: "u", cumQty: 0, prevCumQty: 0, unitPrice: 0 }])}
                className="rounded-md border border-dashed border-line-2 px-3 py-1.5 text-[12px] font-medium text-ink-3 hover:text-primary-700"
              >
                + Ajouter ligne
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 text-[13px]">
              <Row label="Montant HT">{totalHt.toLocaleString("fr-FR")} FCFA</Row>
              <Row label="TVA 19,25%">{vat.toLocaleString("fr-FR")} FCFA</Row>
              <Row label="Total TTC" highlight>{ttc.toLocaleString("fr-FR")} FCFA</Row>
              <Row label="Retenue garantie 5%">- {guarantee.toLocaleString("fr-FR")} FCFA</Row>
              <Row label="Retenue source 2,2%">- {source.toLocaleString("fr-FR")} FCFA</Row>
              <Row label="Net à recevoir" highlight>{netToReceive.toLocaleString("fr-FR")} FCFA</Row>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2 rounded-md border border-line bg-surface-alt p-3 text-[13px]">
              <p>
                <strong>{items.length}</strong> ligne(s) — total <strong>{totalHt.toLocaleString("fr-FR")} FCFA HT</strong> sur la période <strong>{period}</strong>.
              </p>
              <p>Net à recevoir : <strong className="text-success">{netToReceive.toLocaleString("fr-FR")} FCFA</strong></p>
              {submit.error && (
                <div className="rounded-md bg-danger/10 p-2 text-[12px] text-danger">
                  {(submit.error as Error).message}
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex justify-between gap-2 border-t border-line p-3">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="h-9 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2"
          >
            {step === 1 ? "Annuler" : "Précédent"}
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!siteId || !dueDate)}
              className="h-9 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white disabled:opacity-50"
            >
              Suivant
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="h-9 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white disabled:opacity-50"
            >
              {submit.isPending ? "Émission…" : "Valider la situation"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Row({ label, children, highlight }: { label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={clsx("flex justify-between border-b border-line py-1.5", highlight && "font-semibold text-ink")}>
      <span className="text-ink-3">{label}</span>
      <span>{children}</span>
    </div>
  );
}
