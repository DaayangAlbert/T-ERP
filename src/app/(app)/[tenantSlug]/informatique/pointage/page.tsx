"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { MapPin, Building2, HardHat, Crosshair, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { PageHelp } from "@/components/help/PageHelp";
import { ItPointageTutorial } from "@/components/help/tutorials/ItPointageTutorial";

interface OfficeCfg { name: string; lat: number | null; lng: number | null; radiusM: number | null }
interface SiteCfg { id: string; code: string; name: string; lat: number | null; lng: number | null; radiusM: number | null }
interface Cfg { defaultRadiusM: number; office: OfficeCfg; sites: SiteCfg[] }

export default function ItPointagePage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/it/attendance", { credentials: "same-origin" })
      .then((r) => r.json())
      .then(setCfg)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading || !cfg) {
    return <div className="space-y-3"><div className="h-40 animate-pulse rounded-xl bg-surface-alt" /><div className="h-64 animate-pulse rounded-xl bg-surface-alt" /></div>;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Pointage de présence — Géolocalisation</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Définissez les coordonnées GPS du bureau (pour la direction) et de chaque chantier (pour le personnel affecté).
            Rayon de tolérance par défaut : {cfg.defaultRadiusM} m.
          </p>
        </div>
        <PageHelp title="Aide — Pointage IT"><ItPointageTutorial /></PageHelp>
      </header>

      <GeoCard
        icon={<Building2 className="h-4 w-4 text-primary-600" />}
        title={`Bureau (siège) — ${cfg.office.name}`}
        subtitle="Lieu de pointage des employés de la direction (sans chantier affecté)."
        initial={{ lat: cfg.office.lat, lng: cfg.office.lng, radiusM: cfg.office.radiusM }}
        defaultRadius={cfg.defaultRadiusM}
        onSave={async (v) => {
          const r = await fetch("/api/it/attendance/office", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(v) });
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Erreur");
        }}
      />

      <section className="space-y-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Chantiers ({cfg.sites.length})</h2>
        {cfg.sites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface-alt p-6 text-center text-[12.5px] text-ink-3">Aucun chantier. Créez-en dans « Chantiers (admin) ».</div>
        ) : (
          cfg.sites.map((s) => (
            <GeoCard
              key={s.id}
              icon={<HardHat className="h-4 w-4 text-primary-600" />}
              title={`${s.code} · ${s.name}`}
              subtitle="Lieu de pointage du personnel affecté à ce chantier."
              initial={{ lat: s.lat, lng: s.lng, radiusM: s.radiusM }}
              defaultRadius={cfg.defaultRadiusM}
              compact
              onSave={async (v) => {
                const r = await fetch(`/api/it/attendance/sites/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(v) });
                if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Erreur");
              }}
            />
          ))
        )}
      </section>
    </div>
  );
}

function GeoCard({
  icon, title, subtitle, initial, defaultRadius, compact, onSave,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  initial: { lat: number | null; lng: number | null; radiusM: number | null };
  defaultRadius: number;
  compact?: boolean;
  onSave: (v: { lat: number; lng: number; radiusM?: number }) => Promise<void>;
}) {
  const [lat, setLat] = useState(initial.lat?.toString() ?? "");
  const [lng, setLng] = useState(initial.lng?.toString() ?? "");
  const [radius, setRadius] = useState(initial.radiusM?.toString() ?? "");
  const [state, setState] = useState<{ kind: "idle" | "ok" | "err"; msg?: string }>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const [geoOn, setGeoOn] = useState(false);
  const geo = useGeolocation({ enabled: geoOn });

  useEffect(() => {
    if (geo.status === "granted" && geo.position) {
      setLat(geo.position.lat.toFixed(6));
      setLng(geo.position.lng.toFixed(6));
    }
  }, [geo.status, geo.position]);

  const configured = initial.lat != null && initial.lng != null;

  const save = async () => {
    setState({ kind: "idle" });
    const la = parseFloat(lat), ln = parseFloat(lng);
    if (Number.isNaN(la) || Number.isNaN(ln)) { setState({ kind: "err", msg: "Latitude / longitude invalides" }); return; }
    setSaving(true);
    try {
      await onSave({ lat: la, lng: ln, radiusM: radius ? parseInt(radius, 10) : undefined });
      setState({ kind: "ok", msg: "Enregistré" });
    } catch (e) {
      setState({ kind: "err", msg: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[14px] font-bold text-ink">{icon} {title}</div>
        <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>
          {configured ? "Configuré" : "Non configuré"}
        </span>
      </div>
      <p className="mt-0.5 text-[11.5px] text-ink-3">{subtitle}</p>

      <div className={clsx("mt-3 grid gap-3", compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3")}>
        <Field label="Latitude"><input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="3.866" className="h-10 w-full rounded-md border border-line bg-surface-alt px-3 text-[13px]" /></Field>
        <Field label="Longitude"><input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="11.516" className="h-10 w-full rounded-md border border-line bg-surface-alt px-3 text-[13px]" /></Field>
        <Field label={`Rayon (m) — défaut ${defaultRadius}`}><input value={radius} onChange={(e) => setRadius(e.target.value)} inputMode="numeric" placeholder={String(defaultRadius)} className="h-10 w-full rounded-md border border-line bg-surface-alt px-3 text-[13px]" /></Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setGeoOn(true); geo.refresh(); }} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[12.5px] font-medium text-ink-2 hover:bg-surface-alt">
          <Crosshair className="h-3.5 w-3.5" /> {geo.status === "requesting" ? "Localisation…" : "Utiliser ma position"}
        </button>
        <button type="button" onClick={save} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
          <Save className="h-3.5 w-3.5" /> {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {(lat && lng) && (
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-primary-700 hover:underline"><MapPin className="h-3.5 w-3.5" /> Voir sur la carte</a>
        )}
        {state.kind === "ok" && <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> {state.msg}</span>}
        {state.kind === "err" && <span className="inline-flex items-center gap-1 text-[12px] text-rose-700"><AlertTriangle className="h-3.5 w-3.5" /> {state.msg}</span>}
        {geo.status === "denied" && <span className="text-[12px] text-rose-700">GPS refusé</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">{label}</div>
      {children}
    </label>
  );
}
