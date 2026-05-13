"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Star, ShieldOff } from "lucide-react";
import { useSupplier, useEvaluateSupplier } from "@/hooks/usePurchase";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

interface Props {
  params: { id: string };
}

export default function SupplierDetailPage({ params }: Props) {
  const { data, isLoading, isError, refetch } = useSupplier(params.id);
  const evaluate = useEvaluateSupplier(params.id);
  const [showForm, setShowForm] = useState(false);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [quality, setQuality] = useState(4);
  const [delay, setDelay] = useState(4);
  const [price, setPrice] = useState(4);
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isError) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800">Fournisseur introuvable.</div>;
  }
  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const submit = async () => {
    setError(null);
    try {
      await evaluate.mutateAsync({ period, ratingQuality: quality, ratingDelay: delay, ratingPrice: price, comments });
      setShowForm(false);
      setComments("");
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <>
      <Link href="/achats" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux achats
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink">{data.name}</h1>
            {data.strategic && (
              <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                Stratégique
              </span>
            )}
            {data.blocked && (
              <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-danger">
                <ShieldOff className="h-2.5 w-2.5" /> Bloqué
              </span>
            )}
          </div>
          <p className="mt-1 text-[12.5px] text-ink-3">{data.category}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
        >
          <Star className="h-3.5 w-3.5" /> Évaluer fournisseur
        </button>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Volume YTD" value={formatFCFA(BigInt(data.volumeYTD))} highlight />
        <Stat label="BC émis" value={String(data.poCount)} />
        <Stat label="Délai paiement" value={`${data.paymentTerms} j`} />
        <Stat label="Note globale" value={data.ratingQuality != null ? `${((data.ratingQuality + (data.ratingDelay ?? 0) + (data.ratingPrice ?? 0)) / 3).toFixed(1)} / 5` : "—"} />
      </div>

      {showForm && (
        <section className="mb-4 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-primary-800">
            Nouvelle évaluation
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Période">
              <input value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]" />
            </Field>
            <RatingField label="Qualité" value={quality} onChange={setQuality} />
            <RatingField label="Respect des délais" value={delay} onChange={setDelay} />
            <RatingField label="Prix" value={price} onChange={setPrice} />
          </div>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={2}
            placeholder="Commentaires"
            className="mt-3 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px]"
          />
          {error && <p className="mt-2 text-[12.5px] text-rose-700">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="inline-flex h-9 items-center rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2">Annuler</button>
            <button type="button" onClick={submit} disabled={evaluate.isPending} className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60">
              {evaluate.isPending ? "Enregistrement…" : "Enregistrer l'évaluation"}
            </button>
          </div>
        </section>
      )}

      {data.activeContracts.length > 0 && (
        <section className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Contrats-cadres actifs
          </h3>
          <ul className="space-y-1.5 text-[12.5px]">
            {data.activeContracts.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-md border border-line bg-surface-alt px-3 py-2">
                <div>
                  <span className="font-mono text-[11px] text-ink-3">{c.reference}</span>
                  <span className="ml-2 text-ink-2">{c.subject}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[12px] font-semibold">{formatFCFA(BigInt(c.usedAmount))} / {formatFCFA(BigInt(c.maxAmount))}</div>
                  <div className="text-[10.5px] text-ink-3">jusqu'au {formatDate(c.endDate)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Historique BC ({data.history.length})
          </h3>
          <ul className="space-y-1 text-[12px]">
            {data.history.length === 0 ? (
              <li className="text-ink-3">Aucun BC enregistré.</li>
            ) : (
              data.history.map((h) => (
                <li key={h.id} className="flex items-center justify-between border-b border-line py-1 last:border-0">
                  <div>
                    <span className="font-mono text-[11px] text-ink-3">{h.reference}</span>
                    <span className="ml-2 text-ink-2">{h.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">{formatFCFA(BigInt(h.amount))}</div>
                    <span className={clsx(
                      "rounded px-1.5 py-0.5 text-[9.5px] font-semibold",
                      h.status === "APPROVED" ? "bg-success/10 text-success" :
                      h.status === "REJECTED" ? "bg-danger/10 text-danger" :
                      "bg-info/10 text-info"
                    )}>{h.status}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Évaluations ({data.evaluations.length})
          </h3>
          <ul className="space-y-1.5 text-[12px]">
            {data.evaluations.length === 0 ? (
              <li className="text-ink-3">Aucune évaluation enregistrée.</li>
            ) : (
              data.evaluations.map((e) => (
                <li key={e.id} className="rounded-md border border-line bg-surface-alt px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-ink-3">{e.period}</span>
                    <div className="flex gap-2 text-[11px]">
                      <span>Q {e.ratingQuality}</span>
                      <span>D {e.ratingDelay}</span>
                      <span>P {e.ratingPrice}</span>
                    </div>
                  </div>
                  {e.comments && <p className="mt-1 italic text-ink-3">« {e.comments} »</p>}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"rounded-lg border p-3 shadow-card " + (highlight ? "border-primary-300 bg-primary-50" : "border-line bg-white")}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={"mt-1 font-mono text-[18px] font-bold " + (highlight ? "text-primary-800" : "text-ink")}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold text-ink-2">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function RatingField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="grid h-7 w-7 place-items-center"
          >
            <Star className={n <= value ? "h-5 w-5 fill-warning text-warning" : "h-5 w-5 text-ink-3"} />
          </button>
        ))}
        <span className="ml-1 text-[12px] text-ink-3">{value}/5</span>
      </div>
    </Field>
  );
}
