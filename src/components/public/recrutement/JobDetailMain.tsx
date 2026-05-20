"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Coins,
  CalendarDays,
  CheckCircle2,
  Upload,
  Send,
  Check,
} from "lucide-react";

export interface JobDetail {
  id: string;
  reference: string;
  slug: string | null;
  title: string;
  department: string | null;
  contractType: string;
  category: string;
  positions: number;
  summary: string | null;
  description: string;
  requirements: string;
  missions: string[];
  profileItems: string[];
  benefits: string[];
  experienceMin: number | null;
  region: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  publishedAt: string | null;
  expiresAt: string | null;
}

interface Props {
  tenantName: string;
  primaryColor: string | null;
  job: JobDetail;
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
  if (min === null) return `≤ ${fmt(max!)} FCFA`;
  if (max === null) return `≥ ${fmt(min)} FCFA`;
  return `${fmt(min)} - ${fmt(max)} FCFA`;
}

export function JobDetailMain({ tenantName, primaryColor, job }: Props) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  return (
    <>
      <div className="border-b border-line bg-surface-alt">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <Link
            href="/recrutement"
            className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux offres
          </Link>
        </div>
      </div>

      <section
        className="text-white"
        style={{
          background: `linear-gradient(135deg, #2A1B3D 0%, ${primaryColor ?? "#7E22CE"} 100%)`,
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {job.contractType}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {job.category}
            </span>
            {job.positions > 1 ? (
              <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                {job.positions} postes
              </span>
            ) : null}
            <span className="text-[11px] text-white/60">{job.reference}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
            {job.title}
          </h1>
          {job.department ? (
            <p className="mt-1 text-white/85">
              {tenantName} · {job.department}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/85">
            {job.region ? (
              <Pill icon={<MapPin className="h-4 w-4" />}>{job.region}</Pill>
            ) : null}
            {job.experienceMin !== null && job.experienceMin > 0 ? (
              <Pill icon={<Briefcase className="h-4 w-4" />}>
                {job.experienceMin}+ ans d&apos;expérience
              </Pill>
            ) : null}
            {salary ? (
              <Pill icon={<Coins className="h-4 w-4" />}>{salary}</Pill>
            ) : null}
            {job.publishedAt ? (
              <Pill icon={<CalendarDays className="h-4 w-4" />}>
                Publié le{" "}
                {new Date(job.publishedAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Pill>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <article className="space-y-6">
            {job.summary ? (
              <section className="rounded-lg border border-line bg-white p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary-700">
                  Le poste en bref
                </h2>
                <p className="mt-2 text-sm text-ink-2">{job.summary}</p>
              </section>
            ) : null}

            <ItemSection title="Vos missions" items={job.missions} fallback={job.description} />
            <ItemSection
              title="Profil recherché"
              items={job.profileItems}
              fallback={job.requirements}
            />
            <ItemSection title="Ce que nous offrons" items={job.benefits} />
          </article>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <ApplyCard
              jobOfferSlug={job.slug ?? job.id}
              jobTitle={job.title}
              primaryColor={primaryColor}
            />
          </aside>
        </div>
      </div>
    </>
  );
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
      {icon}
      {children}
    </span>
  );
}

function ItemSection({
  title,
  items,
  fallback,
}: {
  title: string;
  items: string[];
  fallback?: string;
}) {
  if (items.length === 0 && !fallback) return null;
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-primary-700">
        {title}
      </h2>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-ink-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{fallback}</p>
      )}
    </section>
  );
}

function ApplyCard({
  jobOfferSlug,
  jobTitle,
  primaryColor,
}: {
  jobOfferSlug: string;
  jobTitle: string;
  primaryColor: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
    fd.append("coverLetter", coverLetter);
    fd.append("jobOfferSlug", jobOfferSlug);
    fd.append("isSpontaneous", "false");
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
    router.refresh();
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-bold text-emerald-800">Candidature envoyée</h3>
        <p className="mt-1 text-xs text-emerald-700">
          L&apos;équipe RH revient vers vous sous 5 jours ouvrés.
        </p>
        <Link
          href="/cand/signup"
          className="mt-3 inline-block text-xs font-medium text-emerald-800 hover:underline"
        >
          Créer mon espace candidat →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h3 className="text-sm font-bold text-ink">Postuler à cette offre</h3>
      {!open ? (
        <>
          <p className="mt-1 text-xs text-ink-3">
            Candidature en 3 minutes, CV optionnel.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-brand hover:opacity-90"
            style={{ background: primaryColor ?? "#A855F7" }}
          >
            Postuler à : {jobTitle}
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
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
          <Field label="Message">
            <textarea
              rows={3}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <label className="flex items-center justify-between rounded-md border border-line bg-surface-alt px-2 py-1.5">
            <span className="inline-flex items-center gap-1.5 truncate text-xs text-ink-2">
              <Upload className="h-3.5 w-3.5 text-primary" />
              {cvName ?? "CV PDF (optionnel)"}
            </span>
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
              className="rounded-md border border-line bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-surface-alt"
            >
              Choisir
            </button>
          </label>
          <label className="flex items-start gap-2 text-[11px] text-ink-3">
            <input
              type="checkbox"
              required
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-line text-primary"
            />
            <span>J&apos;accepte la politique de confidentialité.</span>
          </label>
          {error ? (
            <p className="rounded-md bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={sending || !accept}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-brand hover:opacity-90 disabled:opacity-60"
            style={{ background: primaryColor ?? "#A855F7" }}
          >
            {sending ? "Envoi…" : "Envoyer ma candidature"}
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}

const INPUT_CLS =
  "mt-0.5 w-full rounded-md border border-line-2 bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
