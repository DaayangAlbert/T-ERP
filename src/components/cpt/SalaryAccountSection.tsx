"use client";

import { useState } from "react";
import { Banknote, Link2, Plus } from "lucide-react";
import { clsx } from "clsx";
import { formatFCFA, formatDate } from "@/lib/format";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { useDafTreasury } from "@/hooks/useDafTreasury";
import { useSalaryAccount, useLinkSalaryBank, useSalaryMovement } from "@/hooks/useCptAnalytical";
import { TreasuryModal, Field, inputCls } from "@/components/daf/treasury/TreasuryModal";

const fmt = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });
const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function SalaryAccountSection() {
  const canManage = useAccess(MODULES.DAF).canEdit;
  const { data, isLoading } = useSalaryAccount();
  const [linking, setLinking] = useState(false);
  const [moving, setMoving] = useState(false);

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Banknote className="h-4 w-4 text-primary-600" /> Compte salaire (siège)
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-3">
            Centralise la masse salariale du siège, alimentée par les quote-parts des projets.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setLinking(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-ink-2 hover:border-primary-300 hover:text-primary-700">
              <Link2 className="h-3.5 w-3.5" /> Banque
            </button>
            <button type="button" onClick={() => setMoving(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-white hover:bg-primary-600">
              <Plus className="h-3.5 w-3.5" /> Mouvement
            </button>
          </div>
        )}
      </div>

      {isLoading || !data ? (
        <div className="h-20 animate-pulse rounded bg-surface-alt" />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-end gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-3">Solde</div>
              <div className={clsx("text-2xl font-bold tabular-nums", BigInt(data.balance) < 0n ? "text-danger" : "text-ink")}>{fmt(data.balance)}</div>
            </div>
            <div className="text-[12px] text-ink-3">
              Banque : {data.bankLabel ?? <span className="italic">non rattaché</span>}
            </div>
          </div>

          <div className="rounded-lg border border-line">
            <div className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Derniers mouvements</div>
            <ul className="max-h-64 divide-y divide-line overflow-y-auto">
              {data.movements.length === 0 ? (
                <li className="px-3 py-6 text-center text-[12px] text-ink-3">Aucun mouvement.</li>
              ) : (
                data.movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] text-ink">{m.reason}</div>
                      <div className="text-[11px] text-ink-3">{formatDate(m.occurredAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className={clsx("tabular-nums text-[12.5px] font-medium", m.direction === "CREDIT" ? "text-success" : "text-danger")}>
                        {m.direction === "CREDIT" ? "+" : "−"}{fmt(m.amount)}
                      </div>
                      <div className="text-[10.5px] tabular-nums text-ink-3">solde {fmt(m.balanceAfter)}</div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}

      {linking && <LinkBankModal current={data?.bankAccountId ?? ""} onClose={() => setLinking(false)} />}
      {moving && <SalaryMovementModal onClose={() => setMoving(false)} />}
    </section>
  );
}

function LinkBankModal({ current, onClose }: { current: string; onClose: () => void }) {
  const link = useLinkSalaryBank();
  const { data: tre } = useDafTreasury();
  const [bankAccountId, setBankAccountId] = useState(current);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await link.mutateAsync({ bankAccountId: bankAccountId || null });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title="Rattacher le compte salaire">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Compte bancaire">
          <select className={inputCls} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
            <option value="">Aucun</option>
            {(tre?.items ?? []).map((b) => <option key={b.id} value={b.id}>{b.bank} · {b.accountNumber}</option>)}
          </select>
        </Field>
        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">Annuler</button>
          <button type="submit" disabled={link.isPending} className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {link.isPending ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </TreasuryModal>
  );
}

function SalaryMovementModal({ onClose }: { onClose: () => void }) {
  const mv = useSalaryMovement();
  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("DEBIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Paiement masse salariale siège");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const a = onlyDigits(amount);
    if (!a || a === "0") { setError("Montant invalide"); return; }
    try {
      await mv.mutateAsync({ direction, amount: a, reason: reason.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title="Mouvement compte salaire">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Sens">
          <select className={inputCls} value={direction} onChange={(e) => setDirection(e.target.value as "CREDIT" | "DEBIT")}>
            <option value="DEBIT">Débit (paiement salaires) −</option>
            <option value="CREDIT">Crédit (dotation) +</option>
          </select>
        </Field>
        <Field label="Montant (FCFA)">
          <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Motif">
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">Annuler</button>
          <button type="submit" disabled={mv.isPending} className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {mv.isPending ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </TreasuryModal>
  );
}
