"use client";

import { useState } from "react";
import { ReminderLevel, ReminderChannel } from "@prisma/client";
import { useActiveReminders, useSendReminder } from "@/hooks/useDafReceivables";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { formatDate, formatFCFA, formatRelativeDate } from "@/lib/format";
import { clsx } from "clsx";

const LEVEL_BADGE: Record<ReminderLevel, { label: string; cls: string }> = {
  R1_AMIABLE: { label: "R1 Amiable", cls: "bg-info/10 text-info" },
  R2_FIRM: { label: "R2 Ferme", cls: "bg-warning/10 text-warning" },
  R3_FORMAL_NOTICE: { label: "R3 Mise en demeure", cls: "bg-danger/10 text-danger" },
  LITIGATION: { label: "Contentieux", cls: "bg-ink/10 text-ink" },
};

const CHANNEL_LABEL: Record<ReminderChannel, string> = {
  EMAIL: "Email",
  LETTER: "Lettre simple",
  REGISTERED_MAIL: "LR/AR",
  PHONE: "Téléphone",
  BAILIFF: "Huissier",
};

export function ActiveRemindersList() {
  const { data, isLoading } = useActiveReminders();
  const send = useSendReminder();
  const [openId, setOpenId] = useState<string | null>(null);
  // Relances clients : DAF (FULL) ou ACCOUNTANT (FULL sur CPT, READ sur DAF).
  // L'autorisation est en réalité côté Comptabilité, donc on lit CPT.
  const canAct = useAccess(MODULES.CPT).canEdit;

  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  if (data.items.length === 0) {
    return (
      <section className="rounded-lg border border-success/30 bg-success/5 p-6 text-center text-[13px] text-success">
        ✓ Aucun dossier en relance active.
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Dossiers en relance ({data.items.length})
      </h3>
      <ul className="space-y-2">
        {data.items.map((r) => {
          const level = r.currentLevel ?? "R1_AMIABLE";
          const badge = LEVEL_BADGE[level];
          return (
            <li key={r.id} className="rounded-xl border border-line bg-white p-3 shadow-card sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink">{r.clientName}</span>
                    <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", badge.cls)}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-ink-3">{r.invoiceRef}</div>
                  <div className="mt-1 font-mono text-[15px] font-semibold text-ink">
                    {formatFCFA(BigInt(r.amount))}
                  </div>
                  <div className="text-[11px] text-ink-3">
                    Retard <strong className="text-danger">{r.daysOverdue} j</strong>
                    {r.lastReminderAt && (
                      <span> · Dernière relance {formatRelativeDate(r.lastReminderAt)} ({CHANNEL_LABEL[r.lastReminderChannel ?? "EMAIL"]})</span>
                    )}
                  </div>
                </div>
                {canAct && (
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                    className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
                  >
                    Escalader
                  </button>
                )}
              </div>

              {openId === r.id && (
                <div className="mt-3 space-y-2 rounded-md border border-primary-200 bg-primary-50/40 p-3">
                  <p className="text-[11px] text-ink-3">
                    L&apos;escalade met à jour le niveau du dossier et notifie le comptable
                    responsable du suivi pour exécution de la relance.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <NewReminderForm
                      onSubmit={async (level, channel) => {
                        const res = await send.mutateAsync({ id: r.id, level, channel });
                        setOpenId(null);
                        alert(res.note);
                      }}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NewReminderForm({ onSubmit }: { onSubmit: (level: ReminderLevel, channel: ReminderChannel) => Promise<void> }) {
  const [level, setLevel] = useState<ReminderLevel>("R1_AMIABLE");
  const [channel, setChannel] = useState<ReminderChannel>("EMAIL");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    try {
      await onSubmit(level, channel);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <label className="text-[10.5px] font-medium uppercase tracking-wider text-ink-3">
        Nouveau niveau
        <select value={level} onChange={(e) => setLevel(e.target.value as ReminderLevel)} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] font-normal normal-case">
          {Object.entries(LEVEL_BADGE).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </label>
      <label className="text-[10.5px] font-medium uppercase tracking-wider text-ink-3">
        Canal préconisé
        <select value={channel} onChange={(e) => setChannel(e.target.value as ReminderChannel)} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] font-normal normal-case">
          {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="inline-flex h-9 items-center justify-center self-end rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
      >
        {pending ? "Escalade…" : "Escalader"}
      </button>
    </>
  );
}
