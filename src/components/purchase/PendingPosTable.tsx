"use client";

import { useState } from "react";
import { Check, X, Clock, AlertTriangle } from "lucide-react";
import { usePendingPos, useApprovePo, useRejectPo } from "@/hooks/usePurchase";
import { formatDate, formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

export function PendingPosTable() {
  const { data, isLoading } = usePendingPos();
  const approve = useApprovePo();
  const reject = useRejectPo();
  const [noteFor, setNoteFor] = useState<Record<string, string>>({});

  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  const onReject = async (id: string) => {
    const reason = prompt("Motif du rejet :")?.trim();
    if (!reason || reason.length < 3) return;
    await reject.mutateAsync({ id, reason });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={<Clock className="h-4 w-4 text-warning" />} label="BC en attente" value={String(data.summary.total)} />
        <Stat label="Montant cumulé" value={formatFCFA(BigInt(data.summary.totalAmount))} highlight />
        <Stat
          icon={data.summary.averageAgeDays > 5 ? <AlertTriangle className="h-4 w-4 text-warning" /> : null}
          label="Ancienneté moyenne"
          value={`${data.summary.averageAgeDays} j`}
          tone={data.summary.averageAgeDays > 7 ? "warning" : "ok"}
        />
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center text-[13px] text-success">
          ✓ Aucun BC en attente de votre validation.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.items.map((p) => (
            <li key={p.id} className="rounded-xl border border-line bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-3">{p.reference}</span>
                    <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                      {p.category}
                    </span>
                    {p.ageDays > 7 && (
                      <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-warning">
                        <Clock className="h-3 w-3" /> {p.ageDays} j
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-[14px] font-semibold text-ink">{p.label}</h3>
                  <div className="mt-0.5 text-[11.5px] text-ink-3">
                    Fournisseur <strong>{p.supplier}</strong> · DAF validé le{" "}
                    {p.dafApprovedAt ? formatDate(p.dafApprovedAt) : "—"}
                  </div>
                  {/* Workflow visuel mini */}
                  <div className="mt-2 flex items-center gap-1 text-[10px]">
                    <Step done label="Initiateur" />
                    <Sep />
                    <Step done label="DAF" />
                    <Sep />
                    <Step active label="DG (vous)" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-mono text-[18px] font-bold text-ink">{formatFCFA(BigInt(p.amount))}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={noteFor[p.id] ?? ""}
                  onChange={(e) => setNoteFor((s) => ({ ...s, [p.id]: e.target.value }))}
                  placeholder="Note (optionnel)"
                  className="h-9 rounded-md border border-line bg-white px-2.5 text-[13px]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approve.mutate({ id: p.id, note: noteFor[p.id] })}
                    disabled={approve.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-success px-3 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" /> Valider
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(p.id)}
                    disabled={reject.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-danger px-3 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" /> Rejeter
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ icon, label, value, highlight, tone }: { icon?: React.ReactNode; label: string; value: string; highlight?: boolean; tone?: "ok" | "warning" }) {
  return (
    <div
      className={clsx(
        "rounded-lg border p-3 shadow-card",
        highlight ? "border-primary-300 bg-primary-50" : tone === "warning" ? "border-warning/30 bg-warning/5" : "border-line bg-white"
      )}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className={clsx("mt-1 font-mono text-[18px] font-bold", highlight ? "text-primary-800" : "text-ink")}>{value}</div>
    </div>
  );
}

function Step({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <span
      className={clsx(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold",
        done && "bg-success/10 text-success",
        active && "bg-primary-100 text-primary-700",
        !done && !active && "bg-ink-3/10 text-ink-3"
      )}
    >
      {done && "✓ "}
      {label}
    </span>
  );
}

function Sep() {
  return <span className="text-ink-3">→</span>;
}
