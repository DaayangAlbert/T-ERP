"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { MapPin, LogIn, LogOut, Clock, RefreshCw, AlertTriangle, CheckCircle2, Users, Building2, HardHat } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";

interface MeResp {
  canClockIn: boolean;
  canViewAll: boolean;
  canViewSite: boolean;
  location: { type: "OFFICE" | "SITE"; name: string; lat: number | null; lng: number | null; radiusM: number; configured: boolean } | null;
  today: { arrivalTime: string | null; departureTime: string | null; status: string; outOfGeofence: boolean } | null;
  recent: Array<{ id: string; date: string; arrivalTime: string | null; departureTime: string | null; totalHours: number; status: string; outOfGeofence: boolean }>;
}

interface RecordsResp {
  date: string;
  items: Array<{ id: string; name: string; role: string; location: string; arrivalTime: string | null; departureTime: string | null; totalHours: number; status: string; outOfGeofence: boolean }>;
  summary: { present: number; outOfZone: number };
}

const fmtTime = (s: string | null) => (s ? new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—");
const fmtDay = (s: string) => new Date(s).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return r.json();
}

export default function PresencePage() {
  const me = useQuery({ queryKey: ["presence", "me"], queryFn: () => getJson<MeResp>("/api/presence/me") });
  const [tab, setTab] = useState<"pointer" | "suivi">("pointer");

  useEffect(() => {
    if (me.data) setTab(me.data.canClockIn ? "pointer" : "suivi");
  }, [me.data]);

  if (me.isLoading || !me.data) {
    return <div className="space-y-3 p-1"><div className="h-40 animate-pulse rounded-xl bg-surface-alt" /><div className="h-64 animate-pulse rounded-xl bg-surface-alt" /></div>;
  }

  const d = me.data;
  const showTabs = d.canClockIn && (d.canViewAll || d.canViewSite);

  return (
    <div className="space-y-4 pb-16">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Présence</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {d.canClockIn ? "Pointez votre arrivée et votre départ — votre position GPS est vérifiée." : "Suivi des présences de l'équipe."}
        </p>
      </header>

      {showTabs && (
        <div className="flex gap-1 border-b border-line">
          <TabBtn active={tab === "pointer"} onClick={() => setTab("pointer")} icon={<Clock className="h-3.5 w-3.5" />} label="Mon pointage" />
          <TabBtn active={tab === "suivi"} onClick={() => setTab("suivi")} icon={<Users className="h-3.5 w-3.5" />} label="Suivi des présences" />
        </div>
      )}

      {d.canClockIn && (!showTabs || tab === "pointer") && <MyClock data={d} onChange={() => me.refetch()} />}
      {(d.canViewAll || d.canViewSite) && (!showTabs || tab === "suivi") && <Consultation />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={clsx("relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition", active ? "text-primary-700" : "text-ink-3 hover:text-ink")}>
      {icon}{label}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  );
}

function MyClock({ data, onChange }: { data: MeResp; onChange: () => void }) {
  const qc = useQueryClient();
  const geo = useGeolocation({ enabled: true });
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const clock = useMutation({
    mutationFn: async (action: "in" | "out") => {
      if (!geo.position) throw new Error("Position GPS non disponible — autorisez la localisation.");
      const r = await fetch("/api/presence/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action, lat: geo.position.lat, lng: geo.position.lng, accuracyM: geo.position.accuracyM }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? `Erreur ${r.status}`);
      return body as { action: string; distanceM: number };
    },
    onSuccess: (res) => {
      setFeedback({ kind: "ok", msg: res.action === "in" ? `Arrivée pointée (à ${res.distanceM} m de la zone).` : `Départ pointé (à ${res.distanceM} m de la zone).` });
      qc.invalidateQueries({ queryKey: ["presence", "me"] });
      onChange();
    },
    onError: (e) => setFeedback({ kind: "err", msg: e instanceof Error ? e.message : "Erreur" }),
  });

  const loc = data.location;
  const arrived = Boolean(data.today?.arrivalTime);
  const left = Boolean(data.today?.departureTime);
  const LocIcon = loc?.type === "SITE" ? HardHat : Building2;

  return (
    <div className="space-y-3">
      {/* Lieu attendu */}
      <div className="rounded-xl border border-line bg-white p-4 shadow-card">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3"><MapPin className="h-3.5 w-3.5" /> Lieu de pointage</div>
        {loc ? (
          <>
            <div className="mt-1 flex items-center gap-2 text-[15px] font-bold text-ink"><LocIcon className="h-4 w-4 text-primary-600" /> {loc.name}</div>
            {loc.configured ? (
              <p className="mt-0.5 text-[12px] text-ink-3">Zone autorisée : {loc.radiusM} m autour du point GPS.</p>
            ) : (
              <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[12px] text-amber-800"><AlertTriangle className="h-3.5 w-3.5" /> Coordonnées GPS non configurées — contactez l'informaticien.</p>
            )}
          </>
        ) : (
          <p className="mt-1 text-[12.5px] text-ink-3">Aucun lieu de pointage déterminé.</p>
        )}

        {/* État GPS */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-alt px-3 py-2 text-[12px]">
          <span className="text-ink-3">
            {geo.status === "granted" && geo.position ? (
              <>Position : {geo.position.lat.toFixed(5)}, {geo.position.lng.toFixed(5)} <span className="text-ink-3">(±{geo.position.accuracyM} m)</span></>
            ) : geo.status === "requesting" ? "Localisation en cours…" : geo.status === "denied" ? "Permission GPS refusée" : geo.error ?? "GPS non activé"}
          </span>
          <button type="button" onClick={geo.refresh} className="inline-flex items-center gap-1 text-primary-700 hover:underline"><RefreshCw className="h-3 w-3" /> Actualiser</button>
        </div>
      </div>

      {/* Aujourd'hui + boutons */}
      <div className="rounded-xl border border-line bg-white p-4 shadow-card">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-alt p-3 text-center">
            <div className="text-[10px] uppercase tracking-wide text-ink-3">Arrivée</div>
            <div className="font-mono text-[20px] font-bold text-ink">{fmtTime(data.today?.arrivalTime ?? null)}</div>
          </div>
          <div className="rounded-lg bg-surface-alt p-3 text-center">
            <div className="text-[10px] uppercase tracking-wide text-ink-3">Départ</div>
            <div className="font-mono text-[20px] font-bold text-ink">{fmtTime(data.today?.departureTime ?? null)}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={arrived || clock.isPending || !geo.position || !loc?.configured}
            onClick={() => clock.mutate("in")}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 text-[14px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            <LogIn className="h-5 w-5" /> {arrived ? "Arrivée pointée" : "Pointer l'arrivée"}
          </button>
          <button
            type="button"
            disabled={!arrived || left || clock.isPending || !geo.position || !loc?.configured}
            onClick={() => clock.mutate("out")}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary-600 text-[14px] font-bold text-white hover:bg-primary-700 disabled:opacity-40"
          >
            <LogOut className="h-5 w-5" /> {left ? "Départ pointé" : "Pointer le départ"}
          </button>
        </div>

        {feedback && (
          <p className={clsx("mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[12.5px]", feedback.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700")}>
            {feedback.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />} {feedback.msg}
          </p>
        )}
      </div>

      {/* Historique récent */}
      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Mes derniers pointages</h2>
        {data.recent.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface-alt p-4 text-center text-[12.5px] text-ink-3">Aucun pointage enregistré.</div>
        ) : (
          <ul className="space-y-1.5">
            {data.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-lg border border-line bg-white p-2.5 text-[12.5px]">
                <span className="w-28 shrink-0 font-medium text-ink-2">{fmtDay(r.date)}</span>
                <span className="flex-1 font-mono text-ink">{fmtTime(r.arrivalTime)} → {fmtTime(r.departureTime)}</span>
                <span className="text-ink-3">{r.totalHours} h</span>
                {r.outOfGeofence && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">hors zone</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Consultation() {
  const [date, setDate] = useState(ymd(new Date()));
  const q = useQuery({ queryKey: ["presence", "records", date], queryFn: () => getJson<RecordsResp>(`/api/presence/records?date=${date}`) });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-card">
        <label className="text-[12.5px] font-medium text-ink-2">Journée</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-md border border-line bg-surface-alt px-3 text-[13px]" />
        {q.data && (
          <span className="ml-auto text-[11.5px] text-ink-3">
            <strong className="text-ink">{q.data.summary.present}</strong> présent(s)
            {q.data.summary.outOfZone > 0 && <> · <span className="text-amber-700">{q.data.summary.outOfZone} hors zone</span></>}
          </span>
        )}
      </div>

      {q.isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-surface-alt" />
      ) : !q.data || q.data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface-alt p-8 text-center text-[12.5px] text-ink-3">Aucun pointage pour cette journée.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead className="border-b border-line bg-surface-alt text-left text-[10.5px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-3 py-2">Employé</th>
                <th className="px-3 py-2">Rôle</th>
                <th className="px-3 py-2">Lieu</th>
                <th className="px-3 py-2 text-center">Arrivée</th>
                <th className="px-3 py-2 text-center">Départ</th>
                <th className="px-3 py-2 text-right">Heures</th>
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((r) => (
                <tr key={r.id} className="border-b border-line">
                  <td className="px-3 py-2 font-medium text-ink">{r.name}{r.outOfGeofence && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">hors zone</span>}</td>
                  <td className="px-3 py-2 text-ink-3">{r.role}</td>
                  <td className="px-3 py-2 text-ink-2">{r.location}</td>
                  <td className="px-3 py-2 text-center font-mono text-ink">{fmtTime(r.arrivalTime)}</td>
                  <td className="px-3 py-2 text-center font-mono text-ink">{fmtTime(r.departureTime)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-2">{r.totalHours} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
