"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

interface Plan {
  code: string;
  name: string;
  monthlyPriceXAF: number;
}

export function ProvisionTenantWizard({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    country: "CM",
    legalForm: "SA",
    taxId: "",
    planCode: plans[0]?.code ?? "PRO",
    billingContactEmail: "",
    billingContactName: "",
    paymentMethod: "BANK_TRANSFER",
    isDemoTenant: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "name" && !form.slug) {
      // Auto-générer le slug
      const auto = String(v)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30);
      setForm((f) => ({ ...f, slug: auto }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-cyan-300"
      >
        <Plus className="h-4 w-4" /> Provisionner un tenant
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.85)" }}
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl"
            style={{ background: "#1E293B", borderColor: "#334155" }}
          >
            <header className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Provisionner un nouveau tenant
                </h3>
                <p className="text-xs text-white/60">
                  Pipeline MVP synchrone (en prod : DNS + R2 + emails ~3 min)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Raison sociale *">
                <input
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={CLS}
                  style={INP_STYLE}
                />
              </Field>
              <Field label="Sous-domaine *">
                <div className="mt-1 flex items-center rounded-md border text-sm" style={INP_STYLE}>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value.toLowerCase())}
                    className="flex-1 bg-transparent px-3 py-2 text-white outline-none"
                    placeholder="batimcam"
                  />
                  <span className="border-l px-2 py-2 text-xs text-white/50" style={{ borderColor: "#334155" }}>
                    .terp.cm
                  </span>
                </div>
              </Field>
              <Field label="Pays">
                <select
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  className={CLS}
                  style={INP_STYLE}
                >
                  <option value="CM">Cameroun</option>
                  <option value="CIV">Côte d&apos;Ivoire</option>
                  <option value="GA">Gabon</option>
                  <option value="SN">Sénégal</option>
                </select>
              </Field>
              <Field label="Forme juridique">
                <select
                  value={form.legalForm}
                  onChange={(e) => set("legalForm", e.target.value)}
                  className={CLS}
                  style={INP_STYLE}
                >
                  <option value="SA">SA</option>
                  <option value="SARL">SARL</option>
                  <option value="SAS">SAS</option>
                  <option value="GIE">GIE</option>
                  <option value="INDIVIDUAL">Entreprise individuelle</option>
                  <option value="OTHER">Autre</option>
                </select>
              </Field>
              <Field label="NIU (optionnel)">
                <input
                  value={form.taxId}
                  onChange={(e) => set("taxId", e.target.value)}
                  className={CLS}
                  style={INP_STYLE}
                />
              </Field>
              <Field label="Plan *">
                <select
                  required
                  value={form.planCode}
                  onChange={(e) => set("planCode", e.target.value)}
                  className={CLS}
                  style={INP_STYLE}
                >
                  {plans.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} · {Math.round(p.monthlyPriceXAF / 1_000)} K XAF/mois
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Contact facturation — email *">
                <input
                  required
                  type="email"
                  value={form.billingContactEmail}
                  onChange={(e) => set("billingContactEmail", e.target.value)}
                  className={CLS}
                  style={INP_STYLE}
                />
              </Field>
              <Field label="Contact facturation — nom *">
                <input
                  required
                  value={form.billingContactName}
                  onChange={(e) => set("billingContactName", e.target.value)}
                  className={CLS}
                  style={INP_STYLE}
                />
              </Field>
              <Field label="Méthode de paiement">
                <select
                  value={form.paymentMethod}
                  onChange={(e) => set("paymentMethod", e.target.value)}
                  className={CLS}
                  style={INP_STYLE}
                >
                  <option value="BANK_TRANSFER">Virement bancaire</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CARD">Carte</option>
                  <option value="INVOICE_30D">Facture 30j</option>
                </select>
              </Field>
              <label className="flex items-end gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={form.isDemoTenant}
                  onChange={(e) => set("isDemoTenant", e.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-transparent text-cyan-400 focus:ring-cyan-400"
                />
                Tenant démo (30 jours d&apos;essai)
              </label>
            </div>
            {error ? (
              <p className="mt-3 rounded-md bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-white/20 bg-transparent px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-cyan-400 px-5 py-2 text-sm font-semibold text-[#0F172A] hover:bg-cyan-300 disabled:opacity-60"
              >
                {submitting ? "Provisionnement…" : "Provisionner maintenant"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

const CLS =
  "mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-cyan-400";
const INP_STYLE: React.CSSProperties = {
  background: "#0F172A",
  borderColor: "#334155",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-white/80">{label}</span>
      {children}
    </label>
  );
}
