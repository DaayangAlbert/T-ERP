"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Building2, Save } from "lucide-react";
import { useBank, useUpdateBank } from "@/hooks/useFinance";
import { formatDate, formatFCFA } from "@/lib/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props {
  params: { id: string };
}

export default function BankDetailPage({ params }: Props) {
  const { data, isLoading, isError } = useBank(params.id);
  const update = useUpdateBank(params.id);
  const [editingBalance, setEditingBalance] = useState<string>("");
  const [saved, setSaved] = useState(false);

  if (isError) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800">Banque introuvable.</div>;
  }
  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const submit = async () => {
    if (!editingBalance) return;
    await update.mutateAsync({ balance: editingBalance });
    setEditingBalance("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Link href="/finances" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> Retour finances
      </Link>

      <header className="mb-5 flex items-start justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-100 text-primary-700">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-ink">{data.bank}</h1>
            <p className="mt-1 font-mono text-[12px] text-ink-3">
              {data.accountNumber} · {data.accountType} · {data.currency}
            </p>
          </div>
        </div>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Solde JJ" value={formatFCFA(BigInt(data.balance))} highlight />
        <Stat label="Lignes accordées" value={formatFCFA(BigInt(data.creditLineGranted))} />
        <Stat label="Utilisé" value={formatFCFA(BigInt(data.creditLineUsed))} />
        <Stat label="Disponible" value={formatFCFA(BigInt(data.creditLineAvailable))} />
      </div>

      {data.history12m && data.history12m.length > 0 && (
        <section className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Historique 12 mois
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.history12m}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="balance" name="Solde" stroke="#A855F7" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      <section className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Relation manager
          </h3>
          <dl className="space-y-1.5 text-[12.5px]">
            <Row label="Nom">{data.contact?.name ?? "—"}</Row>
            <Row label="Téléphone">{data.contact?.phone ?? "—"}</Row>
            <Row label="Email">{data.contact?.email ?? "—"}</Row>
            <Row label="Renouvellement">{data.renewalDate ? formatDate(data.renewalDate) : "—"}</Row>
          </dl>
        </div>

        <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-primary-800">
            Saisie manuelle solde JJ (avant intégration API)
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={editingBalance}
              onChange={(e) => setEditingBalance(e.target.value)}
              placeholder="Nouveau solde FCFA"
              className="h-9 flex-1 rounded-md border border-line bg-white px-2.5 text-[13px] font-mono"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!editingBalance || update.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" /> {update.isPending ? "…" : "Enregistrer"}
            </button>
          </div>
          {saved && <p className="mt-2 text-[12px] text-success">✓ Solde mis à jour (audit log enregistré)</p>}
        </div>
      </section>
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-1 last:border-0">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}
