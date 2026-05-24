"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ExternalLink, Globe, LogOut } from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire / PCA",
  DG: "Directeur Général",
  DAF: "Directrice administrative et financière",
  SG: "Secrétaire générale",
  HR: "Responsable RH",
  TECH_DIRECTOR: "Directeur technique",
  WORKS_DIRECTOR: "Directeur de travaux",
  WORKS_MANAGER: "Conducteur de travaux",
  SITE_MANAGER: "Chef de chantier",
  WORKER: "Ouvrier",
  ACCOUNTANT: "Comptable",
  PURCHASING_OFFICER: "Chargé des achats",
  LOGISTICS: "Logistique",
  WAREHOUSE: "Magasinier",
  GED: "Gestion documentaire",
  EMPLOYEE: "Employé bureau",
  TENANT_ADMIN: "Administrateur informatique",
  CANDIDATE: "Candidat externe",
  SUPER_ADMIN: "Super-admin SaaS",
};

const AVATAR_TONES = ["#2A1B3D", "#0F766E", "#9F580A", "#7C3AED"];

interface ProfileUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  position: string | null;
  avatarUrl: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// `next.config.js` ne définit pas NODE_ENV côté client, mais Next.js fait un
// build-time replace de process.env.NODE_ENV ("production" en build prod).
const IS_PROD = process.env.NODE_ENV === "production";

export function ProfileSwitcher({ open, onClose }: Props) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const setTenant = useTenantStore((s) => s.setTenant);
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    logout();
    setTenant(null);
    onClose();
    router.push("/");
    router.refresh();
  };

  useEffect(() => {
    if (!open) return;
    // En prod : pas de switch démo, donc pas besoin de lister les autres users.
    if (IS_PROD) return;
    setLoading(true);
    setError(null);
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users ?? []);
        setCurrentId(d.currentUserId ?? null);
      })
      .catch(() => setError("Impossible de charger les profils"))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const switchTo = async (userId: string) => {
    setSwitchingId(userId);
    setError(null);
    const res = await fetch("/api/auth/switch-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Échec du switch");
      setSwitchingId(null);
      return;
    }
    const json = await res.json().catch(() => ({}));
    const slug: string | null = json.user?.tenantSlug ?? null;
    onClose();
    router.push(slug ? `/${slug}/dashboard` : "/");
    router.refresh();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-switcher-title"
    >
      <div className="w-full max-w-[640px] animate-modal-slide-up overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ background: "linear-gradient(135deg,#2A1B3D 0%,#7E22CE 100%)" }}
        >
          <div>
            <h3 id="profile-switcher-title" className="text-base font-semibold">
              {IS_PROD ? "Mon compte" : "Changer de profil démo"}
            </h3>
            <p className="text-[11.5px] text-white/75">
              {IS_PROD
                ? "Gérez votre session"
                : "Mode démo · bascule entre les utilisateurs sans ressaisir le mot de passe"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          {/* Bloc switch démo : masqué en prod (sécurité — pas de bascule sans
              mot de passe sur des comptes clients réels) */}
          {!IS_PROD && (
            <>
              {loading ? (
                <ProfileSkeleton />
              ) : error ? (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
                  {error}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {users.map((u, i) => (
                    <ProfileCard
                      key={u.id}
                      user={u}
                      active={u.id === currentId}
                      switching={u.id === switchingId}
                      tone={AVATAR_TONES[i % AVATAR_TONES.length]}
                      onClick={() => switchTo(u.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          <div className={clsx("flex justify-end", !IS_PROD && "mt-5")}>
            <button
              onClick={onLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              {loggingOut ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </div>

          {/* Liens vers admin SaaS / portail public : dev only (URLs en
              terp.local:5000, sans valeur en prod). */}
          {!IS_PROD && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href="http://admin.terp.local:5000"
                className="flex items-center gap-2 rounded-lg border border-line bg-[#0F172A] px-3 py-2.5 text-white transition hover:bg-[#1E293B]"
              >
                <span className="grid h-8 w-8 place-items-center rounded bg-cyan-400 text-[11px] font-bold text-[#0F172A]">
                  SA
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">Super-admin SaaS</span>
                  <span className="block text-[11px] text-white/65">
                    Console plateforme T-ERP
                  </span>
                </span>
                <ExternalLink className="h-4 w-4 text-white/65" />
              </a>
              <a
                href="http://app.terp.local:5000"
                className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5 transition hover:border-primary-300"
              >
                <span className="grid h-8 w-8 place-items-center rounded bg-primary-100 text-primary-700">
                  <Globe className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-ink">
                    Retour au portail public
                  </span>
                  <span className="block text-[11px] text-ink-3">
                    Voir les offres d'emploi sans session
                  </span>
                </span>
                <ExternalLink className="h-4 w-4 text-ink-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileCard({
  user,
  active,
  switching,
  tone,
  onClick,
}: {
  user: ProfileUser;
  active: boolean;
  switching: boolean;
  tone: string;
  onClick: () => void;
}) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  return (
    <button
      onClick={onClick}
      disabled={switching}
      className={clsx(
        "flex items-center gap-2.5 rounded-lg border bg-white px-2.5 py-2 text-left transition disabled:opacity-60",
        active
          ? "border-primary-500 bg-primary-50 ring-1 ring-primary-200"
          : "border-line hover:border-primary-300"
      )}
    >
      <span
        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
        style={{ background: tone }}
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-ink">
          {user.firstName} {user.lastName}
        </span>
        <span className="block truncate text-[11px] text-ink-3">
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </span>
      {active && (
        <span className="rounded-full bg-primary-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          actif
        </span>
      )}
      {switching && (
        <span className="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      )}
    </button>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-lg border border-line p-2.5">
          <div className="h-9 w-9 animate-pulse rounded-full bg-surface-alt" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-alt" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-alt" />
          </div>
        </div>
      ))}
    </div>
  );
}
