"use client";

import Link from "next/link";
import { ArrowLeft, AlertOctagon, AlertTriangle } from "lucide-react";
import { usePriorityInbox } from "@/hooks/useDgMessaging";
import { MessagePriorityBadge } from "@/components/messaging/MessagePriorityBadge";
import { formatDate, formatRelativeDate } from "@/lib/format";

export default function PriorityInboxPage() {
  const { data, isLoading } = usePriorityInbox();

  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <Link
          href="/messagerie"
          className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à la messagerie
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink">Mes messages prioritaires</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Tableau de bord des messages marqués HIGH ou URGENT non encore traités.
        </p>
      </header>

      {isLoading || !data ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Stat icon={<AlertOctagon className="h-4 w-4 text-danger" />} label="Urgents" value={data.summary.urgent} tone={data.summary.urgent > 0 ? "danger" : "ok"} />
            <Stat icon={<AlertTriangle className="h-4 w-4 text-warning" />} label="Importants" value={data.summary.high} tone="warning" />
            <Stat label="Total" value={data.summary.total} />
          </div>

          {data.items.length === 0 ? (
            <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center text-[13px] text-success">
              ✓ Aucun message prioritaire en attente.
            </div>
          ) : (
            <ul className="space-y-2">
              {data.items.map((m) => (
                <li key={m.id} className="rounded-xl border border-line bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12.5px] font-semibold text-ink">{m.sender}</span>
                        <span className="text-[10.5px] uppercase tracking-wider text-ink-3">{m.senderRole}</span>
                        <MessagePriorityBadge priority={m.priority} />
                      </div>
                      <Link
                        href={`/messagerie?conversation=${m.conversation.id}`}
                        className="mt-1 block text-[13.5px] text-ink hover:text-primary-700"
                      >
                        {m.content.slice(0, 200)}
                        {m.content.length > 200 && "…"}
                      </Link>
                      <div className="mt-1 text-[11px] text-ink-3">
                        Dans <strong>{m.conversation.name ?? "Conversation"}</strong>
                        {m.conversation.isStrategic && <span className="ml-1 text-primary-700">· Stratégique</span>}
                        {" · "}
                        {formatRelativeDate(m.createdAt)} ({formatDate(m.createdAt, "dd/MM HH:mm")})
                      </div>
                    </div>
                    <Link
                      href={`/messagerie?conversation=${m.conversation.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
                    >
                      Ouvrir
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

function Stat({ icon, label, value, tone }: { icon?: React.ReactNode; label: string; value: number; tone?: "ok" | "warning" | "danger" }) {
  return (
    <div
      className={
        "rounded-lg border p-3 shadow-card " +
        (tone === "danger" ? "border-danger/30 bg-danger/5" : tone === "warning" ? "border-warning/30 bg-warning/5" : "border-line bg-white")
      }
    >
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className="mt-1 font-mono text-[20px] font-bold text-ink">{value}</div>
    </div>
  );
}
