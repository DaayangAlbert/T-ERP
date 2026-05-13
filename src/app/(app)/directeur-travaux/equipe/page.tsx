"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserCog, X } from "lucide-react";
import { clsx } from "clsx";
import { useChantier } from "@/contexts/ChantierContext";

interface HierarchyNode {
  userId: string;
  name: string;
  position: string;
  role: string;
  isLeader: boolean;
  teamId: string | null;
  children: HierarchyNode[];
}

interface Team {
  id: string;
  name: string;
  specialty: string;
  headcountTarget: number;
  present: number;
  leader?: { firstName: string; lastName: string };
}

export default function EquipePage() {
  const { activeChantierId, activeChantier } = useChantier();
  const qc = useQueryClient();
  const [reinforceOpen, setReinforceOpen] = useState<Team | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "workforce", activeChantierId],
    enabled: !!activeChantierId,
    queryFn: async () => {
      const res = await fetch(`/api/dtrav/sites/${activeChantierId}/workforce`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        hierarchy: HierarchyNode[];
        teams: Team[];
        totals: { headcount: number };
      }>;
    },
  });

  return (
    <div id="screen-dtrav-equipe" className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Équipe chantier</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {activeChantier?.code} — organigramme et équipes ouvrières.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Effectif total" value={(data?.totals.headcount ?? 0).toString()} />
        <Kpi label="Équipes actives" value={(data?.teams.length ?? 0).toString()} />
        <Kpi
          label="Sous-effectif"
          value={(data?.teams.filter((t) => t.present < t.headcountTarget).length ?? 0).toString()}
          accent="warning"
        />
        <Kpi label="Conducteur travaux" value={data?.hierarchy[0]?.children[0]?.name?.split(" ")[0] ?? "—"} />
      </section>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Organigramme
        </h2>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-md bg-surface-alt" />
        ) : (
          <ul className="space-y-1">
            {data?.hierarchy.map((node) => (
              <HierarchyItem key={node.userId} node={node} depth={0} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Équipes ouvrières
        </h2>
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : data?.teams.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune équipe configurée.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">Équipe</th>
                    <th className="px-3 py-2">Spécialité</th>
                    <th className="px-3 py-2">Leader</th>
                    <th className="px-3 py-2 text-center">Présents</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.teams.map((t) => {
                    const under = t.present < t.headcountTarget;
                    return (
                      <tr key={t.id} className="border-b border-line">
                        <td className="px-3 py-2 font-medium text-ink">{t.name}</td>
                        <td className="px-3 py-2 text-ink-2">{t.specialty}</td>
                        <td className="px-3 py-2 text-ink-2">
                          {t.leader ? `${t.leader.firstName} ${t.leader.lastName}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={clsx(
                              "rounded px-2 py-0.5 text-[11px] font-medium",
                              under ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                            )}
                          >
                            {t.present}/{t.headcountTarget}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {under && (
                            <button
                              type="button"
                              onClick={() => setReinforceOpen(t)}
                              style={{ minHeight: 36 }}
                              className="text-[11.5px] font-medium text-primary-700 hover:underline"
                            >
                              Demander renfort
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {data?.teams.map((t) => {
                const under = t.present < t.headcountTarget;
                return (
                  <div key={t.id} className="rounded-lg border border-line bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-ink">{t.name}</div>
                        <div className="text-[11.5px] text-ink-3">{t.specialty}</div>
                      </div>
                      <span
                        className={clsx(
                          "rounded px-2 py-0.5 text-[11.5px] font-semibold",
                          under ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                        )}
                      >
                        {t.present}/{t.headcountTarget}
                      </span>
                    </div>
                    {under && (
                      <button
                        type="button"
                        onClick={() => setReinforceOpen(t)}
                        style={{ minHeight: 40 }}
                        className="mt-2 w-full rounded-md border border-primary-300 bg-primary-50 px-3 text-[12px] font-medium text-primary-700"
                      >
                        Demander renfort
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {reinforceOpen && activeChantierId && (
        <ReinforceModal
          team={reinforceOpen}
          siteId={activeChantierId}
          onClose={() => setReinforceOpen(null)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["dtrav", "workforce"] })}
        />
      )}
    </div>
  );
}

function HierarchyItem({ node, depth }: { node: HierarchyNode; depth: number }) {
  return (
    <li>
      <div
        className={clsx(
          "flex items-center gap-2 rounded-md border border-line bg-surface-alt px-2 py-1.5 text-[12.5px] sm:px-3"
        )}
        style={{ marginLeft: depth * 16 }}
      >
        <UserCog className="h-3.5 w-3.5 shrink-0 text-primary-600" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-ink">{node.name}</div>
          <div className="truncate text-[11px] text-ink-3">{node.position}</div>
        </div>
        {node.isLeader && (
          <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-medium text-primary-700">
            Leader
          </span>
        )}
      </div>
      {node.children.length > 0 && (
        <ul className="mt-1 space-y-1">
          {node.children.map((c) => (
            <HierarchyItem key={c.userId} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ReinforceModal({
  team,
  siteId,
  onClose,
  onCreated,
}: {
  team: Team;
  siteId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [count, setCount] = useState(team.headcountTarget - team.present);
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dtrav/sites/${siteId}/workforce/reinforcement`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: team.name, count, reason, neededFromDate: from }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-[14px] font-semibold text-ink">Demande renfort · {team.name}</h2>
          <button type="button" onClick={onClose} className="text-ink-3">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="mt-3 space-y-2">
          <label className="text-[12px] font-medium text-ink-2">
            Nombre d&apos;ouvriers
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              style={{ minHeight: 40 }}
              className="mt-1 w-full rounded-md border border-line bg-white px-2 text-[13px]"
            />
          </label>
          <label className="text-[12px] font-medium text-ink-2">
            Motif
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1 text-[13px]"
              placeholder="Ex : sous-effectif équipe terrassement, échéance jalon J3"
            />
          </label>
          <label className="text-[12px] font-medium text-ink-2">
            Besoin à partir du
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ minHeight: 40 }}
              className="mt-1 w-full rounded-md border border-line bg-white px-2 text-[13px]"
            />
          </label>
          {submit.error && (
            <div className="rounded-md bg-danger/10 p-2 text-[12px] text-danger">
              {(submit.error as Error).message}
            </div>
          )}
        </div>
        <footer className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} style={{ minHeight: 40 }} className="rounded-md border border-line-2 bg-white px-3 text-[12.5px]">
            Annuler
          </button>
          <button
            type="button"
            onClick={() => submit.mutate()}
            disabled={!reason || submit.isPending}
            style={{ minHeight: 40 }}
            className="rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white disabled:opacity-50"
          >
            Envoyer au DT
          </button>
        </footer>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: "warning" | "success" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        <Users className="h-4 w-4 text-primary-600" />
      </div>
      <div
        className={clsx(
          "mt-1 text-2xl font-bold",
          accent === "warning" && "text-warning",
          accent === "success" && "text-success",
          !accent && "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}
