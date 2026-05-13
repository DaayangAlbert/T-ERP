"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { clsx } from "clsx";

interface Promotion {
  id: string;
  fromRole: string;
  toRole: string;
  requestedSiteIds: string[];
  justification: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  validatorRoles: string[];
  validations: Array<{ validatorId: string; validatorRole: string; decision: string; validatedAt: string }>;
  requestedAt: string;
  resolvedAt: string | null;
  targetUser: { firstName: string; lastName: string; email: string; role: string };
  requestedBy: { firstName: string; lastName: string; role: string };
}

export default function AdminPromotionsPage() {
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "promotions", tab],
    queryFn: async () => {
      const res = await fetch(`/api/admin/promotions?status=${tab}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Promotion[] }>;
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, decision, comment }: { id: string; decision: "APPROVE" | "REJECT"; comment?: string }) => {
      const res = await fetch(`/api/admin/promotions/${id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "promotions"] }),
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-config-promotions">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Workflow promotions</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Demandes RH de changement de rôle / extension de périmètre — validation N1 (DAF / DT) puis application auto.
        </p>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
              tab === t ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t === "PENDING" && <Clock className="h-3.5 w-3.5" />}
            {t === "APPROVED" && <CheckCircle2 className="h-3.5 w-3.5" />}
            {t === "REJECTED" && <XCircle className="h-3.5 w-3.5" />}
            {t === "PENDING" ? "En attente" : t === "APPROVED" ? "Approuvées" : "Rejetées"}
            {tab === t && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
          Aucune demande {tab === "PENDING" ? "en attente" : tab === "APPROVED" ? "approuvée" : "rejetée"}.
        </p>
      ) : (
        <div className="space-y-3">
          {data?.items.map((p) => (
            <article key={p.id} className="rounded-xl border border-line bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">
                    {p.targetUser.firstName} {p.targetUser.lastName}
                    <span className="ml-2 text-[12px] font-normal text-ink-3">{p.targetUser.email}</span>
                  </div>
                  <div className="mt-1 text-[12.5px] text-ink-2">
                    {p.fromRole} → <span className="font-medium text-primary-700">{p.toRole}</span>
                    {p.requestedSiteIds.length > 0 && (
                      <span className="ml-2 text-ink-3">· {p.requestedSiteIds.length} chantier(s) demandé(s)</span>
                    )}
                  </div>
                  <p className="mt-2 text-[12.5px] text-ink-2">{p.justification}</p>
                  <div className="mt-2 text-[11.5px] text-ink-3">
                    Demandé par {p.requestedBy.firstName} {p.requestedBy.lastName} ({p.requestedBy.role}) ·
                    {" "}
                    {new Date(p.requestedAt).toLocaleString("fr-FR")}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.validatorRoles.map((r) => {
                      const v = p.validations.find((v) => v.validatorRole === r);
                      return (
                        <span
                          key={r}
                          className={clsx(
                            "rounded px-2 py-0.5 text-[11px] font-medium",
                            !v && "bg-ink-3/10 text-ink-3",
                            v?.decision === "APPROVE" && "bg-success/10 text-success",
                            v?.decision === "REJECT" && "bg-danger/10 text-danger"
                          )}
                        >
                          {r} {v?.decision === "APPROVE" ? "✓" : v?.decision === "REJECT" ? "✗" : "…"}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {p.status === "PENDING" && (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => decide.mutate({ id: p.id, decision: "APPROVE" })}
                      disabled={decide.isPending}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-success px-3 text-[12px] font-medium text-white hover:bg-success/90 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approuver
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const comment = window.prompt("Motif du refus");
                        if (comment) decide.mutate({ id: p.id, decision: "REJECT", comment });
                      }}
                      disabled={decide.isPending}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-danger/40 bg-white px-3 text-[12px] font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Refuser
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
