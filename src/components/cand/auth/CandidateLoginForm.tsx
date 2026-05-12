"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CandidateLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cand/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Identifiants invalides");
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-ink">
          Connexion à votre espace
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          Accédez à vos candidatures et entretiens.
        </p>
      </div>

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
          className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">
          Mot de passe <span className="text-rose-600">*</span>
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-brand transition-colors hover:bg-primary-600 disabled:opacity-60"
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>

      <div className="flex items-center justify-between text-xs">
        <Link
          href="/cand/signup"
          className="font-medium text-primary-700 hover:underline"
        >
          Créer un compte
        </Link>
        <Link href="/" className="text-ink-3 hover:underline">
          ← Retour au portail
        </Link>
      </div>

      <div className="rounded-md bg-surface-alt p-3 text-xs text-ink-3">
        <span className="font-semibold text-ink-2">Démo :</span>{" "}
        jean.ngongo@email.cm / Demo2026!
      </div>
    </form>
  );
}
