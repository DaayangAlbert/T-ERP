"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, otp }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string; needsOtp?: boolean };
      if (data.needsOtp) {
        setShowOtp(true);
        setError("Code MFA requis (TOTP)");
        return;
      }
      setError(data.error ?? "Identifiants invalides");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-center">
        <h1 className="text-lg font-bold text-white">Connexion plateforme</h1>
        <p className="mt-1 text-xs text-white/60">
          Accès super-admin Anthropic uniquement.
        </p>
      </div>
      <label className="block">
        <span className="text-xs font-medium text-white/80">Email *</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT_CLS}
          style={{ background: "#0F172A", borderColor: "#334155" }}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-white/80">Mot de passe *</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT_CLS}
          style={{ background: "#0F172A", borderColor: "#334155" }}
        />
      </label>
      {showOtp ? (
        <label className="block">
          <span className="text-xs font-medium text-cyan-300">Code MFA (TOTP)</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className={`${INPUT_CLS} tracking-widest font-mono`}
          style={{ background: "#0F172A", borderColor: "#22D3EE" }}
          />
          <span className="mt-1 block text-[10px] text-white/40">
            Saisissez le code de votre authenticator
          </span>
        </label>
      ) : null}
      {error ? (
        <p
          className="rounded-md px-3 py-2 text-xs font-medium text-rose-200"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md px-4 py-2.5 text-sm font-bold text-[#0F172A] transition-colors disabled:opacity-60"
        style={{ background: "#22D3EE" }}
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>
      <p className="text-center text-[10px] text-white/40">
        Démo : superadmin@terpgroup.com / Admin2026!
      </p>
    </form>
  );
}

const INPUT_CLS =
  "mt-1 w-full rounded-md border px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1";
