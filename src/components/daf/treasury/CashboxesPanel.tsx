"use client";

import { useMemo, useState } from "react";
import { Plus, Wallet, ArrowDownToLine, Ban } from "lucide-react";
import { clsx } from "clsx";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { useSitesLookup } from "@/hooks/useWarehouses";
import {
  useCashboxes,
  useCreateCashbox,
  useUpdateCashbox,
  useFundCashbox,
  type CashboxItem,
  type BankAccountItem,
} from "@/hooks/useDafTreasury";
import { TreasuryModal, Field, inputCls } from "./TreasuryModal";

function fmt(n: string): string {
  return new Intl.NumberFormat("fr-FR").format(Number(n));
}

export function CashboxesPanel({ banks }: { banks: BankAccountItem[] }) {
  const canManage = useAccess(MODULES.DAF).canEdit;
  const { data, isLoading } = useCashboxes();
  const [createOpen, setCreateOpen] = useState(false);
  const [funding, setFunding] = useState<CashboxItem | null>(null);

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const items = data?.items ?? [];

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Caisses chantier</h2>
          <p className="text-[11.5px] text-ink-3">
            Comptes par chantier — entrées / sorties terrain.{" "}
            {data && (
              <span className="font-medium text-ink-2">
                Total actif : {fmt(data.summary.activeTotal)} FCFA
              </span>
            )}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-3.5 w-3.5" /> Nouvelle caisse
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface-alt p-6 text-center">
          <Wallet className="mx-auto h-7 w-7 text-ink-3" />
          <p className="mt-2 text-[12.5px] text-ink-3">
            Aucune caisse chantier. Créez-en une pour suivre les flux d&apos;un chantier.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => (
            <CashboxCard
              key={c.id}
              cashbox={c}
              canManage={canManage}
              onFund={() => setFunding(c)}
            />
          ))}
        </div>
      )}

      {canManage && createOpen && (
        <CreateCashboxModal
          existingSiteIds={items.map((c) => c.siteId)}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {canManage && funding && (
        <FundCashboxModal
          key={funding.id}
          cashbox={funding}
          banks={banks}
          onClose={() => setFunding(null)}
        />
      )}
    </section>
  );
}

function CashboxCard({
  cashbox,
  canManage,
  onFund,
}: {
  cashbox: CashboxItem;
  canManage: boolean;
  onFund: () => void;
}) {
  const update = useUpdateCashbox();
  const close = () => {
    if (!confirm(`Clôturer la caisse du chantier ${cashbox.siteCode} ?`)) return;
    update.mutate({ id: cashbox.id, isActive: false });
  };

  return (
    <div className={clsx("rounded-xl border bg-white p-3 shadow-card", cashbox.isActive ? "border-line" : "border-line opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink">{cashbox.siteName}</div>
          <div className="font-mono text-[10.5px] text-ink-3">{cashbox.siteCode}</div>
        </div>
        {!cashbox.isActive && (
          <span className="rounded-full bg-ink-3/10 px-2 py-0.5 text-[10px] font-semibold text-ink-3">Clôturée</span>
        )}
      </div>
      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-wider text-ink-3">Solde</div>
        <div className="font-mono text-[18px] font-bold tabular-nums text-ink">{fmt(cashbox.balance)}<span className="ml-1 text-[11px] font-medium text-ink-3">FCFA</span></div>
      </div>
      {cashbox.custodianName && (
        <div className="mt-1 text-[11px] text-ink-3">Dépositaire : {cashbox.custodianName}</div>
      )}
      {canManage && cashbox.isActive && (
        <div className="mt-3 flex gap-2 border-t border-line pt-2">
          <button
            type="button"
            onClick={onFund}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary-50 py-1.5 text-[12px] font-medium text-primary-700 hover:bg-primary-100"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" /> Approvisionner
          </button>
          <button
            type="button"
            onClick={close}
            title="Clôturer"
            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md border border-line text-ink-3 hover:bg-rose-50 hover:text-rose-600"
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function CreateCashboxModal({
  existingSiteIds,
  onClose,
}: {
  existingSiteIds: string[];
  onClose: () => void;
}) {
  const { data: sitesData } = useSitesLookup();
  const create = useCreateCashbox();
  const [siteId, setSiteId] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const availableSites = useMemo(
    () => (sitesData?.items ?? []).filter((s) => !existingSiteIds.includes(s.id)),
    [sitesData, existingSiteIds]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!siteId) {
      setError("Sélectionnez un chantier.");
      return;
    }
    try {
      await create.mutateAsync({ siteId, initialBalance: initialBalance.replace(/\D/g, "") || "0" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title="Nouvelle caisse chantier">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Chantier">
          <select className={inputCls} value={siteId} onChange={(e) => setSiteId(e.target.value)} required>
            <option value="">— Sélectionner —</option>
            {availableSites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </Field>
        {availableSites.length === 0 && (
          <p className="text-[12px] text-ink-3">Tous les chantiers ont déjà une caisse.</p>
        )}
        <Field label="Solde d'ouverture (FCFA)">
          <input className={inputCls} inputMode="numeric" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
        </Field>
        <p className="text-[11.5px] text-ink-3">
          Le dépositaire est défini automatiquement (chef de chantier). Vous pourrez approvisionner la caisse depuis un compte bancaire.
        </p>

        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">
            Annuler
          </button>
          <button type="submit" disabled={create.isPending} className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {create.isPending ? "Création…" : "Créer la caisse"}
          </button>
        </div>
      </form>
    </TreasuryModal>
  );
}

function FundCashboxModal({
  cashbox,
  banks,
  onClose,
}: {
  cashbox: CashboxItem;
  banks: BankAccountItem[];
  onClose: () => void;
}) {
  const fund = useFundCashbox();
  const [bankAccountId, setBankAccountId] = useState(banks[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Approvisionnement caisse chantier");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = amount.replace(/\D/g, "");
    if (!bankAccountId) return setError("Sélectionnez un compte bancaire source.");
    if (!clean || clean === "0") return setError("Montant invalide.");
    try {
      await fund.mutateAsync({
        id: cashbox.id,
        bankAccountId,
        amount: clean,
        reason: reason.trim() || "Approvisionnement caisse chantier",
        reference: reference.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title={`Approvisionner — ${cashbox.siteCode}`}>
      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-md bg-surface-alt px-3 py-2 text-[12px] text-ink-2">
          Le montant sera <strong>débité du compte bancaire</strong> choisi et <strong>crédité sur la caisse</strong> du chantier {cashbox.siteName}.
        </div>
        <Field label="Compte bancaire source">
          <select className={inputCls} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
            {banks.length === 0 && <option value="">Aucun compte bancaire</option>}
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bank} — {b.accountNumber} ({fmt(b.balance)} FCFA)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Montant (FCFA)">
          <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
        </Field>
        <Field label="Motif">
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Field label="Référence (optionnel)">
          <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° chèque, virement…" />
        </Field>

        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">
            Annuler
          </button>
          <button type="submit" disabled={fund.isPending || banks.length === 0} className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {fund.isPending ? "Transfert…" : "Approvisionner"}
          </button>
        </div>
      </form>
    </TreasuryModal>
  );
}
