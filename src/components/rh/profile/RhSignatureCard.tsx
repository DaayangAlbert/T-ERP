"use client";

import { useEffect, useState } from "react";
import { PenLine, Save } from "lucide-react";
import { clsx } from "clsx";
import { useRhSignature, useUpdateRhSignature } from "@/hooks/useRhProfile";
import { useAuth } from "@/hooks/useAuth";

export function RhSignatureCard() {
  const { data, isLoading } = useRhSignature();
  const update = useUpdateRhSignature();
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState<string[]>([]);

  useEffect(() => {
    if (data) setAuthorized(data.authorizedDocs);
  }, [data]);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const toggle = (k: string) => setAuthorized((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-4">
      <header className="flex items-center gap-2">
        <PenLine className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-ink">Documents que je peux signer</h3>
      </header>
      <p className="text-[11.5px] text-ink-3">
        Liste des documents RH pour lesquels {user ? `${user.firstName} ${user.lastName} est` : "le RH est"} autorisé{user ? "(e)" : ""} à signer seul{user ? "(e)" : ""}.
        Les documents non cochés nécessitent une cosignature DG / Direction.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {data.availableDocTypes.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => toggle(d.key)}
            className={clsx(
              "rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition",
              authorized.includes(d.key)
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-line bg-white text-ink-3 hover:bg-surface-alt"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled={update.isPending}
          onClick={() => update.mutate({ authorizedDocs: authorized })}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {update.isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
