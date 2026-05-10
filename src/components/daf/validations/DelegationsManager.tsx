"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plus, Trash2, UserCheck, UserPlus } from "lucide-react";
import { useCreateDelegation, useDelegations, useEndDelegation, type DelegationItem } from "@/hooks/useDafValidationsCircuit";

const TYPE_LABEL: Record<string, string> = {
  PAYROLL: "Paie",
  EXPENSE: "Dépense",
  PURCHASE: "Achat",
  HIRING: "Embauche",
  CONTRACT: "Marché",
  LEAVE: "Congé",
  OTHER: "Autre",
  AMENDMENT: "Avenant marché",
  SUBCONTRACTING: "Sous-traitance",
  EQUIPMENT: "Acquisition matériel",
  SPECIAL_METHOD: "Méthode spéciale",
  TECHNICAL_HANDOVER: "Mise en service",
};

function fmt(amount: string | null): string {
  if (!amount) return "Sans plafond";
  return `${new Intl.NumberFormat("fr-FR").format(Number(amount))} FCFA`;
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface CandidateUser {
  id: string;
  name: string;
  role: string;
  position: string | null;
}

function NewDelegationDialog({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<CandidateUser[]>([]);
  const [toUserId, setToUserId] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const create = useCreateDelegation();

  useEffect(() => {
    fetch("/api/validations/eligible-approvers", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { items?: CandidateUser[] }) => setUsers(d.items ?? []))
      .catch(() => setUsers([]));
  }, []);

  const toggleType = (t: string) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = () => {
    if (!toUserId || types.length === 0) return;
    create.mutate(
      {
        toUserId,
        types,
        maxAmount: maxAmount.trim() || undefined,
        startDate,
        endDate: endDate.trim() || undefined,
        reason: reason.trim() || undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-ink">Nouvelle délégation</h3>
          <p className="text-[12px] text-ink-3">Déléguer mes pouvoirs N2 à un autre utilisateur.</p>
        </header>
        <div className="space-y-2">
          <label className="block text-[11.5px] font-medium text-ink-3">Délégataire</label>
          <select
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
          >
            <option value="">— Sélectionner —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.position ? ` (${u.position})` : ` (${u.role})`}
              </option>
            ))}
          </select>

          <label className="mt-2 block text-[11.5px] font-medium text-ink-3">Types couverts</label>
          <div className="flex flex-wrap gap-1">
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => toggleType(k)}
                className={`rounded-md border px-2 py-1 text-[11.5px] ${
                  types.includes(k) ? "border-primary-500 bg-primary-50 text-primary-700" : "border-line bg-white text-ink-3"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11.5px] font-medium text-ink-3">Plafond (FCFA)</label>
              <input
                type="text"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="Sans plafond"
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-ink-3">Début</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-ink-3">Fin (option.)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </div>
          </div>

          <label className="mt-1 block text-[11.5px] font-medium text-ink-3">Motif (optionnel)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="ex. Mission CAC du 12 au 16 mai"
            className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[13px]"
          />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt">
            Annuler
          </button>
          <button
            type="button"
            disabled={!toUserId || types.length === 0 || create.isPending}
            onClick={submit}
            className="h-8 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {create.isPending ? "Création..." : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DelegationCard({ d, mode, onEnd }: { d: DelegationItem; mode: "out" | "in" | "history"; onEnd?: () => void }) {
  const Icon = mode === "out" ? UserPlus : UserCheck;
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon className="h-4 w-4 flex-shrink-0 text-primary-500" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink">
              {mode === "out" ? d.to : mode === "in" ? d.from : `${d.from} → ${d.to}`}
            </div>
            {(d.toPosition || d.fromPosition) && (
              <div className="text-[11px] text-ink-3">{mode === "out" ? d.toPosition : d.fromPosition}</div>
            )}
          </div>
        </div>
        {mode === "out" && onEnd && (
          <button
            type="button"
            onClick={onEnd}
            className="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50"
            title="Mettre fin à la délégation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {d.types.map((t) => (
          <span key={t} className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-medium text-primary-700">
            {TYPE_LABEL[t] ?? t}
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px]">
        <div>
          <div className="text-[10.5px] uppercase text-ink-3">Plafond</div>
          <div className="font-mono text-ink">{fmt(d.maxAmount)}</div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase text-ink-3">Période</div>
          <div className="text-ink">
            {fmtDate(d.startDate)} <ArrowRight className="inline h-3 w-3" /> {fmtDate(d.endDate)}
          </div>
        </div>
      </div>
      {d.reason && <div className="mt-1 text-[11.5px] italic text-ink-3">« {d.reason} »</div>}
    </div>
  );
}

export function DelegationsManager() {
  const { data, isLoading } = useDelegations();
  const end = useEndDelegation();
  const [showNew, setShowNew] = useState(false);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-ink-3">
          Vous gérez {data.outgoing.length} délégation{data.outgoing.length > 1 ? "s" : ""} active{data.outgoing.length > 1 ? "s" : ""}
          {data.incoming.length > 0 && ` · ${data.incoming.length} reçue${data.incoming.length > 1 ? "s" : ""}`}.
        </p>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-primary-500 px-2.5 text-[12.5px] font-semibold text-white hover:bg-primary-600"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvelle délégation
        </button>
      </div>

      <section>
        <h3 className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-ink-3">Mes délégations actives (sortantes)</h3>
        {data.outgoing.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-4 text-center text-[12.5px] text-ink-3">
            Aucune délégation active.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.outgoing.map((d) => (
              <DelegationCard key={d.id} d={d} mode="out" onEnd={() => end.mutate(d.id)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-ink-3">Délégations reçues (entrantes)</h3>
        {data.incoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-4 text-center text-[12.5px] text-ink-3">
            Aucune délégation reçue.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.incoming.map((d) => (
              <DelegationCard key={d.id} d={d} mode="in" />
            ))}
          </div>
        )}
      </section>

      {data.history.length > 0 && (
        <section>
          <h3 className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-ink-3">Historique récent</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.history.map((d) => (
              <DelegationCard key={d.id} d={d} mode="history" />
            ))}
          </div>
        </section>
      )}

      {showNew && <NewDelegationDialog onClose={() => setShowNew(false)} />}
    </div>
  );
}
