"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { clsx } from "clsx";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";
import { postOrQueue } from "@/lib/offline/db";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface Worker {
  userId: string;
  firstName: string;
  lastName: string;
  matricule: string | null;
  position: string;
  phone: string | null;
  teamId: string | null;
  teamName: string;
}

interface Team {
  id: string;
  name: string;
  specialty: string;
  count: number;
}

type Status = "PRESENT" | "ABSENT" | null;

export default function PointagePage() {
  const qc = useQueryClient();
  const { isOnline, forceSyncNow } = useOfflineSync();
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [selectedTeam, setSelectedTeam] = useState<string | "all">("all");
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  }, []);

  const workforceQuery = useQuery({
    queryKey: ["cc", "workforce"],
    queryFn: async () => {
      const res = await fetch("/api/cc/attendance/workforce", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ workforce: Worker[]; teams: Team[]; totalCount: number }>;
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ["cc", "attendance", today],
    queryFn: async () => {
      const res = await fetch(`/api/cc/attendance?date=${today}&session=MORNING`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        items: Array<{ userId: string; status: string }>;
        completion: { presentCount: number; absentCount: number; totalCount: number } | null;
      }>;
    },
  });

  // Initialiser statuses depuis le serveur
  useEffect(() => {
    if (attendanceQuery.data) {
      const next: Record<string, Status> = {};
      for (const it of attendanceQuery.data.items) {
        next[it.userId] = it.status === "PRESENT" ? "PRESENT" : "ABSENT";
      }
      setStatuses(next);
    }
  }, [attendanceQuery.data]);

  const mark = async (userId: string, status: "PRESENT" | "ABSENT") => {
    setStatuses((prev) => ({ ...prev, [userId]: status }));
    await postOrQueue("attendance-queue", "/api/cc/attendance", {
      userId,
      date: today,
      session: "MORNING",
      status,
      clientUuid: `${userId}-${today}-MORNING`,
    });
  };

  const finalize = async () => {
    await postOrQueue(
      "attendance-queue",
      "/api/cc/attendance/complete-session",
      { date: today, session: "MORNING" },
      { priority: "HIGH" }
    );
    forceSyncNow();
    qc.invalidateQueries({ queryKey: ["cc", "attendance"] });
  };

  const workforce = workforceQuery.data?.workforce ?? [];
  const filtered =
    selectedTeam === "all" ? workforce : workforce.filter((w) => w.teamId === selectedTeam);

  const presentCount = Object.values(statuses).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(statuses).filter((s) => s === "ABSENT").length;
  const total = workforce.length;
  const pending = total - presentCount - absentCount;
  const progress = total > 0 ? Math.round(((presentCount + absentCount) / total) * 100) : 0;

  // Grouper par équipe
  const groupedByTeam = useMemo(() => {
    const map = new Map<string, Worker[]>();
    for (const w of filtered) {
      const key = w.teamName;
      const arr = map.get(key) ?? [];
      arr.push(w);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div id="screen-cc-pointage" className="space-y-3 pb-24">
      <header className="-mx-3 sm:-mx-4 md:-mx-6 sticky top-14 z-20 bg-gradient-to-r from-primary-600 via-violet-700 to-primary-700 px-3 py-2 text-white shadow-md">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate text-[14px] font-semibold">Pointage matinal</h1>
          <SyncStatusBadge />
        </div>
      </header>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="grid grid-cols-4 gap-1.5 text-center text-[11.5px]">
          <Stat label="Effectif" value={total} />
          <Stat label="Présents" value={presentCount} accent="success" />
          <Stat label="Absents" value={absentCount} accent="danger" />
          <Stat label="À pointer" value={pending} accent="warning" />
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-alt">
          <div className="h-full bg-primary-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 text-right text-[11px] text-ink-3">{progress}%</div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={selectedTeam === "all"} onClick={() => setSelectedTeam("all")} label={`Toutes ${total}`} />
        {workforceQuery.data?.teams.map((t) => (
          <Chip
            key={t.id}
            active={selectedTeam === t.id}
            onClick={() => setSelectedTeam(t.id)}
            label={`${t.name} ${t.count}`}
          />
        ))}
      </div>

      <section className="space-y-3">
        {groupedByTeam.map(([teamName, workers]) => (
          <div key={teamName} className="rounded-xl border border-line bg-white shadow-card">
            <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold text-ink">
              {teamName} <span className="text-ink-3">({workers.length})</span>
            </h2>
            <ul className="divide-y divide-line">
              {workers.map((w) => (
                <WorkerRow
                  key={w.userId}
                  worker={w}
                  status={statuses[w.userId] ?? null}
                  onMark={mark}
                />
              ))}
            </ul>
          </div>
        ))}
        {workforce.length === 0 && !workforceQuery.isLoading && (
          <p className="rounded-xl border border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
            Aucun ouvrier dans l&apos;effectif chantier.
          </p>
        )}
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <button
          type="button"
          onClick={finalize}
          disabled={presentCount + absentCount === 0}
          style={{ minHeight: 56 }}
          className="w-full rounded-lg bg-primary-600 text-[14px] font-bold text-white shadow-md hover:bg-primary-700 disabled:opacity-50"
        >
          Valider le pointage matinal ({presentCount}/{total})
        </button>
        {!isOnline && (
          <p className="mt-1 text-center text-[11px] text-ink-3">
            Hors-ligne — la validation sera transmise au retour réseau
          </p>
        )}
      </div>
    </div>
  );
}

function WorkerRow({
  worker,
  status,
  onMark,
}: {
  worker: Worker;
  status: Status;
  onMark: (userId: string, status: "PRESENT" | "ABSENT") => void;
}) {
  const initials = (worker.firstName[0] ?? "") + (worker.lastName[0] ?? "");
  return (
    <li
      style={{ minHeight: 68 }}
      className="flex items-center gap-3 p-3 text-[12.5px]"
    >
      <div
        className={clsx(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full text-[12px] font-bold",
          status === "PRESENT" && "bg-success text-white",
          status === "ABSENT" && "bg-danger text-white",
          !status && "border border-line bg-surface-alt text-ink-3"
        )}
      >
        {status === "PRESENT" ? <Check className="h-5 w-5" /> : status === "ABSENT" ? <X className="h-5 w-5" /> : initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink">
          {worker.firstName} {worker.lastName}
        </div>
        <div className="truncate text-[11.5px] text-ink-3">
          {worker.matricule ?? ""} · {worker.position}
        </div>
      </div>
      {!status && (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onMark(worker.userId, "PRESENT")}
            style={{ minHeight: 40, minWidth: 64 }}
            className="rounded-md bg-success px-2 text-[11.5px] font-semibold text-white"
          >
            Présent
          </button>
          <button
            type="button"
            onClick={() => onMark(worker.userId, "ABSENT")}
            style={{ minHeight: 40, minWidth: 64 }}
            className="rounded-md border border-line bg-white px-2 text-[11.5px] font-medium text-ink-2"
          >
            Absent
          </button>
        </div>
      )}
      {status === "PRESENT" && (
        <button
          type="button"
          onClick={() => onMark(worker.userId, "ABSENT")}
          style={{ minHeight: 40 }}
          className="shrink-0 text-[11px] font-medium text-ink-3 hover:text-danger"
        >
          ↺ Absent
        </button>
      )}
      {status === "ABSENT" && (
        <button
          type="button"
          onClick={() => onMark(worker.userId, "PRESENT")}
          style={{ minHeight: 40 }}
          className="shrink-0 text-[11px] font-medium text-ink-3 hover:text-success"
        >
          ↺ Présent
        </button>
      )}
    </li>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "success" | "danger" | "warning" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-3">{label}</div>
      <div
        className={clsx(
          "mt-0.5 text-xl font-bold",
          accent === "success" && "text-success",
          accent === "danger" && "text-danger",
          accent === "warning" && "text-warning",
          !accent && "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minHeight: 40 }}
      className={clsx(
        "shrink-0 whitespace-nowrap rounded-full border px-3 text-[12.5px] font-medium",
        active ? "border-primary-500 bg-primary-500 text-white" : "border-line bg-white text-ink-2"
      )}
    >
      {label}
    </button>
  );
}
