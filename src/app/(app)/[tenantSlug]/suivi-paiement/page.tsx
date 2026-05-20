"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMyAssignedTracks } from "@/hooks/usePaymentCircuits";
import { PaymentTrackTimeline } from "@/components/daf/payment-circuits/PaymentTrackTimeline";
import { clsx } from "clsx";
import { ClipboardCheck, AlertOctagon, CheckCircle2 } from "lucide-react";

function fmtFCFA(amount: string): string {
  const n = Number(BigInt(amount));
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
}

export default function SuiviPaiementPage() {
  const { user } = useAuth();
  const [showCompleted, setShowCompleted] = useState(false);
  const { data, isLoading } = useMyAssignedTracks(showCompleted);

  const items = data?.items ?? [];
  const inProgress = items.filter((i) => !i.completedAt);
  const blocked = inProgress.filter((i) => i.isBlocked);
  const completed = items.filter((i) => i.completedAt);

  return (
    <div className="space-y-4">
      <header className="border-b border-line pb-3">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
          <ClipboardCheck className="h-6 w-6 text-primary-600" /> Suivi paiement assigné
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {user ? `${user.firstName} ${user.lastName} · ` : ""}
          Dossiers de paiement dont je suis responsable du suivi administratif client.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="En cours"
          value={inProgress.length}
          icon={<ClipboardCheck className="h-4 w-4 text-info" />}
          tone="info"
        />
        <KpiCard
          label="Bloqués"
          value={blocked.length}
          icon={<AlertOctagon className="h-4 w-4 text-danger" />}
          tone="danger"
        />
        <KpiCard
          label="Terminés"
          value={completed.length}
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          tone="success"
        />
      </div>

      {/* Toggle terminés */}
      <div className="flex items-center justify-between border-b border-line pb-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Dossiers ({items.length})
        </h2>
        <label className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded"
          />
          Inclure les terminés
        </label>
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13px] text-ink-3">
          <p>Aucun dossier de paiement à suivre. Tu seras notifié(e) dès qu&apos;un DAF te désignera.</p>
          {user && (
            <p className="mt-3 font-mono text-[10.5px] text-ink-3/70">
              Connecté en : {user.firstName} {user.lastName} ({user.role}) — id={user.id.slice(0, 12)}…
              <br />
              Si tu attendais des dossiers, vérifie auprès du DAF que l&apos;assignation a bien été
              faite sur cet identifiant. Recharge la page (Ctrl+F5) pour forcer un re-fetch.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id} className="rounded-xl border border-line bg-white p-3 shadow-card sm:p-4">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">{t.receivable.clientName}</h3>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">
                    {t.templateName} · {t.receivable.invoiceRef} ·{" "}
                    <strong className="font-mono text-ink-2">{fmtFCFA(t.receivable.amount)}</strong>
                  </p>
                </div>
                <div className="text-right">
                  {t.completedAt ? (
                    <span className="inline-flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                      <CheckCircle2 className="h-3 w-3" /> Terminé
                    </span>
                  ) : t.isBlocked ? (
                    <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                      <AlertOctagon className="h-3 w-3" /> Bloqué
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-info/10 px-2 py-0.5 text-[11px] font-semibold text-info">
                      En cours
                    </span>
                  )}
                  {t.receivable.daysOverdue > 0 && (
                    <div className="mt-0.5 font-mono text-[10.5px] text-danger">
                      Retard {t.receivable.daysOverdue} j
                    </div>
                  )}
                </div>
              </header>

              <div className="mt-3">
                <PaymentTrackTimeline trackId={t.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "info" | "danger" | "success";
}) {
  const ring = {
    info: "border-info/30 bg-info/5",
    danger: "border-danger/30 bg-danger/5",
    success: "border-success/30 bg-success/5",
  }[tone];

  return (
    <div className={clsx("rounded-xl border p-3", ring)}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className="mt-1 font-mono text-[22px] font-bold text-ink">{value}</div>
    </div>
  );
}
