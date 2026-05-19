"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Palette, Globe, Shield, Calendar, Bell, Save, FileBadge, Upload, Trash2, Loader2 } from "lucide-react";

interface Settings {
  identity: Record<string, string>;
  branding: { primaryColor: string; secondaryColor: string; logoUrl: string | null; tagline: string };
  localization: { defaultLanguage: string; defaultCurrency: string; timezone: string; dateFormat: string; firstDayOfWeek: number };
  security: {
    minPasswordLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireDigit: boolean;
    passwordRequireSymbol: boolean;
    passwordExpiryDays: number;
    sessionInactivityMinutes: number;
    mfaRequiredForDirection: boolean;
    mfaRequiredForTransverse: boolean;
    mfaRequiredForAll: boolean;
    autoDeactivateInactiveDays: number;
  };
  fiscal: { fiscalYearStart: number; chartOfAccounts: string; standardVatRate: number };
  notifications: Record<string, boolean>;
}

export default function ItSettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["it", "settings"],
    queryFn: async (): Promise<Settings> => {
      const res = await fetch("/api/it/tenant/settings", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const [dirty, setDirty] = useState<Partial<Settings>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const save = useMutation({
    mutationFn: async () => {
      setError(null);
      const res = await fetch("/api/it/tenant/settings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dirty),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      setDirty({});
      setSuccess(true);
      qc.invalidateQueries({ queryKey: ["it", "settings"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!data) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-alt" />)}</div>;
  }

  const merged: Settings = {
    ...data,
    ...dirty,
    identity: { ...data.identity, ...(dirty.identity ?? {}) },
    branding: { ...data.branding, ...(dirty.branding ?? {}) },
    localization: { ...data.localization, ...(dirty.localization ?? {}) },
    security: { ...data.security, ...(dirty.security ?? {}) },
    fiscal: { ...data.fiscal, ...(dirty.fiscal ?? {}) },
    notifications: { ...data.notifications, ...(dirty.notifications ?? {}) },
  };

  function patch<K extends keyof Settings>(section: K, patch: Partial<Settings[K]>) {
    setDirty((cur) => ({ ...cur, [section]: { ...(cur[section] as object ?? {}), ...patch } } as Partial<Settings>));
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Paramètres tenant</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Configuration générale, branding, sécurité, localisation — journalisé dans AuditLog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {success && <span className="text-[12px] font-medium text-success">✓ Sauvegardé</span>}
          <button
            type="button"
            onClick={() => setDirty({})}
            disabled={Object.keys(dirty).length === 0}
            className="h-9 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || Object.keys(dirty).length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {save.isPending ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-[12.5px] text-danger">{error}</div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Identité tenant" icon={Building2}>
          <Field label="Raison sociale" value={merged.identity.legalName ?? ""} onChange={(v) => patch("identity", { legalName: v })} />
          <Field label="Forme juridique" value={merged.identity.legalForm ?? ""} onChange={(v) => patch("identity", { legalForm: v })} />
          <Field label="NIU DGI" value={merged.identity.niu ?? ""} onChange={(v) => patch("identity", { niu: v })} mono />
          <Field label="N° CNPS" value={merged.identity.cnpsNumber ?? ""} onChange={(v) => patch("identity", { cnpsNumber: v })} mono />
        </Card>

        <Card title="Identité visuelle" icon={Palette}>
          <Field label="Slogan" value={merged.branding.tagline} onChange={(v) => patch("branding", { tagline: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Couleur primaire" value={merged.branding.primaryColor} onChange={(v) => patch("branding", { primaryColor: v })} mono />
            <Field label="Couleur secondaire" value={merged.branding.secondaryColor} onChange={(v) => patch("branding", { secondaryColor: v })} mono />
          </div>
        </Card>

        <Card title="Localisation" icon={Globe}>
          <Field label="Langue" value={merged.localization.defaultLanguage} onChange={(v) => patch("localization", { defaultLanguage: v })} mono />
          <Field label="Devise" value={merged.localization.defaultCurrency} onChange={(v) => patch("localization", { defaultCurrency: v })} mono />
          <Field label="Fuseau horaire" value={merged.localization.timezone} onChange={(v) => patch("localization", { timezone: v })} mono />
          <Field label="Format date" value={merged.localization.dateFormat} onChange={(v) => patch("localization", { dateFormat: v })} mono />
        </Card>

        <Card title="Sécurité" icon={Shield}>
          <Field
            label="Longueur min. MDP"
            type="number"
            value={String(merged.security.minPasswordLength)}
            onChange={(v) => patch("security", { minPasswordLength: Number(v) })}
          />
          <Field
            label="Expiration MDP (jours)"
            type="number"
            value={String(merged.security.passwordExpiryDays)}
            onChange={(v) => patch("security", { passwordExpiryDays: Number(v) })}
          />
          <Field
            label="Inactivité session (min)"
            type="number"
            value={String(merged.security.sessionInactivityMinutes)}
            onChange={(v) => patch("security", { sessionInactivityMinutes: Number(v) })}
          />
          <Toggle
            label="MFA obligatoire direction"
            checked={merged.security.mfaRequiredForDirection}
            onChange={(v) => patch("security", { mfaRequiredForDirection: v })}
          />
          <Toggle
            label="MFA obligatoire transverses"
            checked={merged.security.mfaRequiredForTransverse}
            onChange={(v) => patch("security", { mfaRequiredForTransverse: v })}
          />
          <Toggle
            label="MFA obligatoire pour tous"
            checked={merged.security.mfaRequiredForAll}
            onChange={(v) => patch("security", { mfaRequiredForAll: v })}
          />
        </Card>

        <Card title="Exercice fiscal" icon={Calendar}>
          <Field
            label="Mois de début"
            type="number"
            value={String(merged.fiscal.fiscalYearStart)}
            onChange={(v) => patch("fiscal", { fiscalYearStart: Number(v) })}
          />
          <Field label="Plan comptable" value={merged.fiscal.chartOfAccounts} onChange={(v) => patch("fiscal", { chartOfAccounts: v })} mono />
          <Field
            label="TVA standard (%)"
            type="number"
            value={String(merged.fiscal.standardVatRate)}
            onChange={(v) => patch("fiscal", { standardVatRate: Number(v) })}
          />
        </Card>

        <Card title="Notifications globales" icon={Bell}>
          <Toggle label="Email" checked={!!merged.notifications.emailEnabled} onChange={(v) => patch("notifications", { emailEnabled: v })} />
          <Toggle label="WhatsApp" checked={!!merged.notifications.whatsappEnabled} onChange={(v) => patch("notifications", { whatsappEnabled: v })} />
          <Toggle label="Push navigateur" checked={!!merged.notifications.browserPushEnabled} onChange={(v) => patch("notifications", { browserPushEnabled: v })} />
          <Toggle label="SMS" checked={!!merged.notifications.smsEnabled} onChange={(v) => patch("notifications", { smsEnabled: v })} />
          <Toggle label="Digest hebdo DG" checked={!!merged.notifications.digestWeeklyEnabled} onChange={(v) => patch("notifications", { digestWeeklyEnabled: v })} />
        </Card>

        <div className="lg:col-span-2">
          <BrandingCard />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Documents officiels — Coordonnées entreprise + assets (logo, signature, cachet)
// affichés sur les bulletins de paie, factures, attestations.
// Édition autonome via /api/it/tenant/branding.
// ════════════════════════════════════════════════════════════════════════

interface Branding {
  name: string;
  contactAddress: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  signatureImageUrl: string | null;
  stampImageUrl: string | null;
  drhSignatoryName: string | null;
}

function BrandingCard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["it", "tenant", "branding"],
    queryFn: async (): Promise<Branding> => {
      const res = await fetch("/api/it/tenant/branding");
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    },
  });

  const [dirty, setDirty] = useState<Partial<Branding>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const save = useMutation({
    mutationFn: async () => {
      setError(null);
      const res = await fetch("/api/it/tenant/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dirty),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      setDirty({});
      setSuccess(true);
      qc.invalidateQueries({ queryKey: ["it", "tenant", "branding"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!data) return <Card title="Documents officiels & coordonnées" icon={FileBadge}><div className="h-32 animate-pulse rounded bg-surface-alt" /></Card>;

  const merged: Branding = { ...data, ...dirty };
  const set = (patch: Partial<Branding>) => setDirty((c) => ({ ...c, ...patch }));

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          <FileBadge className="h-3.5 w-3.5" /> Documents officiels &amp; coordonnées
          <span className="ml-2 text-[10px] font-normal text-ink-3 normal-case">
            (affichés sur bulletins, factures, attestations)
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {success && <span className="text-[12px] font-medium text-success">✓ Sauvegardé</span>}
          {error && <span className="text-[12px] font-medium text-danger">{error}</span>}
          <button
            type="button"
            onClick={() => setDirty({})}
            disabled={Object.keys(dirty).length === 0}
            className="h-8 rounded-md border border-line-2 bg-white px-2.5 text-[12px] font-medium text-ink-2 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || Object.keys(dirty).length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-600 px-2.5 text-[12px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {save.isPending ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Coordonnées</h3>
          <Field label="Adresse postale" value={merged.contactAddress ?? ""} onChange={(v) => set({ contactAddress: v || null })} />
          <Field label="Téléphone" value={merged.contactPhone ?? ""} onChange={(v) => set({ contactPhone: v || null })} />
          <Field label="Email contact" type="email" value={merged.contactEmail ?? ""} onChange={(v) => set({ contactEmail: v || null })} />
          <Field label="Site web" value={merged.websiteUrl ?? ""} onChange={(v) => set({ websiteUrl: v || null })} />
          <Field label="Signataire DRH (libellé bulletin)" value={merged.drhSignatoryName ?? ""} onChange={(v) => set({ drhSignatoryName: v || null })} />
        </div>

        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Assets (téléversement)</h3>
          <AssetUpload
            label="Logo entreprise"
            kind="logo"
            url={merged.logoUrl}
            hint="PNG / JPG / SVG / WebP — 256×256 carré recommandé, max 2 Mo."
          />
          <AssetUpload
            label="Signature DRH scannée"
            kind="signature"
            url={merged.signatureImageUrl}
            hint="PNG transparent — 200×80 horizontal recommandé, max 2 Mo."
          />
          <AssetUpload
            label="Cachet entreprise"
            kind="stamp"
            url={merged.stampImageUrl}
            hint="PNG transparent — 140×140 circulaire recommandé, max 2 Mo."
          />
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// AssetUpload — téléversement réel d'un asset (logo / signature / cachet).
// POST multipart vers /api/it/tenant/branding/upload ; rafraîchit la query
// branding au succès. Bouton 'Supprimer' = PATCH avec null sur le champ.
// ════════════════════════════════════════════════════════════════════════

function AssetUpload({
  label, kind, url, hint,
}: {
  label: string;
  kind: "logo" | "signature" | "stamp";
  url: string | null;
  hint?: string;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File): Promise<{ url: string }> => {
      setError(null);
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch("/api/it/tenant/branding/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["it", "tenant", "branding"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const clear = useMutation({
    mutationFn: async () => {
      setError(null);
      const dbField = { logo: "logoUrl", signature: "signatureImageUrl", stamp: "stampImageUrl" }[kind];
      const res = await fetch("/api/it/tenant/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [dbField]: null }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["it", "tenant", "branding"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const busy = upload.isPending || clear.isPending;

  return (
    <div className="rounded-md border border-line bg-surface-alt/30 p-2.5">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border border-line bg-white">
          {url ? (
            <Image src={url} alt={label} fill className="object-contain" unoptimized />
          ) : (
            <div className="grid h-full w-full place-items-center text-[9.5px] text-ink-3">vide</div>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-white/70">
              <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12.5px] font-semibold text-ink-2">{label}</label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="inline-flex h-7 items-center gap-1 rounded border border-primary-300 bg-white px-2 text-[11.5px] font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50"
              >
                <Upload className="h-3 w-3" /> {url ? "Remplacer" : "Téléverser"}
              </button>
              {url && (
                <button
                  type="button"
                  onClick={() => clear.mutate()}
                  disabled={busy}
                  className="inline-flex h-7 items-center gap-1 rounded border border-danger/40 bg-white px-2 text-[11.5px] font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> Supprimer
                </button>
              )}
            </div>
          </div>
          {hint && <p className="mt-0.5 text-[10.5px] text-ink-3">{hint}</p>}
          {url && (
            <p className="mt-0.5 truncate font-mono text-[10px] text-ink-3" title={url}>
              {url}
            </p>
          )}
          {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload.mutate(f);
          // Reset l'input pour pouvoir re-sélectionner le même fichier après suppression
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Building2; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
}) {
  return (
    <label className="block text-[12px] font-medium text-ink-2">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-md border border-line px-3 py-2 text-[12.5px]">
      <span className="text-ink-2">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}
