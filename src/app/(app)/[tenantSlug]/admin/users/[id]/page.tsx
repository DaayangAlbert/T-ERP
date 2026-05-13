"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Shield } from "lucide-react";

interface UserDetail {
  user: {
    id: string;
    employeeId: string | null;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    status: string;
    position: string | null;
    category: string | null;
    hireDate: string | null;
    contractType: string | null;
    twoFactorEnabled: boolean;
    assignedSiteIds: string[];
    lastLoginAt: string | null;
    createdAt: string;
  };
  assignedSites: Array<{ id: string; code: string; name: string }>;
  recentAudit: Array<{ id: string; action: string; entityType: string | null; createdAt: string; metadata: unknown }>;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "user", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${params.id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<UserDetail>;
    },
  });

  const sitesQuery = useQuery({
    queryKey: ["admin", "sites"],
    queryFn: async () => {
      const res = await fetch("/api/sites", { credentials: "same-origin" });
      if (!res.ok) return { items: [] };
      const json = await res.json();
      return json as { items: Array<{ id: string; code: string; name: string }> };
    },
  });

  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (data) {
      setSiteIds(data.user.assignedSiteIds);
      setPosition(data.user.position ?? "");
      setStatus(data.user.status);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedSiteIds: siteIds, position, status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "user", params.id] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  if (isLoading || !data) {
    return <div className="p-3 text-[13px] text-ink-3">Chargement…</div>;
  }

  const u = data.user;
  return (
    <div data-rh-screen className="space-y-3" id="screen-config-user-detail">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {u.firstName} {u.lastName}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {u.email} · {u.role} · {u.status}
          </p>
        </div>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> {save.isPending ? "Sauvegarde…" : "Enregistrer"}
        </button>
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-white p-4 shadow-card lg:col-span-2">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Informations</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Matricule">{u.employeeId ?? "—"}</Field>
            <Field label="Téléphone">{u.phone ?? "—"}</Field>
            <Field label="Catégorie">{u.category ?? "—"}</Field>
            <Field label="Contrat">{u.contractType ?? "—"}</Field>
            <Field label="Date embauche">{u.hireDate ? new Date(u.hireDate).toLocaleDateString("fr-FR") : "—"}</Field>
            <Field label="2FA">{u.twoFactorEnabled ? "Activé" : "Non activé"}</Field>
            <Field label="Dernière connexion">
              {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("fr-FR") : "—"}
            </Field>
            <Field label="Compte créé le">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</Field>
          </dl>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] font-medium text-ink-2">
              Poste
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
              />
            </label>
            <label className="text-[12px] font-medium text-ink-2">
              Statut
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
              >
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
                <option value="SUSPENDED">Suspendu</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <Shield className="h-3.5 w-3.5" /> Périmètre chantiers
          </h2>
          <p className="mb-2 text-[12px] text-ink-3">
            Vide = vue globale (Comptable Direction). Sélectionnez 1+ chantier pour restreindre.
          </p>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-line p-2">
            {(sitesQuery.data?.items ?? []).map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-surface-alt">
                <input
                  type="checkbox"
                  checked={siteIds.includes(s.id)}
                  onChange={(e) =>
                    setSiteIds((cur) =>
                      e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)
                    )
                  }
                />
                <span className="text-[12.5px] text-ink-2">
                  <span className="font-medium">{s.code}</span> — {s.name}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-2 text-[11.5px] text-ink-3">
            {siteIds.length === 0
              ? "→ Vue globale (cadre dirigeant ou Comptable Direction)"
              : `→ ${siteIds.length} chantier${siteIds.length > 1 ? "s" : ""} accessibles`}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Activité récente · 20 dernières actions
        </h2>
        {data.recentAudit.length === 0 ? (
          <p className="text-[12.5px] text-ink-3">Aucune action enregistrée.</p>
        ) : (
          <ul className="divide-y divide-line text-[12.5px]">
            {data.recentAudit.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 py-2">
                <div>
                  <span className="font-medium text-ink">{a.action}</span>
                  {a.entityType && <span className="ml-2 text-ink-3">{a.entityType}</span>}
                </div>
                <span className="text-ink-3">{new Date(a.createdAt).toLocaleString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11.5px] uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-ink-2">{children}</dd>
    </div>
  );
}
