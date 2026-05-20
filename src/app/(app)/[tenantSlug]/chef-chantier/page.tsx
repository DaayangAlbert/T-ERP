"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Truck,
  AlertTriangle,
  Camera,
  ArrowRight,
} from "lucide-react";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";
import { useCcSite } from "@/contexts/CcSiteContext";
import { useAuth } from "@/hooks/useAuth";

interface DashboardData {
  site: { id: string; code: string; name: string; client: string } | null;
  yesterdayProduction: number;
  yesterdayAttendance: { present: number; planned: number } | null;
  todayDeliveries: number;
  pendingAttendance: { needed: boolean; plannedHeadcount: number };
  currentPhase: { name: string; progress: number } | null;
  todayTasks: Array<{ id: string; name: string; progressPercent: number }>;
}

export default function CcDashboardPage() {
  const { user } = useAuth();
  const { site } = useCcSite();
  const { data } = useQuery({
    queryKey: ["cc", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/cc/dashboard", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<DashboardData>;
    },
  });

  const today = new Date();

  return (
    <div id="screen-cc-dashboard" className="space-y-3">
      <header className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="min-w-0">
          <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Chantier</div>
          <div className="truncate text-[14px] font-semibold text-ink">
            {site ? `${site.code} · ${site.name}` : "Chargement…"}
          </div>
        </div>
        <SyncStatusBadge />
      </header>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <h1 className="text-xl font-bold text-ink">
          Bonjour {user?.firstName ?? "Chef"}
        </h1>
        <p className="text-[12.5px] text-ink-3">
          {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </section>

      {data?.pendingAttendance.needed && (
        <section className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12px] uppercase tracking-wider text-white/80">
                ⏰ Pointage matinal
              </div>
              <h2 className="mt-1 text-[15px] font-bold text-white">
                À faire — {data.pendingAttendance.plannedHeadcount} ouvrier{data.pendingAttendance.plannedHeadcount > 1 ? "s" : ""} prévu{data.pendingAttendance.plannedHeadcount > 1 ? "s" : ""}
              </h2>
            </div>
          </div>
          <Link
            href="/chef-chantier/pointage"
            style={{ minHeight: 52 }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-[14px] font-bold text-orange-600 shadow-md hover:bg-orange-50"
          >
            Démarrer pointage <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2">
        <Kpi label="Production hier" value={`${new Intl.NumberFormat("fr-FR").format(Math.round((data?.yesterdayProduction ?? 0)))}`} hint="FCFA validés" />
        <Kpi
          label="Présents hier"
          value={
            data?.yesterdayAttendance
              ? `${data.yesterdayAttendance.present}/${data.yesterdayAttendance.planned}`
              : "—"
          }
        />
        <Kpi label="Livraisons jour" value={(data?.todayDeliveries ?? 0).toString()} />
        <Kpi label="Phase en cours" value={data?.currentPhase?.name ?? "—"} hint={data?.currentPhase ? `${data.currentPhase.progress}%` : ""} />
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Actions rapides
        </h2>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          <ActionCard href="/chef-chantier/production" icon={ClipboardCheck} label="Production" color="text-primary-700" />
          <ActionCard href="/chef-chantier/livraisons" icon={Truck} label="Réceptionner" color="text-warning" />
          <ActionCard href="/chef-chantier/hse" icon={AlertTriangle} label="Déclarer incident" color="text-danger" />
          <ActionCard href="/chef-chantier/equipes" icon={Camera} label="Mes équipes" color="text-success" />
        </div>
      </section>

      {data && data.todayTasks.length > 0 && (
        <section className="rounded-xl border border-line bg-white shadow-card">
          <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Tâches du jour
          </h2>
          <ul className="divide-y divide-line">
            {data.todayTasks.map((t) => (
              <li
                key={t.id}
                style={{ minHeight: 64 }}
                className="flex items-center justify-between p-3 text-[12.5px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink">{t.name}</div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-alt">
                    <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${t.progressPercent}%` }} />
                  </div>
                </div>
                <span className="ml-3 text-[12px] font-semibold text-ink-2">{t.progressPercent}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: typeof ClipboardCheck;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      style={{ minHeight: 64 }}
      className="flex flex-col items-start justify-center rounded-xl border border-line bg-white p-3 shadow-card hover:border-primary-300"
    >
      <Icon className={`h-11 w-11 ${color}`} />
      <span className="mt-1 text-[13px] font-semibold text-ink">{label}</span>
    </Link>
  );
}
