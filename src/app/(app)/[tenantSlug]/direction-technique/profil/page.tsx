"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Bell, Pen, Calendar, MessageSquare, Save } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { AvatarUploader } from "@/components/profile/AvatarUploader";

interface DtProfileResponse {
  alertsConfig: {
    costDeviationThreshold: number;
    delayThresholdDays: number;
    marginThresholdPercent: number;
    crewLoadThresholdPercent: number;
    channel: "email" | "push" | "in-app";
  };
  signaturePower: { soloLimit: number; coSignLimit: number; coSigners: string[] };
  personInCharge: Array<{ id: string; code: string; name: string }>;
}

interface AgendaEvent {
  id: string;
  date: string;
  type: "MILESTONE" | "AUDIT";
  title: string;
  details: string;
  critical: boolean;
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md FCFA`;
  return `${(n / 1_000_000).toLocaleString("fr-FR")} M FCFA`;
}

const TECH_GROUPS = [
  "Comité chantiers (DT + 4 dir. travaux + DG)",
  "Cellule QHSE (DT + RH + HSE + médecin)",
  "Cellule études (DT + bureau d'études + commercial)",
  "Réunion technique hebdo (DT + dir. travaux + conducteurs)",
];

const TECH_CONTACTS = [
  "Bureau de contrôle technique (BCT)",
  "Géomètre référent",
  "Laboratoire essais matériaux",
  "Inspection du travail (référent BTP)",
  "Maîtres d'ouvrage des 23 chantiers (par groupe)",
];

export default function DtProfilePage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const profile = useQuery({
    queryKey: ["dt", "profile"],
    queryFn: async (): Promise<DtProfileResponse> => {
      const res = await fetch("/api/dt/profile", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const agenda = useQuery({
    queryKey: ["dt", "agenda"],
    queryFn: async (): Promise<{ events: AgendaEvent[] }> => {
      const res = await fetch("/api/dt/agenda", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const save = useMutation({
    mutationFn: async (alertsConfig: DtProfileResponse["alertsConfig"]) => {
      const res = await fetch("/api/dt/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertsConfig }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dt", "profile"] }),
  });

  const [form, setForm] = useState<DtProfileResponse["alertsConfig"] | null>(null);
  useEffect(() => {
    if (profile.data) setForm(profile.data.alertsConfig);
  }, [profile.data]);

  if (profile.isLoading || !profile.data || !form) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Mon espace Direction Technique
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {user ? `${user.firstName} ${user.lastName} · ` : ""}Préférences alertes, habilitations, agenda, messagerie technique.
        </p>
      </header>

      <AvatarUploader />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Préférences alertes techniques */}
        <section className="rounded-xl border border-line bg-white p-4">
          <h2 className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
            <Bell className="h-4 w-4 text-primary-600" /> Préférences alertes techniques
          </h2>
          <p className="mt-1 text-[11.5px] text-ink-3">
            Seuils personnalisés au-delà desquels une alerte est déclenchée.
          </p>

          <dl className="mt-3 space-y-2.5">
            <div>
              <label className="text-[11.5px] font-medium text-ink-2">
                Seuil dérive coût ({form.costDeviationThreshold} %)
              </label>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={form.costDeviationThreshold}
                onChange={(e) =>
                  setForm({ ...form, costDeviationThreshold: parseInt(e.target.value) })
                }
                className="mt-1 w-full accent-primary-500"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-ink-2">
                Seuil retard livraison ({form.delayThresholdDays} jours)
              </label>
              <input
                type="range"
                min={3}
                max={60}
                step={1}
                value={form.delayThresholdDays}
                onChange={(e) =>
                  setForm({ ...form, delayThresholdDays: parseInt(e.target.value) })
                }
                className="mt-1 w-full accent-primary-500"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-ink-2">
                Seuil marge basse ({form.marginThresholdPercent} %)
              </label>
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={form.marginThresholdPercent}
                onChange={(e) =>
                  setForm({ ...form, marginThresholdPercent: parseInt(e.target.value) })
                }
                className="mt-1 w-full accent-primary-500"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-ink-2">
                Seuil charge équipe ({form.crewLoadThresholdPercent} %)
              </label>
              <input
                type="range"
                min={80}
                max={150}
                step={5}
                value={form.crewLoadThresholdPercent}
                onChange={(e) =>
                  setForm({ ...form, crewLoadThresholdPercent: parseInt(e.target.value) })
                }
                className="mt-1 w-full accent-primary-500"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-ink-2">Canal préféré</label>
              <div className="mt-1 flex gap-2">
                {(["email", "push", "in-app"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, channel: c })}
                    className={clsx(
                      "flex-1 rounded border px-3 py-1.5 text-[11.5px] font-semibold",
                      form.channel === c
                        ? "border-primary-300 bg-primary-50 text-primary-700"
                        : "border-line-2 bg-white text-ink-2"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </dl>
          <button
            onClick={() => save.mutate(form)}
            disabled={save.isPending}
            className="mt-3 inline-flex items-center gap-1 rounded bg-primary-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-3 w-3" /> {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </section>

        {/* Habilitations techniques */}
        <section className="rounded-xl border border-line bg-white p-4">
          <h2 className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
            <Pen className="h-4 w-4 text-violet-600" /> Mes habilitations techniques
          </h2>
          <p className="mt-1 text-[11.5px] text-ink-3">
            Pouvoirs de signature et chantiers dont je suis Person In Charge.
          </p>

          <dl className="mt-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between">
              <dt className="text-ink-3">Signature seul N2 technique</dt>
              <dd className="font-mono font-semibold text-emerald-700">
                ≤ {fmt(profile.data.signaturePower.soloLimit)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Cosignée DG</dt>
              <dd className="font-mono font-semibold text-amber-700">
                {fmt(profile.data.signaturePower.soloLimit)} → {fmt(profile.data.signaturePower.coSignLimit)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Au-delà</dt>
              <dd className="text-[11.5px] text-ink-2">DG + Président CA</dd>
            </div>
          </dl>

          <hr className="my-3 border-line" />

          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            Chantiers Person In Charge ({profile.data.personInCharge.length})
          </h3>
          <ul className="mt-1.5 space-y-1 text-[11.5px]">
            {profile.data.personInCharge.map((s) => (
              <li key={s.id} className="flex justify-between rounded border border-line px-2 py-1">
                <span className="font-mono text-ink-3">{s.code}</span>
                <span className="font-medium text-ink">{s.name}</span>
              </li>
            ))}
            {profile.data.personInCharge.length === 0 && (
              <li className="text-ink-3">Aucun chantier directement assigné.</li>
            )}
          </ul>

          <Link
            href="/direction-technique/validations?tab=delegations"
            className="mt-3 inline-block text-[11.5px] font-semibold text-primary-700 hover:text-primary-800"
          >
            Gérer mes délégations →
          </Link>
        </section>
      </div>

      {/* Agenda technique */}
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
          <Calendar className="h-4 w-4 text-blue-600" /> Mon agenda technique
        </h2>
        <p className="mt-1 text-[11.5px] text-ink-3">
          Jalons MOA, audits planifiés, réunions techniques.
        </p>

        {agenda.isLoading || !agenda.data ? (
          <div className="mt-3 h-20 animate-pulse rounded bg-surface-alt" />
        ) : agenda.data.events.length === 0 ? (
          <p className="mt-3 text-[12px] text-ink-3">
            Aucun événement à venir (90 jours).
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {agenda.data.events.slice(0, 10).map((e) => (
              <li
                key={e.id}
                className={clsx(
                  "flex flex-col gap-1 rounded border-l-[3px] bg-surface-alt/40 p-2 sm:flex-row sm:items-center sm:justify-between",
                  e.critical ? "border-l-rose-500" : "border-l-blue-500"
                )}
              >
                <div className="flex-1">
                  <div className="text-[12px] font-medium text-ink">{e.title}</div>
                  {e.details && (
                    <div className="text-[11px] text-ink-3">{e.details}</div>
                  )}
                </div>
                <span className="text-[11.5px] font-semibold text-ink-2">
                  {format(new Date(e.date), "dd MMM yyyy", { locale: fr })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Messagerie technique */}
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
          <MessageSquare className="h-4 w-4 text-emerald-600" /> Messagerie technique DT
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Groupes techniques épinglés
            </h3>
            <ul className="mt-1.5 space-y-1 text-[12px]">
              {TECH_GROUPS.map((g) => (
                <li key={g} className="rounded border border-line px-2 py-1.5">
                  <span className="text-ink">📌 {g}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Contacts externes
            </h3>
            <ul className="mt-1.5 space-y-1 text-[12px]">
              {TECH_CONTACTS.map((c) => (
                <li key={c} className="rounded border border-line px-2 py-1.5">
                  <span className="text-ink">📞 {c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Bonus paie (cadre 12) */}
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-2">
          Bonus performance technique (cadre 12)
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3">
          <div className="rounded border border-line bg-surface-alt/40 p-2">
            <dt className="text-ink-3">Marge globale annuelle</dt>
            <dd className="mt-0.5 font-semibold text-ink">0,5 % × marge brute</dd>
            <dd className="text-[11px] text-ink-3">Si marge &gt; seuil</dd>
          </div>
          <div className="rounded border border-line bg-surface-alt/40 p-2">
            <dt className="text-ink-3">Zéro accident grave</dt>
            <dd className="mt-0.5 font-semibold text-ink">Prime trimestrielle</dd>
            <dd className="text-[11px] text-ink-3">Si aucun AT mortel</dd>
          </div>
          <div className="rounded border border-line bg-surface-alt/40 p-2">
            <dt className="text-ink-3">Délais MOA</dt>
            <dd className="mt-0.5 font-semibold text-ink">Prime annuelle</dd>
            <dd className="text-[11px] text-ink-3">Si &gt; 80 % livrés à l&apos;heure</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11.5px] text-ink-3">
          Avantages cadre 12 : voiture de fonction, téléphone, mutuelle, plan d&apos;épargne.
        </p>
      </section>
    </div>
  );
}
