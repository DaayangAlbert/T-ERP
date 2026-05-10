"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plus, Trash2, UserPlus } from "lucide-react";
import { useCreateProxy, useEndProxy, useProxies, type ProxyHolder } from "@/hooks/useDafProfile";

function fmt(amount: string | null | undefined): string {
  if (!amount) return "Sans plafond";
  return `${new Intl.NumberFormat("fr-FR").format(Number(amount))} FCFA`;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface CandidateUser {
  id: string;
  name: string;
  role: string;
  position: string | null;
}

function NewProxyDialog({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<CandidateUser[]>([]);
  const [toUserId, setToUserId] = useState("");
  const [scope, setScope] = useState("Signature bancaire chèques courants");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const create = useCreateProxy();

  useEffect(() => {
    fetch("/api/validations/eligible-approvers", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { items?: CandidateUser[] }) => setUsers(d.items ?? []))
      .catch(() => setUsers([]));
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-2">
          <h3 className="text-sm font-semibold text-ink">Nouvelle procuration</h3>
          <p className="text-[12px] text-ink-3">Déléguer ma signature financière en cas d&apos;absence.</p>
        </header>
        <div className="space-y-2">
          <select
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
          >
            <option value="">— Sélectionner le délégataire —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.position ?? u.role})
              </option>
            ))}
          </select>
          <input
            type="text"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Étendue (ex. signature chèques courants UBA)"
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
          />
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-[11px] text-ink-3">Plafond</label>
              <input
                type="text"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="Sans plafond"
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-ink-3">Début</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-ink-3">Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt">
            Annuler
          </button>
          <button
            type="button"
            disabled={!toUserId || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  toUserId,
                  scope,
                  maxAmount: maxAmount.trim() || undefined,
                  startDate,
                  endDate: endDate.trim() || undefined,
                },
                { onSuccess: onClose }
              )
            }
            className="h-8 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

function ProxyRow({ p, onEnd }: { p: ProxyHolder; onEnd: () => void }) {
  return (
    <div className="rounded-md border border-line bg-white p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink">{p.name}</div>
          {p.position && <div className="text-[11px] text-ink-3">{p.position}</div>}
          {p.scope && <div className="text-[11.5px] italic text-ink-2">« {p.scope} »</div>}
        </div>
        {p.active && (
          <button
            type="button"
            onClick={onEnd}
            className="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50"
            title="Mettre fin à la procuration"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2 text-[11.5px]">
        <div>
          <div className="text-[10.5px] uppercase text-ink-3">Plafond</div>
          <div className="font-mono text-ink">{fmt(p.maxAmount)}</div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase text-ink-3">Période</div>
          <div className="text-ink">
            {fmtDate(p.startDate)} <ArrowRight className="inline h-3 w-3" /> {fmtDate(p.endDate)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProxiesCard() {
  const { data, isLoading } = useProxies();
  const end = useEndProxy();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-ink">Mes procurations délivrées</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-primary-500 px-2.5 text-[12.5px] font-semibold text-white hover:bg-primary-600"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvelle
        </button>
      </header>

      {isLoading || !data ? (
        <div className="h-20 animate-pulse rounded-md bg-surface-alt" />
      ) : data.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-surface-alt p-3 text-center text-[12.5px] text-ink-3">
          Aucune procuration active.
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((p) => (
            <ProxyRow key={p.id} p={p} onEnd={() => end.mutate(p.id)} />
          ))}
        </div>
      )}

      {data && data.history.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[11.5px] text-ink-3 hover:text-ink">
            Historique ({data.history.length})
          </summary>
          <div className="mt-2 space-y-1.5">
            {data.history.slice(0, 5).map((p) => (
              <ProxyRow key={p.id} p={p} onEnd={() => {}} />
            ))}
          </div>
        </details>
      )}

      {showNew && <NewProxyDialog onClose={() => setShowNew(false)} />}
    </div>
  );
}
