"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Wallet, ArrowDownToLine, ArrowLeftRight, Eye, Building2 } from "lucide-react";
import { clsx } from "clsx";
import { formatFCFA, formatDate } from "@/lib/format";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { useDafAccountants } from "@/hooks/useDafAccountants";
import {
  useProjectAccounts,
  useProjectAccount,
  useCreateProjectAccount,
  useFundProjectAccount,
  useProjectMovement,
  type ProjectAccountItem,
} from "@/hooks/useCptAnalytical";
import { TreasuryModal, Field, inputCls } from "@/components/daf/treasury/TreasuryModal";

const fmt = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });
const onlyDigits = (s: string) => s.replace(/\D/g, "");

interface BankOption {
  id: string;
  bank: string;
  accountNumber: string;
  balance: string;
}

/**
 * `variant="daf"` : gestion complète (création, appro banque, tous mouvements).
 * `variant="comptable"` : lecture + mouvements (hors remboursement) sur ses
 * chantiers affectés ; pas de création ni d'approvisionnement.
 */
export function ProjectAccountsSection({ variant = "daf" }: { variant?: "daf" | "comptable" }) {
  const dafAccess = useAccess(MODULES.DAF).canEdit;
  const isDaf = variant === "daf" && dafAccess;
  const { data, isLoading } = useProjectAccounts();
  const [creating, setCreating] = useState(false);
  const [funding, setFunding] = useState<ProjectAccountItem | null>(null);
  const [moving, setMoving] = useState<ProjectAccountItem | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  // Liste des banques : nécessaire uniquement côté DAF (endpoint réservé DAF/DG).
  const { data: tre } = useQuery({
    queryKey: ["daf", "treasury"],
    enabled: isDaf,
    queryFn: async () => {
      const res = await fetch(`/api/daf/banks`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: BankOption[] }>;
    },
  });
  const banks: BankOption[] = isDaf ? (tre?.items ?? []) : [];

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Wallet className="h-4 w-4 text-primary-600" /> Comptes projet
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-3">
            Un sous-compte par chantier, adossé à un compte bancaire. Solde négatif = découvert / dette.
          </p>
        </div>
        {isDaf && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-3.5 w-3.5" /> Nouveau compte projet
          </button>
        )}
      </div>

      {data && (
        <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-ink-3">
          <span>{data.summary.count} compte{data.summary.count > 1 ? "s" : ""}</span>
          <span>Solde consolidé : <strong className="text-ink">{fmt(data.summary.totalBalance)}</strong></span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-surface-alt" />)}</div>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-[12.5px] text-ink-3">
          {variant === "comptable" ? "Aucun compte projet sur vos chantiers affectés." : "Aucun compte projet. Créez-en un pour suivre les flux d'un chantier."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-2 py-2">Chantier</th>
                <th className="px-2 py-2">Banque</th>
                <th className="px-2 py-2 text-right">Solde dispo.</th>
                <th className="px-2 py-2 text-right">Dette</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => {
                const neg = BigInt(a.balance) < 0n;
                const debt = BigInt(a.debt) > 0n;
                return (
                  <tr key={a.id} className="border-b border-line">
                    <td className="px-2 py-2">
                      <div className="font-medium text-ink">{a.siteName}</div>
                      <div className="font-mono text-[11px] text-ink-3">{a.siteCode}{!a.isActive && " · clôturé"}</div>
                    </td>
                    <td className="px-2 py-2 text-ink-2">{a.bankLabel ?? <span className="text-ink-3">—</span>}</td>
                    <td className={clsx("px-2 py-2 text-right tabular-nums font-medium", neg ? "text-danger" : "text-ink")}>{fmt(a.balance)}</td>
                    <td className={clsx("px-2 py-2 text-right tabular-nums", debt ? "text-warning" : "text-ink-3")}>{fmt(a.debt)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {isDaf && a.isActive && (
                          <button type="button" onClick={() => setFunding(a)} title="Approvisionner" className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-ink-2 hover:border-primary-300 hover:text-primary-700">
                            <ArrowDownToLine className="h-3.5 w-3.5" /> Appro.
                          </button>
                        )}
                        {a.isActive && (isDaf || variant === "comptable") && (
                          <button type="button" onClick={() => setMoving(a)} title="Mouvement" className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-ink-2 hover:border-primary-300 hover:text-primary-700">
                            <ArrowLeftRight className="h-3.5 w-3.5" /> Mouvt.
                          </button>
                        )}
                        <button type="button" onClick={() => setViewing(a.id)} title="Relevé" className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-ink-2 hover:border-primary-300 hover:text-primary-700">
                          <Eye className="h-3.5 w-3.5" /> Relevé
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

      {creating && <CreateModal onClose={() => setCreating(false)} existingSiteIds={(data?.items ?? []).map((i) => i.siteId)} banks={banks} />}
      {funding && <FundModal account={funding} onClose={() => setFunding(null)} banks={banks} />}
      {moving && <MovementModal account={moving} onClose={() => setMoving(null)} banks={banks} allowRepayment={isDaf} />}
      {viewing && <DetailDrawer id={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}

function CreateModal({ onClose, existingSiteIds, banks }: { onClose: () => void; existingSiteIds: string[]; banks: BankOption[] }) {
  const create = useCreateProjectAccount();
  const { data: acc } = useDafAccountants();
  const [siteId, setSiteId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const available = useMemo(
    () => (acc?.sites ?? []).filter((s) => !existingSiteIds.includes(s.id)),
    [acc, existingSiteIds],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!siteId) { setError("Sélectionnez un chantier"); return; }
    try {
      await create.mutateAsync({ siteId, bankAccountId: bankAccountId || null });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title="Nouveau compte projet">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Chantier">
          <select className={inputCls} value={siteId} onChange={(e) => setSiteId(e.target.value)} required>
            <option value="">Sélectionner…</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Compte bancaire de rattachement (optionnel)">
          <select className={inputCls} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
            <option value="">Aucun pour l&apos;instant</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.bank} · {b.accountNumber}</option>
            ))}
          </select>
        </Field>
        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">Annuler</button>
          <button type="submit" disabled={create.isPending} className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {create.isPending ? "Création…" : "Créer le compte"}
          </button>
        </div>
      </form>
    </TreasuryModal>
  );
}

function FundModal({ account, onClose, banks }: { account: ProjectAccountItem; onClose: () => void; banks: BankOption[] }) {
  const fund = useFundProjectAccount();
  const [bankAccountId, setBankAccountId] = useState(account.bankAccountId ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Approvisionnement compte projet");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const a = onlyDigits(amount);
    if (!bankAccountId) { setError("Choisissez le compte bancaire source"); return; }
    if (!a || a === "0") { setError("Montant invalide"); return; }
    try {
      await fund.mutateAsync({ id: account.id, bankAccountId, amount: a, reason });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title={`Approvisionner · ${account.siteCode}`}>
      <form onSubmit={submit} className="space-y-3">
        <p className="rounded-md bg-surface-alt px-3 py-2 text-[12px] text-ink-2">Banque → compte projet. Le compte bancaire est débité du même montant.</p>
        <Field label="Compte bancaire source">
          <select className={inputCls} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
            <option value="">Sélectionner…</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.bank} · {b.accountNumber} ({fmt(b.balance)})</option>
            ))}
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
          <button type="submit" disabled={fund.isPending} className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {fund.isPending ? "Traitement…" : "Approvisionner"}
          </button>
        </div>
      </form>
    </TreasuryModal>
  );
}

function movementOptions(allowRepayment: boolean) {
  const base = [
    { value: "EXPENSE", label: "Dépense (débit)" },
    { value: "REVENUE", label: "Production / encaissement (crédit)" },
    { value: "PROJECT_SALARY", label: "Salaire chantier (débit)" },
    { value: "ADJUSTMENT", label: "Régularisation" },
  ];
  if (allowRepayment) base.splice(3, 0, { value: "REPAYMENT", label: "Remboursement banque (débit)" });
  return base;
}

function MovementModal({ account, onClose, banks, allowRepayment }: { account: ProjectAccountItem; onClose: () => void; banks: BankOption[]; allowRepayment: boolean }) {
  const mv = useProjectMovement();
  const options = movementOptions(allowRepayment);
  const [type, setType] = useState("EXPENSE");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("DEBIT");
  const [bankAccountId, setBankAccountId] = useState(account.bankAccountId ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const a = onlyDigits(amount);
    if (!a || a === "0") { setError("Montant invalide"); return; }
    if (!reason.trim()) { setError("Motif requis"); return; }
    try {
      await mv.mutateAsync({
        id: account.id,
        type,
        amount: a,
        reason: reason.trim(),
        ...(type === "ADJUSTMENT" ? { direction } : {}),
        ...(type === "REPAYMENT" ? { bankAccountId } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title={`Mouvement · ${account.siteCode}`}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Type de mouvement">
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        {type === "ADJUSTMENT" && (
          <Field label="Sens">
            <select className={inputCls} value={direction} onChange={(e) => setDirection(e.target.value as "CREDIT" | "DEBIT")}>
              <option value="DEBIT">Débit (−)</option>
              <option value="CREDIT">Crédit (+)</option>
            </select>
          </Field>
        )}
        {type === "REPAYMENT" && (
          <Field label="Compte bancaire crédité">
            <select className={inputCls} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
              <option value="">Sélectionner…</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.bank} · {b.accountNumber}</option>)}
            </select>
          </Field>
        )}
        <Field label="Montant (FCFA)">
          <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Motif">
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: achat ciment, décompte n°2…" />
        </Field>
        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">Annuler</button>
          <button type="submit" disabled={mv.isPending} className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {mv.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </TreasuryModal>
  );
}

function DetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useProjectAccount(id);
  return (
    <TreasuryModal open onClose={onClose} title={data ? `Relevé · ${data.siteCode}` : "Relevé"}>
      {isLoading || !data ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-surface-alt" />)}</div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-line p-3">
              <div className="text-[11px] uppercase tracking-wider text-ink-3">Solde disponible</div>
              <div className={clsx("mt-1 text-lg font-bold tabular-nums", BigInt(data.balance) < 0n ? "text-danger" : "text-ink")}>{fmt(data.balance)}</div>
            </div>
            <div className="rounded-lg border border-line p-3">
              <div className="text-[11px] uppercase tracking-wider text-ink-3">Dette (appro − remb.)</div>
              <div className="mt-1 text-lg font-bold tabular-nums text-warning">{fmt(data.debt)}</div>
            </div>
          </div>
          {data.bankLabel && (
            <p className="flex items-center gap-1.5 text-[12px] text-ink-3"><Building2 className="h-3.5 w-3.5" /> {data.bankLabel}</p>
          )}
          <div className="rounded-lg border border-line">
            <div className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Mouvements</div>
            <ul className="max-h-72 divide-y divide-line overflow-y-auto">
              {data.movements.length === 0 ? (
                <li className="px-3 py-6 text-center text-[12px] text-ink-3">Aucun mouvement.</li>
              ) : (
                data.movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] text-ink">{m.reason}</div>
                      <div className="text-[11px] text-ink-3">{m.typeLabel} · {formatDate(m.occurredAt)}</div>
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
        </div>
      )}
    </TreasuryModal>
  );
}
