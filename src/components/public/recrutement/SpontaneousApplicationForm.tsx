"use client";

import { useRef, useState } from "react";
import { Send, Upload, Check } from "lucide-react";
import {
  ProfessionDatalist,
  PROFESSION_DATALIST_ID,
} from "@/components/common/ProfessionDatalist";

export function SpontaneousApplicationForm({
  primaryColor,
}: {
  primaryColor: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [desiredJob, setDesiredJob] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [accept, setAccept] = useState(false);
  const [cvName, setCvName] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const fd = new FormData();
    fd.append("fullName", fullName);
    fd.append("email", email);
    fd.append("phone", phone);
    fd.append("desiredJob", desiredJob);
    fd.append("coverLetter", coverLetter);
    fd.append("isSpontaneous", "true");
    fd.append("acceptTerms", String(accept));
    if (fileRef.current?.files?.[0]) {
      fd.append("cv", fileRef.current.files[0]);
    }
    const res = await fetch("/api/public/tenant-applications", {
      method: "POST",
      body: fd,
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
      <section id="spontanee" className="bg-surface-alt py-16">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-card">
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white"
            style={{ background: primaryColor ?? "#A855F7" }}
          >
            <Check className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-ink">Candidature reçue</h2>
          <p className="mt-2 text-sm text-ink-3">
            Notre équipe RH revient vers vous sous 5 jours ouvrés. Vous pouvez
            créer votre espace candidat pour suivre vos candidatures.
          </p>
          <a
            href="/cand/signup"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-brand hover:bg-primary-600"
          >
            Créer mon espace candidat
          </a>
        </div>
      </section>
    );
  }

  return (
    <section id="spontanee" className="bg-surface-alt py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink md:text-3xl">
            Candidature spontanée
          </h2>
          <p className="mt-2 text-sm text-ink-3">
            Pas l&apos;offre qui vous correspond ? Envoyez-nous votre profil, nous
            le gardons en vivier.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="mt-8 grid gap-3 rounded-2xl bg-white p-6 shadow-card md:grid-cols-2"
        >
          <Field label="Nom complet *">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Email *">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Téléphone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Métier / poste recherché">
            <input
              value={desiredJob}
              list={PROFESSION_DATALIST_ID}
              onChange={(e) => setDesiredJob(e.target.value)}
              placeholder="Ex : Maçon, Agent de sécurité, Ménagère…"
              className={INPUT_CLS}
            />
            <ProfessionDatalist />
          </Field>
          <Field label="Message de motivation" className="md:col-span-2">
            <textarea
              rows={4}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Parlez-nous brièvement de votre parcours et de ce qui vous attire chez nous."
              className={INPUT_CLS}
            />
          </Field>
          <div className="md:col-span-2">
            <label className="flex items-center justify-between rounded-md border border-line bg-surface-alt px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-ink-2">
                <Upload className="h-4 w-4 text-primary" />
                <span>{cvName ?? "CV (PDF, optionnel, max 5 Mo)"}</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => setCvName(e.target.files?.[0]?.name ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-md border border-line bg-white px-3 py-1 text-xs font-medium text-ink-2 hover:bg-surface-alt"
              >
                Parcourir
              </button>
            </label>
          </div>
          <label className="flex items-start gap-2 text-xs text-ink-3 md:col-span-2">
            <input
              type="checkbox"
              required
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line text-primary"
            />
            <span>
              J&apos;accepte que mes données soient traitées pour étudier ma
              candidature (loi 2010/012, conservation 12 mois).
            </span>
          </label>
          {error ? (
            <p className="md:col-span-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={sending || !accept}
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white shadow-brand hover:opacity-90 disabled:opacity-60"
              style={{ background: primaryColor ?? "#A855F7" }}
            >
              {sending ? "Envoi…" : "Envoyer ma candidature"}
              <Send className="h-4 w-4" />
            </button>
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
