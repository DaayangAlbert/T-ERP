"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ProfessionDatalist,
  PROFESSION_DATALIST_ID,
} from "@/components/common/ProfessionDatalist";

export function CandidateSignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [desiredJob, setDesiredJob] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cand/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          desiredJob,
          acceptTerms,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Inscription impossible");
        return;
      }
      router.push("/cand/dashboard");
      router.refresh();
    } catch {
      setError("Erreur réseau, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-ink">
          Créer un compte candidat
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          Postulez aux offres et suivez vos candidatures.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-ink">
          Nom complet <span className="text-rose-600">*</span>
        </span>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">
          Email <span className="text-rose-600">*</span>
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">Téléphone</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+237 ..."
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">Métier / poste recherché</span>
        <input
          type="text"
          list={PROFESSION_DATALIST_ID}
          value={desiredJob}
          onChange={(e) => setDesiredJob(e.target.value)}
          placeholder="Ex : Maçon, Agent de sécurité, Ménagère, Comptable…"
          className={inputCls}
        />
        <ProfessionDatalist />
        <span className="mt-1 block text-[11px] text-ink-3">
          Tous secteurs — choisissez ou saisissez votre métier.
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">
          Mot de passe <span className="text-rose-600">*</span>
        </span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        <span className="mt-1 block text-[11px] text-ink-3">
          8 caractères minimum.
        </span>
      </label>

      <label className="flex items-start gap-2 text-xs text-ink-3">
        <input
          type="checkbox"
          required
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line text-primary focus:ring-primary"
        />
        <span>
          J&apos;accepte les CGU et la politique de confidentialité
          (loi 2010/012 Cameroun sur la protection des données).
        </span>
      </label>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !acceptTerms}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-brand transition-colors hover:bg-primary-600 disabled:opacity-60"
      >
        {loading ? "Création…" : "Créer mon compte"}
      </button>

      <div className="text-center text-xs">
        <span className="text-ink-3">Déjà inscrit ? </span>
        <Link
          href="/?login=1"
          className="font-medium text-primary-700 hover:underline"
        >
          Se connecter
        </Link>
      </div>
    </form>
  );
}
