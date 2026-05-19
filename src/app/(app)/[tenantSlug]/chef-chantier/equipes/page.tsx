"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";
import { ContactActions } from "@/components/contact/ContactActions";

interface Worker {
  userId: string;
  firstName: string;
  lastName: string;
  matricule: string | null;
  position: string;
  phone: string | null;
  avatarUrl: string | null;
  isLeader: boolean;
  attendanceStatus: "PRESENT" | "ABSENT" | "JUSTIFIED_ABSENT" | "LATE" | "LEFT_EARLY" | null;
}

interface Team {
  id: string | null;
  name: string;
  specialty: string | null;
  leader: { firstName: string; lastName: string; phone: string | null } | null;
  workers: Worker[];
}

export default function EquipesPage() {
  const [search, setSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["cc", "workforce-list", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`/api/cc/workforce?${params}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ teams: Team[]; totalCount: number }>;
    },
  });

  return (
    <div id="screen-cc-equipes" className="space-y-3">
      <header className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
        <h1 className="text-[16px] font-semibold text-ink">Mes équipes</h1>
        <SyncStatusBadge />
      </header>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="text-[14px] font-semibold text-ink">
          {data?.totalCount ?? 0} personnes sous ma responsabilité
        </div>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, matricule, équipe…"
            style={{ minHeight: 44, fontSize: 16 }}
            className="w-full rounded-md border border-line bg-white pl-9 pr-3"
          />
        </div>
      </section>

      <section className="space-y-3">
        {data?.teams.map((team) => (
          <article key={team.id ?? "no-team"} className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
            <header className="flex items-center gap-2 bg-primary-50 px-3 py-2">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-200 text-[14px] font-bold text-primary-700">
                {team.leader
                  ? (team.leader.firstName[0] ?? "") + (team.leader.lastName[0] ?? "")
                  : "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">{team.name}</div>
                <div className="truncate text-[11.5px] text-ink-3">
                  {team.leader ? `${team.leader.firstName} ${team.leader.lastName}` : "Pas de chef"} ·{" "}
                  {team.workers.length} ouvrier{team.workers.length > 1 ? "s" : ""}
                </div>
              </div>
              {/* Contact du chef d'équipe : géré via la ligne worker
                  marquée isLeader plus bas (avec ContactActions interne). */}
            </header>
            <ul className="divide-y divide-line">
              {team.workers.map((w) => (
                <WorkerRow key={w.userId} worker={w} />
              ))}
            </ul>
          </article>
        ))}
        {!data?.teams.length && (
          <p className="rounded-xl border border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
            Aucun ouvrier dans votre périmètre.
          </p>
        )}
      </section>
    </div>
  );
}

function WorkerRow({ worker }: { worker: Worker }) {
  const initials = (worker.firstName[0] ?? "") + (worker.lastName[0] ?? "");
  return (
    <li style={{ minHeight: 60 }} className="flex items-center gap-3 p-3 text-[12.5px]">
      <div
        className={clsx(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-bold",
          worker.attendanceStatus === "PRESENT" && "bg-success text-white",
          (worker.attendanceStatus === "ABSENT" || worker.attendanceStatus === "JUSTIFIED_ABSENT") && "bg-danger text-white",
          !worker.attendanceStatus && "bg-surface-alt text-ink-3"
        )}
      >
        {worker.attendanceStatus === "PRESENT" ? (
          <Check className="h-4 w-4" />
        ) : worker.attendanceStatus === "ABSENT" || worker.attendanceStatus === "JUSTIFIED_ABSENT" ? (
          <X className="h-4 w-4" />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink">
          {worker.firstName} {worker.lastName}
          {worker.isLeader && <span className="ml-1 text-[10px] text-primary-700">★ Chef</span>}
        </div>
        <div className="truncate text-[11px] text-ink-3">{worker.position}</div>
      </div>
      <ContactActions userId={worker.userId} size="md" />
    </li>
  );
}
