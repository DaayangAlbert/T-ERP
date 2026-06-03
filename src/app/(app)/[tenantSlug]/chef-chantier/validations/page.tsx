"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  HardHat,
  Info,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { formatFCFA } from "@/lib/format";
import { PageHelp } from "@/components/help/PageHelp";
import { CcValidationsTutorial } from "@/components/help/tutorials/CcValidationsTutorial";

type LeaveItem = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string | null;
    avatarUrl: string | null;
  };
};
type HseItem = {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  isAnonymous: boolean;
  status: string;
  createdAt: string;
  site: { id: string; code: string; name: string };
  reporter: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
};
type AdvanceItem = {
  id: string;
  amountXAF: number;
  reason: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string | null;
    avatarUrl: string | null;
  };
};
type Response = {
  leaves: LeaveItem[];
  hse: HseItem[];
  advances: AdvanceItem[];
  summary: {
    leavesCount: number;
    hseCount: number;
    advancesCount: number;
    totalCount: number;
  };
};

type Tab = "leaves" | "hse" | "advances";

const SEVERITY_BADGE: Record<string, { label: string; tone: string }> = {
  CRITICAL: { label: "Critique", tone: "bg-danger/10 text-danger" },
  HIGH: { label: "Élevée", tone: "bg-amber-100 text-amber-800" },
  MEDIUM: { label: "Moyenne", tone: "bg-yellow-100 text-yellow-800" },
  LOW: { label: "Faible", tone: "bg-emerald-100 text-emerald-800" },
};

export default function CcValidationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("leaves");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cc", "validations", "pending"],
    queryFn: async (): Promise<Response> => {
      const res = await fetch("/api/cc/validations/pending", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 15_000,
  });

  // Validation N1 d'un congé : utilise la route RH existante (CC est
  // autorisé en tant que validatorUserId du LeaveRequest)
  const validateLeave = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approve" | "reject" }) => {
      const res = await fetch(`/api/rh/leaves/${id}/${decision}`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      setFeedback({
        tone: "ok",
        msg: vars.decision === "approve" ? "Congé approuvé (N1)" : "Congé refusé",
      });
      qc.invalidateQueries({ queryKey: ["cc", "validations", "pending"] });
    },
    onError: (e: Error) => setFeedback({ tone: "err", msg: e.message }),
  });

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Validations & demandes équipe
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Demandes des ouvriers de votre chantier — congés (à valider N1), signalements
            HSE assignés, avances en cours (information).
          </p>
        </div>
        <PageHelp title="Aide — Validations CC"><CcValidationsTutorial /></PageHelp>
      </header>

      {feedback && (
        <div
          className={clsx(
            "mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-[12.5px]",
            feedback.tone === "ok"
              ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border border-danger/30 bg-danger/5 text-danger",
          )}
        >
          {feedback.tone === "ok" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <div className="flex-1">{feedback.msg}</div>
          <button onClick={() => setFeedback(null)} aria-label="Fermer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Onglets */}
      <div className="mb-4 flex flex-wrap gap-1 overflow-x-auto border-b border-line">
        <TabButton
          active={tab === "leaves"}
          onClick={() => setTab("leaves")}
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="Congés à valider"
          count={data?.summary.leavesCount}
        />
        <TabButton
          active={tab === "hse"}
          onClick={() => setTab("hse")}
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          label="HSE assignés"
          count={data?.summary.hseCount}
        />
        <TabButton
          active={tab === "advances"}
          onClick={() => setTab("advances")}
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Avances équipe"
          count={data?.summary.advancesCount}
          info
        />
      </div>

      {isLoading && <div className="h-48 animate-pulse rounded-xl bg-surface-alt" />}

      {!isLoading && data && tab === "leaves" && (
        <LeavesTab
          items={data.leaves}
          busy={validateLeave.isPending}
          onApprove={(id) => validateLeave.mutate({ id, decision: "approve" })}
          onReject={(id) => validateLeave.mutate({ id, decision: "reject" })}
        />
      )}
      {!isLoading && data && tab === "hse" && <HseTab items={data.hse} />}
      {!isLoading && data && tab === "advances" && <AdvancesTab items={data.advances} />}
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  info,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  info?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition",
        active ? "text-primary-700" : "text-ink-3 hover:text-ink",
      )}
    >
      {icon}
      {label}
      {typeof count === "number" && count > 0 && (
        <span
          className={clsx(
            "rounded-full px-1.5 text-[10px] font-semibold",
            info ? "bg-blue-100 text-blue-700" : "bg-primary-100 text-primary-700",
          )}
        >
          {count}
        </span>
      )}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  );
}

function LeavesTab({
  items,
  busy,
  onApprove,
  onReject,
}: {
  items: LeaveItem[];
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-8 w-8 text-emerald-600" />}
        title="Aucun congé à valider"
        message="Toutes les demandes de congés de votre équipe sont traitées."
      />
    );
  }
  return (
    <div className="space-y-3">
      {items.map((l) => (
        <article key={l.id} className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex flex-wrap items-start gap-3 p-3">
            <Avatar
              firstName={l.user.firstName}
              lastName={l.user.lastName}
              url={l.user.avatarUrl}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold text-ink">
                {l.user.firstName} {l.user.lastName}{" "}
                {l.user.matricule && (
                  <span className="ml-1 text-[10.5px] font-normal text-ink-3">
                    · {l.user.matricule}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">
                {l.daysCount} jour{l.daysCount > 1 ? "s" : ""} · du{" "}
                {new Date(l.startDate).toLocaleDateString("fr-FR")} au{" "}
                {new Date(l.endDate).toLocaleDateString("fr-FR")}
              </div>
              {l.reason && (
                <p className="mt-1.5 text-[12.5px] text-ink-2 whitespace-pre-line">
                  {l.reason}
                </p>
              )}
            </div>
          </div>
          <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-3 py-2">
            <button
              onClick={() => onReject(l.id)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-danger/40 px-3 py-1.5 text-[12.5px] font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Refuser
            </button>
            <button
              onClick={() => onApprove(l.id)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <ClipboardCheck className="h-3.5 w-3.5" /> Approuver (N1)
            </button>
          </footer>
        </article>
      ))}
    </div>
  );
}

function HseTab({ items }: { items: HseItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-8 w-8 text-emerald-600" />}
        title="Aucun signalement assigné"
        message="Aucun incident HSE en cours sur votre chantier."
      />
    );
  }
  return (
    <div className="space-y-3">
      {items.map((h) => {
        const sev = SEVERITY_BADGE[h.severity] ?? SEVERITY_BADGE.MEDIUM;
        return (
          <article key={h.id} className="overflow-hidden rounded-xl border border-line bg-white">
            <header className="flex flex-wrap items-start gap-2 border-b border-line p-3">
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                  sev.tone,
                )}
              >
                <ShieldAlert className="h-3 w-3" /> {sev.label}
              </span>
              <span className="text-[11px] text-ink-3">{h.type}</span>
              <span className="ml-auto text-[11px] text-ink-3">
                {new Date(h.createdAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                })}
              </span>
            </header>
            <div className="p-3">
              <h3 className="text-[14px] font-semibold text-ink">{h.title}</h3>
              <p className="mt-1 text-[12.5px] text-ink-2 whitespace-pre-line">
                {h.description}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
                <span>
                  Chantier : <strong className="text-ink-2">{h.site.name}</strong>
                </span>
                {h.reporter && !h.isAnonymous && (
                  <span>
                    · Signalé par {h.reporter.firstName} {h.reporter.lastName}
                  </span>
                )}
                {h.isAnonymous && (
                  <span className="italic">· signalement anonyme</span>
                )}
              </div>
            </div>
            <footer className="border-t border-line bg-surface-alt px-3 py-2 text-[11.5px] text-ink-3">
              Statut : <strong className="text-ink-2">{h.status}</strong> · Marquer
              comme traité depuis l'onglet HSE chantier
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function AdvancesTab({ items }: { items: AdvanceItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Wallet className="h-8 w-8 text-blue-600" />}
        title="Aucune avance en cours"
        message="Pas de demande d'avance sur salaire en attente dans votre équipe."
      />
    );
  }
  return (
    <>
      <div className="mb-3 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-900">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          Vue informationnelle. La validation des avances est réservée à la DRH
          et à la DAF.
        </div>
      </div>
      <div className="space-y-3">
        {items.map((a) => (
          <article key={a.id} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-start gap-3 p-3">
              <Avatar
                firstName={a.user.firstName}
                lastName={a.user.lastName}
                url={a.user.avatarUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-ink">
                  {a.user.firstName} {a.user.lastName}
                </div>
                <div className="text-[11px] text-ink-3">
                  {a.user.matricule ?? "—"} · demandée le{" "}
                  {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                </div>
                <p className="mt-1.5 text-[12.5px] text-ink-2">{a.reason}</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-[16px] font-bold text-ink">
                  {formatFCFA(a.amountXAF)}
                </div>
                <div className="text-[10.5px] text-ink-3">FCFA · en attente RH/DAF</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface-alt p-8 text-center">
      <div className="mx-auto">{icon}</div>
      <h3 className="mt-2 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-[12.5px] text-ink-3">{message}</p>
    </div>
  );
}

function Avatar({
  firstName,
  lastName,
  url,
}: {
  firstName: string;
  lastName: string;
  url: string | null;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />;
  }
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary-100 text-[12px] font-semibold text-primary-700">
      {initials}
    </span>
  );
}
