"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import { useChantier } from "@/contexts/ChantierContext";

interface ContractData {
  contract: {
    reference: string;
    initialAmount: number;
    signedAmendmentsTotal: number;
    pendingAmendmentsTotal: number;
    projected: number;
    publicMarket: boolean;
    procuringEntity: string | null;
  } | null;
  billings: Array<{
    id: string;
    billingNumber: string;
    period: string;
    amountTtc: number;
    netToReceive: number;
    paidAmount: number | null;
    dueDate: string;
    status: string;
  }>;
  amendments: Array<{
    id: string;
    reference: string;
    amount: number;
    extraDays: number;
    reason: string;
    status: string;
    createdAt: string;
  }>;
  penalties: Array<{ id: string; amount: number; reason: string; status: string; notifiedAt: string }>;
  kpis: {
    issuedCount: number;
    totalInvoiced: number;
    totalCollected: number;
    collectionRate: number;
    totalGuarantee: number;
    penaltiesCount: number;
  };
}

type Tab = "billings" | "amendments" | "warranties" | "schedule";

export default function MarchePage() {
  const { activeChantierId, activeChantier } = useChantier();
  const [tab, setTab] = useState<Tab>("billings");
  const [newAmendment, setNewAmendment] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "contract", activeChantierId],
    enabled: !!activeChantierId,
    queryFn: async () => {
      const res = await fetch(`/api/dtrav/sites/${activeChantierId}/contract`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<ContractData>;
    },
  });

  const submitAmendment = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dtrav/amendments/${id}/submit`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dtrav", "contract"] }),
  });

  const c = data?.contract;

  return (
    <div id="screen-dtrav-marche" className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Suivi marché</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {activeChantier?.code} — situations, avenants, retenues, échéancier MOA.
        </p>
      </header>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <BannerCell label="Initial" value={c ? `${new Intl.NumberFormat("fr-FR").format(Math.round(c.initialAmount))}` : "—"} />
          <BannerCell
            label="Avenants signés"
            value={c ? `+${new Intl.NumberFormat("fr-FR").format(Math.round(c.signedAmendmentsTotal))}` : "—"}
            accent="success"
          />
          <BannerCell
            label="Avenants en cours"
            value={c ? `+${new Intl.NumberFormat("fr-FR").format(Math.round(c.pendingAmendmentsTotal))}` : "—"}
            accent="warning"
          />
          <BannerCell
            label="Projeté"
            value={c ? `${new Intl.NumberFormat("fr-FR").format(Math.round(c.projected))}` : "—"}
            accent="info"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Situations émises" value={(data?.kpis.issuedCount ?? 0).toString()} />
        <Kpi
          label="Encaissé"
          value={`${new Intl.NumberFormat("fr-FR").format(Math.round((data?.kpis.totalCollected ?? 0)))}`}
          hint={`${data?.kpis.collectionRate ?? 0}%`}
          accent="success"
        />
        <Kpi label="Retenue garantie" value={`${new Intl.NumberFormat("fr-FR").format(Math.round((data?.kpis.totalGuarantee ?? 0)))}`} />
        <Kpi
          label="Pénalités"
          value={(data?.kpis.penaltiesCount ?? 0).toString()}
          accent={data?.kpis.penaltiesCount ? "danger" : undefined}
        />
      </section>

      <div className="flex flex-wrap gap-1 border-b border-line">
        <TabBtn active={tab === "billings"} onClick={() => setTab("billings")} label="Situations" />
        <TabBtn active={tab === "amendments"} onClick={() => setTab("amendments")} label="Avenants" />
        <TabBtn active={tab === "warranties"} onClick={() => setTab("warranties")} label="Retenues & garanties" />
        <TabBtn active={tab === "schedule"} onClick={() => setTab("schedule")} label="Échéancier MOA" />
      </div>

      {tab === "billings" && (
        <section className="rounded-xl border border-line bg-white shadow-card">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
              ))}
            </div>
          ) : data?.billings.length === 0 ? (
            <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune situation pour ce marché.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">N°</th>
                    <th className="px-3 py-2">Période</th>
                    <th className="px-3 py-2 text-right">TTC</th>
                    <th className="px-3 py-2 text-right">Net à recevoir</th>
                    <th className="px-3 py-2 text-right">Encaissé</th>
                    <th className="px-3 py-2">Échéance</th>
                    <th className="px-3 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.billings.map((b) => (
                    <tr key={b.id} className="border-b border-line">
                      <td className="px-3 py-2 font-medium text-ink">{b.billingNumber}</td>
                      <td className="px-3 py-2 text-ink-3">{b.period}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {new Intl.NumberFormat("fr-FR").format(Math.round(b.amountTtc))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {new Intl.NumberFormat("fr-FR").format(Math.round(b.netToReceive))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {b.paidAmount ? `${new Intl.NumberFormat("fr-FR").format(Math.round(b.paidAmount))}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-ink-3">{new Date(b.dueDate).toLocaleDateString("fr-FR")}</td>
                      <td className="px-3 py-2">
                        <span
                          className={clsx(
                            "rounded px-2 py-0.5 text-[11px] font-medium",
                            b.status === "PAID" && "bg-success/10 text-success",
                            b.status === "ISSUED" && "bg-primary-50 text-primary-700",
                            b.status === "DRAFT" && "bg-warning/10 text-warning",
                            b.status === "OVERDUE" && "bg-danger/10 text-danger"
                          )}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "amendments" && (
        <section className="space-y-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setNewAmendment(true)}
              style={{ minHeight: 40 }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Nouvel avenant
            </button>
          </div>
          {data?.amendments.length === 0 ? (
            <p className="rounded-xl border border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
              Aucun avenant.
            </p>
          ) : (
            data?.amendments.map((a) => (
              <article
                key={a.id}
                className={clsx(
                  "rounded-xl border-l-4 bg-white p-3 shadow-card",
                  a.status === "SIGNED" && "border-l-success",
                  a.status === "REJECTED" && "border-l-danger",
                  (a.status === "DRAFT" || a.status === "N2_PENDING" || a.status === "N3_PENDING" || a.status === "MOA_PENDING") && "border-l-warning"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-ink">
                      {a.reference} · +{new Intl.NumberFormat("fr-FR").format(Math.round(a.amount))} FCFA
                      {a.extraDays > 0 && <span className="text-ink-3"> · +{a.extraDays} jours</span>}
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-2">{a.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "rounded px-2 py-0.5 text-[11px] font-medium",
                        a.status === "SIGNED" && "bg-success/10 text-success",
                        a.status === "REJECTED" && "bg-danger/10 text-danger",
                        a.status === "DRAFT" && "bg-ink-3/10 text-ink-3",
                        a.status.includes("PENDING") && "bg-warning/10 text-warning"
                      )}
                    >
                      {a.status}
                    </span>
                    {a.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={() => submitAmendment.mutate(a.id)}
                        style={{ minHeight: 36 }}
                        className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 text-[11.5px] font-medium text-white"
                      >
                        <ArrowUp className="h-3 w-3" /> Soumettre au DT
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {tab === "warranties" && (
        <section className="rounded-xl border border-line bg-white p-4 shadow-card text-[13px]">
          <p className="text-ink-2">
            Retenue de garantie cumulée :{" "}
            <strong>{new Intl.NumberFormat("fr-FR").format(Math.round((data?.kpis.totalGuarantee ?? 0)))} FCFA</strong>
          </p>
          <p className="mt-2 text-[12.5px] text-ink-3">
            La libération de la retenue intervient à la fin de la période de garantie (12 mois par défaut)
            après la réception définitive.
          </p>
        </section>
      )}

      {tab === "schedule" && (
        <section className="rounded-xl border border-line bg-white p-4 shadow-card text-[13px] text-ink-3">
          Échéancier MOA — à compléter avec les jalons de paiement contractuels.
        </section>
      )}

      {newAmendment && activeChantierId && (
        <NewAmendmentModal
          siteId={activeChantierId}
          onClose={() => setNewAmendment(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["dtrav", "contract"] })}
        />
      )}
    </div>
  );
}

function NewAmendmentModal({
  siteId,
  onClose,
  onCreated,
}: {
  siteId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [extraDays, setExtraDays] = useState("0");
  const [reason, setReason] = useState("");
  const [justification, setJustification] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dtrav/sites/${siteId}/amendments`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          extraDays: Number(extraDays),
          reason,
          justification,
        }),
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-lg flex-col rounded-t-xl bg-white shadow-xl sm:h-auto sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line p-3">
          <h2 className="text-[14px] font-semibold text-ink">Nouvel avenant · étape {step}/3</h2>
          <button type="button" onClick={onClose} className="text-ink-3">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          {step === 1 && (
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-ink-2">
                Motif (titre court)
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Modification descente d'eau pile 3"
                  style={{ minHeight: 40 }}
                  className="mt-1 w-full rounded-md border border-line bg-white px-2 text-[13px]"
                />
              </label>
              <label className="text-[12px] font-medium text-ink-2">
                Justification détaillée
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1 text-[13px]"
                />
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-ink-2">
                Montant (FCFA)
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ minHeight: 40 }}
                  className="mt-1 w-full rounded-md border border-line bg-white px-2 text-[13px]"
                />
              </label>
              <label className="text-[12px] font-medium text-ink-2">
                Jours supplémentaires
                <input
                  type="number"
                  value={extraDays}
                  onChange={(e) => setExtraDays(e.target.value)}
                  style={{ minHeight: 40 }}
                  className="mt-1 w-full rounded-md border border-line bg-white px-2 text-[13px]"
                />
              </label>
            </div>
          )}
          {step === 3 && (
            <div className="rounded-md border border-line bg-surface-alt p-3 text-[13px]">
              <p>
                Avenant <strong>{reason}</strong> de{" "}
                <strong>{Number(amount).toLocaleString("fr-FR")} FCFA</strong>
                {Number(extraDays) > 0 && <> · +{extraDays} jours</>}.
              </p>
              <p className="mt-2 text-[12px] text-ink-3">
                Statut initial : DRAFT. Vous pourrez ensuite le soumettre au DT pour validation N2.
              </p>
              {submit.error && (
                <div className="mt-2 rounded-md bg-danger/10 p-2 text-[12px] text-danger">
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
            style={{ minHeight: 40 }}
            className="rounded-md border border-line-2 bg-white px-3 text-[12.5px]"
          >
            {step === 1 ? "Annuler" : "Précédent"}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !reason || !justification : !amount}
              style={{ minHeight: 40 }}
              className="rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white disabled:opacity-50"
            >
              Suivant
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              style={{ minHeight: 40 }}
              className="rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white disabled:opacity-50"
            >
              Créer en brouillard
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function BannerCell({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" | "info" }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
      <div
        className={clsx(
          "text-2xl font-bold",
          accent === "success" && "text-success",
          accent === "warning" && "text-warning",
          accent === "info" && "text-primary-700",
          !accent && "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: "success" | "danger" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
      <div
        className={clsx(
          "mt-1 text-2xl font-bold",
          accent === "success" && "text-success",
          accent === "danger" && "text-danger",
          !accent && "text-ink"
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minHeight: 40 }}
      className={clsx(
        "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
        active ? "text-primary-700" : "text-ink-3 hover:text-ink"
      )}
    >
      {label}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  );
}
