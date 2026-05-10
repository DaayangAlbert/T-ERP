"use client";

import { useEffect, useState } from "react";
import { Building2, PenLine, Save, ShieldCheck, Users } from "lucide-react";
import { clsx } from "clsx";
import { useSignaturePower, useUpdateSignaturePower } from "@/hooks/useDafProfile";

const ALL_BANKS = ["UBA", "BICEC", "AFRILAND", "ECOBANK", "SGBC"];

function fmt(amount: string): string {
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

interface CandidateUser {
  id: string;
  name: string;
  role: string;
  position: string | null;
}

export function SignaturePowerCard() {
  const { data, isLoading } = useSignaturePower();
  const update = useUpdateSignaturePower();
  const [users, setUsers] = useState<CandidateUser[]>([]);
  const [solo, setSolo] = useState("");
  const [coSign, setCoSign] = useState("");
  const [coSigners, setCoSigners] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/validations/eligible-approvers", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { items?: CandidateUser[] }) => setUsers(d.items ?? []))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (data) {
      setSolo(data.soloLimit);
      setCoSign(data.coSignLimit);
      setCoSigners(data.coSigners.map((c) => c.id));
      setBanks(data.banksRegistered);
    }
  }, [data]);

  if (isLoading || !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const toggleBank = (b: string) => setBanks((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  const toggleSigner = (id: string) => setCoSigners((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-4">
      <header className="flex items-center gap-2">
        <PenLine className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-ink">Pouvoirs de signature</h3>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-[11px] uppercase tracking-wide text-ink-3">Plafond signature seul</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              value={solo}
              onChange={(e) => setSolo(e.target.value.replace(/\D/g, ""))}
              className="h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[13px]"
            />
            <span className="text-[11px] text-ink-3">FCFA</span>
          </div>
          <div className="mt-1 text-[11px] text-ink-3">Par défaut DAF : 5 000 000 FCFA · actuel {fmt(data.soloLimit)}</div>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-ink-3">Plafond cosignature DG</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              value={coSign}
              onChange={(e) => setCoSign(e.target.value.replace(/\D/g, ""))}
              className="h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[13px]"
            />
            <span className="text-[11px] text-ink-3">FCFA</span>
          </div>
          <div className="mt-1 text-[11px] text-ink-3">Par défaut : 50 000 000 FCFA · actuel {fmt(data.coSignLimit)}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-3">
          <Users className="h-3 w-3" /> Cosignataires possibles
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => toggleSigner(u.id)}
              className={clsx(
                "rounded-md border px-2 py-1 text-[11.5px] transition",
                coSigners.includes(u.id)
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-line bg-white text-ink-3 hover:bg-surface-alt"
              )}
            >
              {u.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-3">
          <Building2 className="h-3 w-3" /> Banques où ma signature est déposée
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ALL_BANKS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => toggleBank(b)}
              className={clsx(
                "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition",
                banks.includes(b)
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-line bg-white text-ink-3 hover:bg-surface-alt"
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled={update.isPending}
          onClick={() =>
            update.mutate({
              soloLimit: solo,
              coSignLimit: coSign,
              coSigners,
              banksRegistered: banks,
            })
          }
          className="inline-flex h-8 items-center gap-1 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {update.isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
