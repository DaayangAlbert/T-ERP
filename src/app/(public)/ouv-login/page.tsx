"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Delete, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";

// Login mobile-first ouvrier : téléphone + PIN 6 chiffres.
// Pad numérique XXL (60px+) optimisé mains sales/gantées. Pas de mot de passe.
// La page est servie hors authentification (route group (public)).

export default function OuvLoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.login);
  const setTenant = useTenantStore((s) => s.setTenant);

  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  // Auto-submit quand 6 chiffres atteints
  useEffect(() => {
    if (pin.length === 6 && !submitting) {
      void submitLogin(phone, pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function submitLogin(phoneVal: string, pinVal: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/ouv-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneVal, pin: pinVal }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Connexion échouée");
        setPin("");
        return;
      }
      setUser(json.user, "");
      let slug: string | null = json.user.tenantSlug ?? null;
      if (json.user.tenantId) {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.user?.tenant) {
            setTenant(me.user.tenant);
            slug = me.user.tenant.slug ?? slug;
          }
        }
      }
      router.push(slug ? `/${slug}/ouv/dashboard` : "/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const pressDigit = (d: string) => {
    if (submitting) return;
    setError(null);
    setPin((prev) => (prev.length >= 6 ? prev : prev + d));
  };
  const pressBackspace = () => {
    if (submitting) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-purple-700 via-purple-600 to-fuchsia-600">
      <header className="px-6 pt-10 text-white">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <Smartphone className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-3xl font-bold leading-tight">T-ERP</h1>
        <p className="mt-1 text-sm opacity-90">Espace ouvrier · BatimCAM</p>
      </header>

      <div className="mt-6 flex-1 rounded-t-3xl bg-white px-5 pb-6 pt-6 shadow-2xl">
        {step === "phone" ? (
          <PhoneStep
            phone={phone}
            setPhone={setPhone}
            inputRef={phoneInputRef}
            error={error}
            onContinue={() => {
              if (phone.replace(/\D/g, "").length < 8) {
                setError("Téléphone invalide");
                return;
              }
              setError(null);
              setStep("pin");
            }}
          />
        ) : (
          <PinStep
            phone={phone}
            pin={pin}
            error={error}
            submitting={submitting}
            onDigit={pressDigit}
            onBackspace={pressBackspace}
            onBackToPhone={() => {
              setPin("");
              setError(null);
              setStep("phone");
            }}
          />
        )}
      </div>
    </div>
  );
}

function PhoneStep({
  phone,
  setPhone,
  inputRef,
  error,
  onContinue,
}: {
  phone: string;
  setPhone: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  error: string | null;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Connexion</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tape ton numéro de téléphone professionnel
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-medium text-slate-600">
          Téléphone
        </span>
        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+237 6 78 24 18 92"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onContinue();
          }}
          className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-base font-semibold text-white shadow-lg shadow-purple-600/30 active:scale-[0.98]"
      >
        Continuer
        <ArrowRight className="h-5 w-5" />
      </button>

      <p className="text-center text-[12px] text-slate-500">
        Démo : <span className="font-mono">+237 6 78 24 18 92</span> · PIN <span className="font-mono">251937</span>
      </p>
    </div>
  );
}

function PinStep({
  phone,
  pin,
  error,
  submitting,
  onDigit,
  onBackspace,
  onBackToPhone,
}: {
  phone: string;
  pin: string;
  error: string | null;
  submitting: boolean;
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onBackToPhone: () => void;
}) {
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBackToPhone}
        className="text-[13px] font-medium text-purple-600"
      >
        ← Changer le numéro
      </button>

      <div>
        <h2 className="text-xl font-bold text-slate-900">Code PIN</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tape ton PIN à 6 chiffres pour {phone}
        </p>
      </div>

      <div className="flex justify-center gap-2.5" aria-label="PIN à 6 chiffres">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`h-12 w-10 rounded-lg border-2 ${
              i < pin.length
                ? "border-purple-500 bg-purple-50"
                : "border-slate-200 bg-slate-50"
            } flex items-center justify-center text-2xl font-bold text-slate-700`}
          >
            {i < pin.length ? "•" : ""}
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-center text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      {submitting && (
        <p className="text-center text-sm text-slate-500">Connexion…</p>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <PadButton key={d} onClick={() => onDigit(d)} disabled={submitting}>
            {d}
          </PadButton>
        ))}
        <div />
        <PadButton onClick={() => onDigit("0")} disabled={submitting}>
          0
        </PadButton>
        <PadButton onClick={onBackspace} disabled={submitting} aria-label="Effacer">
          <Delete className="h-6 w-6" />
        </PadButton>
      </div>
    </div>
  );
}

function PadButton({
  onClick,
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-16 items-center justify-center rounded-xl bg-slate-100 text-2xl font-semibold text-slate-800 active:bg-purple-100 active:text-purple-700 disabled:opacity-50"
      {...rest}
    >
      {children}
    </button>
  );
}
