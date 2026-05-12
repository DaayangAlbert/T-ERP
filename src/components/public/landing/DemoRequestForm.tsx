"use client";

import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";

const EMPLOYEES_RANGES = ["1-10", "11-50", "51-200", "201+"] as const;

export function DemoRequestForm() {
  const [state, setState] = useState({
    fullName: "",
    position: "",
    companyName: "",
    employeesRange: "11-50" as (typeof EMPLOYEES_RANGES)[number],
    email: "",
    phone: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof state>(k: K, v: (typeof state)[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const res = await fetch("/api/public/demo-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    setSending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur d'envoi");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <section id="demo" className="bg-brand-gradient-dark py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/20">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold md:text-3xl">
            Merci ! Demande reçue.
          </h2>
          <p className="mt-2 text-sm text-white/85">
            Notre équipe vous recontacte sous 24h ouvrées pour planifier votre démo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="demo" className="bg-brand-gradient-dark py-16 text-white">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            Voyez T-ERP en action sur votre métier
          </h2>
          <p className="mt-2 text-sm text-white/85">
            Démo personnalisée 45 minutes, en visio, gratuite et sans engagement.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="mt-8 grid gap-3 rounded-2xl bg-white p-6 text-ink shadow-2xl md:grid-cols-2"
        >
          <Field label="Nom complet *">
            <input
              type="text"
              required
              value={state.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Fonction">
            <input
              type="text"
              value={state.position}
              onChange={(e) => set("position", e.target.value)}
              placeholder="Ex: DG, DAF, RH…"
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Entreprise *">
            <input
              type="text"
              required
              value={state.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Nombre d'employés">
            <select
              value={state.employeesRange}
              onChange={(e) =>
                set(
                  "employeesRange",
                  e.target.value as (typeof EMPLOYEES_RANGES)[number],
                )
              }
              className={INPUT_CLS}
            >
              {EMPLOYEES_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email pro *">
            <input
              type="email"
              required
              value={state.email}
              onChange={(e) => set("email", e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Téléphone">
            <input
              type="tel"
              value={state.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+237 ..."
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Message (optionnel)" className="md:col-span-2">
            <textarea
              rows={3}
              value={state.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Vos besoins spécifiques, contexte…"
              className={INPUT_CLS}
            />
          </Field>
          {error ? (
            <p className="md:col-span-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-brand-lg hover:bg-primary-600 disabled:opacity-60"
            >
              {sending ? "Envoi…" : "Demander ma démo"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-2 text-[11px] text-ink-3">
              Vos données ne sont jamais partagées. Conforme loi 2010/012.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

const INPUT_CLS =
  "mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
