"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Check, X, AlertCircle, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface Change {
  field: string;
  currentValue: string | null;
  requestedValue: string | null;
}

interface Request {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reason: string | null;
  changes: unknown;
  reviewComment: string | null;
  reviewedAt: string | null;
  reviewer: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    position: string | null;
  };
}

interface Props {
  initial: {
    stats: { pending: number; approved: number; rejected: number; cancelled: number };
    items: Request[];
  };
  initialStatus: string;
}

const STATUS_CFG: Record<
  Request["status"],
  { label: string; cls: string }
> = {
  PENDING: { label: "En attente", cls: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approuvée", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Refusée", cls: "bg-rose-100 text-rose-700" },
  CANCELLED: { label: "Annulée", cls: "bg-ink-3/15 text-ink-3" },
};

const FIELD_LABELS: Record<string, string> = {
  firstName: "Prénom",
  lastName: "Nom",
  phone: "Téléphone",
  phoneMobile: "Téléphone perso",
  personalEmail: "Email perso",
  address: "Adresse",
  dateOfBirth: "Date de naissance",
  cniNumber: "N° CNI",
  familyStatus: "Situation familiale",
  emergencyContactName: "Contact d'urgence (nom)",
  emergencyContactPhone: "Contact d'urgence (tél)",
  cnpsNumber: "N° CNPS",
  niu: "NIU (DGI)",
  bankName: "Banque",
  bankAgency: "Agence",
  rib: "RIB",
  professionalCategory: "Catégorie BTP",
  position: "Poste",
};

export function ChangeRequestsClient({ initial, initialStatus }: Props) {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";
  const [status] = useState(initialStatus);
  const { stats, items } = initial;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, action: "approve" | "reject") {
    const comment =
      action === "reject"
        ? prompt("Motif du refus (visible par l'employé) :")
        : prompt("Commentaire (optionnel) :") ?? undefined;
    if (action === "reject" && (!comment || comment.length < 3)) {
      setError("Motif requis pour un refus");
      return;
    }
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/it/change-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur");
      return;
    }
    router.refresh();
  }

  function changeStatus(s: string) {
    const url = new URL(window.location.href);
    if (s === "PENDING") url.searchParams.delete("status");
    else url.searchParams.set("status", s);
    router.push(url.pathname + url.search);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-ink">
          Demandes de modification de profil
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          Validez ou refusez les demandes de mise à jour soumises par les
          employés depuis leur page profil.
        </p>
      </header>

      {/* Tabs / stats */}
      <nav className="flex gap-1 border-b border-line">
        {(["PENDING", "APPROVED", "REJECTED", "all"] as const).map((s) => {
          const count =
            s === "all"
              ? stats.pending + stats.approved + stats.rejected + stats.cancelled
              : s === "PENDING"
                ? stats.pending
                : s === "APPROVED"
                  ? stats.approved
                  : stats.rejected;
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => changeStatus(s)}
              className={clsx(
                "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium",
                active
                  ? "border-primary text-primary-700"
                  : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {s === "PENDING"
                ? "En attente"
                : s === "APPROVED"
                  ? "Approuvées"
                  : s === "REJECTED"
                    ? "Refusées"
                    : "Toutes"}
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  active ? "bg-primary-100 text-primary-700" : "bg-ink-3/10 text-ink-3",
                  s === "PENDING" && count > 0 && !active && "bg-amber-100 text-amber-800",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {error ? (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="mr-1 inline h-3.5 w-3.5" /> {error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-ink-3">
          Aucune demande dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((req) => {
            const cfg = STATUS_CFG[req.status];
            const changes = (req.changes as Change[]) ?? [];
            return (
              <article
                key={req.id}
                className="overflow-hidden rounded-xl border border-line bg-white shadow-card"
              >
                <header className="flex flex-wrap items-start gap-3 border-b border-line p-4">
                  <Link
                    href={`/${tenantSlug}/informatique/users/${req.user.id}`}
                    className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-semibold text-white shadow-brand"
                  >
                    {req.user.firstName.charAt(0)}
                    {req.user.lastName.charAt(0)}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${tenantSlug}/informatique/users/${req.user.id}`}
                      className="text-sm font-semibold text-ink hover:text-primary"
                    >
                      {req.user.firstName} {req.user.lastName}
                    </Link>
                    <div className="text-xs text-ink-3">
                      {req.user.email} · {req.user.role}
                      {req.user.position ? ` · ${req.user.position}` : ""}
                    </div>
                    <div className="mt-1 text-[11px] text-ink-3">
                      Soumis le{" "}
                      {new Date(req.createdAt).toLocaleString("fr-FR")}
                      {req.reviewedAt
                        ? ` · ${req.status === "APPROVED" ? "approuvé" : "refusé"} le ${new Date(req.reviewedAt).toLocaleString("fr-FR")} par ${req.reviewer ?? "—"}`
                        : ""}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}
                  >
                    {cfg.label}
                  </span>
                </header>

                <div className="p-4">
                  {req.reason ? (
                    <p className="mb-3 rounded-md bg-surface-alt px-3 py-2 text-xs text-ink-2">
                      <strong className="text-ink">Raison :</strong> {req.reason}
                    </p>
                  ) : null}
                  {req.reviewComment ? (
                    <p className="mb-3 rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-700">
                      <strong>Décision IT :</strong> {req.reviewComment}
                    </p>
                  ) : null}

                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    Champs demandés ({changes.length})
                  </p>
                  <ul className="space-y-1.5">
                    {changes.map((c, idx) => (
                      <li
                        key={idx}
                        className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface-alt px-3 py-2 text-xs"
                      >
                        <span className="font-semibold text-ink">
                          {FIELD_LABELS[c.field] ?? c.field}
                        </span>
                        <span className="font-mono text-rose-600 line-through">
                          {c.currentValue || "—"}
                        </span>
                        <ChevronRight className="h-3 w-3 text-ink-3" />
                        <span className="font-mono text-emerald-700">
                          {c.requestedValue || "—"}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {req.status === "PENDING" ? (
                    <div className="mt-4 flex gap-2 border-t border-line pt-3">
                      <button
                        type="button"
                        onClick={() => decide(req.id, "approve")}
                        disabled={busy === req.id}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" /> Approuver
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(req.id, "reject")}
                        disabled={busy === req.id}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <X className="h-3.5 w-3.5" /> Refuser
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
