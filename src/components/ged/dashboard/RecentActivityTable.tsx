"use client";

import { Download, Upload, FileCheck, Send, AlertTriangle, Eye, KeyRound, FileEdit, Trash2 } from "lucide-react";
import type { GedDashboardResponse } from "@/hooks/useGedDashboard";

const ACTION_LABEL: Record<string, { label: string; icon: typeof Download; tone: string }> = {
  CONSULTATION: { label: "Consulté", icon: Eye, tone: "text-slate-600" },
  DOWNLOAD: { label: "Téléchargé", icon: Download, tone: "text-blue-600" },
  IMPORT: { label: "Importé", icon: Upload, tone: "text-emerald-600" },
  MODIFICATION: { label: "Modifié", icon: FileEdit, tone: "text-amber-600" },
  DELETION: { label: "Supprimé", icon: Trash2, tone: "text-rose-600" },
  WORKFLOW_DECISION: { label: "Validé", icon: FileCheck, tone: "text-violet-600" },
  DIFFUSION: { label: "Diffusé", icon: Send, tone: "text-violet-600" },
  ACCESS_REQUEST: { label: "Demande accès", icon: KeyRound, tone: "text-amber-600" },
  ANOMALY: { label: "Anomalie", icon: AlertTriangle, tone: "text-rose-600" },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  activity: GedDashboardResponse["recentActivity"];
}

export function RecentActivityTable({ activity }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-ink">Activité documentaire — 24 dernières heures</h2>
        <span className="text-[11.5px] text-ink-3">{activity.length} événement{activity.length > 1 ? "s" : ""}</span>
      </header>
      {activity.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">
          Aucune activité enregistrée sur la période.
        </div>
      ) : (
        <>
          {/* Desktop : table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt/50 text-[11px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Heure</th>
                  <th className="px-4 py-2 text-left font-semibold">Utilisateur</th>
                  <th className="px-4 py-2 text-left font-semibold">Action</th>
                  <th className="px-4 py-2 text-left font-semibold">Document</th>
                  <th className="px-4 py-2 text-left font-semibold">Espace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {activity.map((e) => {
                  const meta = ACTION_LABEL[e.action] ?? { label: e.action, icon: Eye, tone: "text-slate-600" };
                  const Icon = meta.icon;
                  return (
                    <tr key={e.id} className={e.isAnomaly ? "bg-rose-50/40" : ""}>
                      <td className="px-4 py-2 font-mono text-[11.5px] text-ink-3">{formatTime(e.timestamp)}</td>
                      <td className="px-4 py-2 text-ink">{e.actorName}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1.5 ${meta.tone}`}>
                          <Icon className="h-3.5 w-3.5" /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 truncate text-ink">{e.documentName ?? "—"}</td>
                      <td className="px-4 py-2 text-ink-3">{e.spaceName ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile : cards */}
          <ul className="divide-y divide-line sm:hidden">
            {activity.map((e) => {
              const meta = ACTION_LABEL[e.action] ?? { label: e.action, icon: Eye, tone: "text-slate-600" };
              const Icon = meta.icon;
              return (
                <li key={e.id} className={`px-4 py-2.5 ${e.isAnomaly ? "bg-rose-50/40" : ""}`}>
                  <div className="flex items-center justify-between gap-2 text-[11.5px] text-ink-3">
                    <span className="font-mono">{formatTime(e.timestamp)}</span>
                    <span className={`inline-flex items-center gap-1 font-semibold ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                  </div>
                  <div className="mt-1 text-[12.5px] font-semibold text-ink">{e.actorName}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {e.documentName ?? "—"}
                    {e.spaceName ? ` · ${e.spaceName}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
