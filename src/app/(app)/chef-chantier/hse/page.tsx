"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ShieldCheck, X, Check } from "lucide-react";
import { clsx } from "clsx";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";
import { postOrQueue } from "@/lib/offline/db";

interface HseData {
  kpis: {
    daysSinceSerious: number;
    tf1: number;
    ytdIncidents: number;
    epiToCheck: number;
    bctVisitDays: number;
  };
  recentIncidents: Array<{ id: string; type: string; severity: string; description: string; occurredAt: string }>;
  safetyTalk: {
    id: string;
    theme: string;
    description: string;
    completedAt: string | null;
    attendeesCount: number | null;
  };
}

const INCIDENT_TYPES: Array<{ value: string; label: string; severity: string }> = [
  { value: "NEAR_MISS", label: "Presqu'accident", severity: "LOW" },
  { value: "MINOR_INJURY", label: "Accident léger", severity: "MEDIUM" },
  { value: "MAJOR_INJURY", label: "Accident grave", severity: "HIGH" },
  { value: "MATERIAL_DAMAGE", label: "Incident matériel", severity: "LOW" },
  { value: "ENVIRONMENT_INCIDENT", label: "Environnement", severity: "MEDIUM" },
];

const BODY_PARTS = ["Tête", "Œil", "Bras droit", "Bras gauche", "Main droite", "Main gauche", "Tronc", "Jambe droite", "Jambe gauche", "Pied"];

const IMMEDIATE_ACTIONS = [
  "Soins infirmerie",
  "Évacuation CHU",
  "Arrêt zone",
  "Continuation possible",
  "Appel pompiers",
  "Sécurisation périmètre",
];

export default function HsePage() {
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["cc", "hse-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/cc/hse/dashboard", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<HseData>;
    },
  });

  const completeTalk = async () => {
    if (!data) return;
    await postOrQueue("incident-queue", `/api/cc/hse/safety-talks/${data.safetyTalk.id}/complete`, {
      attendeesCount: 12,
      attendeesIds: [],
    });
    qc.invalidateQueries({ queryKey: ["cc", "hse-dashboard"] });
  };

  return (
    <div id="screen-cc-hse" className="space-y-3">
      <header className="-mx-3 sm:-mx-4 md:-mx-6 sticky top-14 z-20 bg-gradient-to-r from-primary-600 via-violet-700 to-primary-700 px-3 py-2 text-white shadow-md">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[14px] font-semibold">HSE</h1>
          <SyncStatusBadge />
        </div>
      </header>

      <section className="rounded-xl bg-gradient-to-br from-red-500 to-red-700 p-4 shadow-card">
        <h2 className="text-[14px] font-semibold text-white">🚨 Incident en cours ?</h2>
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          style={{ minHeight: 52 }}
          className="mt-3 w-full rounded-lg bg-white text-[14px] font-bold text-red-700 shadow-md"
        >
          Déclarer un incident
        </button>
      </section>

      <section className="flex items-center gap-2 rounded-xl bg-success/10 p-3">
        <ShieldCheck className="h-5 w-5 text-success" />
        <div className="text-[12.5px] text-success">
          <strong>🟢 {data?.kpis.daysSinceSerious ?? 0} jours sans accident grave</strong>
          <span className="ml-2 text-ink-3">· TF1 chantier {data?.kpis.tf1.toFixed(1)}</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Kpi label="Incidents YTD" value={(data?.kpis.ytdIncidents ?? 0).toString()} />
        <Kpi label="EPI à vérifier" value={(data?.kpis.epiToCheck ?? 0).toString()} accent="warning" />
        <Kpi label="Visite BCT" value={`J+${data?.kpis.bctVisitDays ?? 0}`} />
        <Kpi label="Causeries S" value={data?.safetyTalk.completedAt ? "✓ Faite" : "À faire"} accent={data?.safetyTalk.completedAt ? "success" : "warning"} />
      </section>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <h2 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Causerie sécurité de la semaine
        </h2>
        <div className="font-medium text-ink">{data?.safetyTalk.theme}</div>
        <p className="mt-1 text-[12.5px] text-ink-2">{data?.safetyTalk.description}</p>
        {!data?.safetyTalk.completedAt ? (
          <button
            type="button"
            onClick={completeTalk}
            style={{ minHeight: 48 }}
            className="mt-2 w-full rounded-md bg-primary-600 px-3 text-[13px] font-medium text-white"
          >
            Marquer comme effectuée (12 présents)
          </button>
        ) : (
          <div className="mt-2 text-[12px] text-success">
            ✓ Effectuée le {new Date(data.safetyTalk.completedAt).toLocaleDateString("fr-FR")}
            {data.safetyTalk.attendeesCount && ` · ${data.safetyTalk.attendeesCount} présents`}
          </div>
        )}
      </section>

      {data?.recentIncidents && data.recentIncidents.length > 0 && (
        <section className="rounded-xl border border-line bg-white shadow-card">
          <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Incidents récents
          </h2>
          <ul className="divide-y divide-line">
            {data.recentIncidents.map((i) => (
              <li
                key={i.id}
                className={clsx(
                  "flex items-start gap-3 p-3 text-[12.5px] border-l-4",
                  i.severity === "CRITICAL" && "border-l-danger",
                  i.severity === "HIGH" && "border-l-warning",
                  i.severity === "MEDIUM" && "border-l-primary-500",
                  i.severity === "LOW" && "border-l-ink-3"
                )}
              >
                <AlertTriangle
                  className={clsx(
                    "h-4 w-4 shrink-0",
                    i.severity === "CRITICAL" && "text-danger",
                    i.severity === "HIGH" && "text-warning",
                    i.severity === "MEDIUM" && "text-primary-600",
                    i.severity === "LOW" && "text-ink-3"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{i.type}</div>
                  <p className="truncate text-ink-2">{i.description}</p>
                  <div className="text-[11px] text-ink-3">{new Date(i.occurredAt).toLocaleString("fr-FR")}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {wizardOpen && (
        <IncidentWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["cc", "hse-dashboard"] })}
        />
      )}
    </div>
  );
}

function IncidentWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("LOW");
  const [bodyPart, setBodyPart] = useState("");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState<string[]>([]);

  const submit = async () => {
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 3000 });
    });
    await postOrQueue(
      "incident-queue",
      "/api/cc/hse/incidents",
      {
        type,
        severity,
        bodyPartAffected: bodyPart || undefined,
        description,
        immediateActions: actions,
        geoLocation: pos
          ? { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
          : undefined,
        clientUuid: `incident-${Date.now()}`,
      },
      { priority: "HIGH" }
    );
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-md flex-col rounded-t-xl bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line p-3">
          <h2 className="text-[14px] font-semibold text-ink">Déclarer incident · {step}/4</h2>
          <button type="button" onClick={onClose} className="text-ink-3"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-ink-2">Type d&apos;incident</p>
              {INCIDENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setType(t.value);
                    setSeverity(t.severity);
                    setStep(2);
                  }}
                  style={{ minHeight: 80 }}
                  className={clsx(
                    "w-full rounded-lg border-2 p-3 text-left text-[14px] font-semibold",
                    type === t.value ? "border-primary-500 bg-primary-50 text-primary-700" : "border-line bg-white text-ink"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-ink-2">Partie du corps (si applicable)</p>
              <div className="grid grid-cols-2 gap-2">
                {BODY_PARTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setBodyPart(bodyPart === p ? "" : p)}
                    style={{ minHeight: 48 }}
                    className={clsx(
                      "rounded-md border px-2 text-[13px] font-medium",
                      bodyPart === p ? "border-primary-500 bg-primary-50 text-primary-700" : "border-line bg-white text-ink-2"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-ink-2">
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  style={{ fontSize: 16 }}
                  className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1"
                  placeholder="Décrivez précisément ce qui s'est passé"
                />
              </label>
              <p className="text-[11px] text-ink-3">📷 Photo et géolocalisation ajoutées automatiquement (si autorisé).</p>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-ink-2">Actions immédiates (multi-sélection)</p>
              {IMMEDIATE_ACTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() =>
                    setActions((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]))
                  }
                  style={{ minHeight: 56 }}
                  className={clsx(
                    "w-full rounded-md border-2 p-2 text-left text-[13px] font-medium",
                    actions.includes(a) ? "border-primary-500 bg-primary-50 text-primary-700" : "border-line bg-white text-ink-2"
                  )}
                >
                  {actions.includes(a) ? "✓ " : ""}{a}
                </button>
              ))}
            </div>
          )}
        </div>
        <footer className="flex justify-between gap-2 border-t border-line p-3">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            style={{ minHeight: 48 }}
            className="rounded-md border border-line bg-white px-3 text-[13px]"
          >
            {step === 1 ? "Annuler" : "Précédent"}
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !type}
              style={{ minHeight: 48 }}
              className="rounded-md bg-primary-600 px-4 text-[13px] font-medium text-white disabled:opacity-50"
            >
              Suivant
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!description}
              style={{ minHeight: 48 }}
              className="rounded-md bg-red-600 px-4 text-[13px] font-bold text-white disabled:opacity-50"
            >
              <Check className="mx-auto h-4 w-4" /> Déclarer
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: "warning" | "success" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
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
