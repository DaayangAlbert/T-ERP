import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, FileText, Building2 } from "lucide-react";
import { requireAdminSession } from "@/lib/admin-session";
import { SendUserMessage } from "@/components/admin/users/SendUserMessage";
import { roleLabel, STATUS_CFG } from "@/components/admin/users/roleLabels";

export const dynamic = "force-dynamic";

interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  phoneMobile: string | null;
  role: string;
  status: string;
  position: string | null;
  department: string | null;
  address: string | null;
  dateOfBirth: string | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isCandidate: boolean;
  tenant: { id: string; name: string; slug: string; status: string } | null;
  employment: { matricule: string | null; employeeId: string | null; hireDate: string | null; contractType: string | null; sites: { code: string; name: string }[] } | null;
  candidate: {
    desiredJob: string | null;
    desiredContractType: string | null;
    desiredLocation: string | null;
    availability: string | null;
    cvUrl: string | null;
    skills: string[];
    gdprConsent: boolean;
    applications: { id: string; stage: string; appliedAt: string; jobTitle: string; company: string }[];
  } | null;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

async function fetchUser(id: string): Promise<UserDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/admin/platform-users/${id}`, {
    cache: "no-store",
    headers: { cookie: cookies().toString() },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Detail API ${res.status}`);
  return res.json();
}

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  requireAdminSession();
  const u = await fetchUser(params.id);
  if (!u) notFound();

  const fullName = `${u.firstName} ${u.lastName}`.trim();
  const sc = STATUS_CFG[u.status] ?? STATUS_CFG.ACTIVE;

  return (
    <div className="space-y-5">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux utilisateurs
      </Link>

      {/* En-tête */}
      <div className="rounded-xl border p-5" style={{ background: "#1E293B", borderColor: "#334155" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-lg font-bold uppercase text-cyan-300">
              {u.firstName.charAt(0)}{u.lastName.charAt(0)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{fullName}</h1>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
              </div>
              <p className="text-sm text-white/70">{roleLabel(u.role)}{u.position ? ` · ${u.position}` : ""}</p>
              <p className="text-xs text-white/50">
                {u.tenant ? u.tenant.name : "Hors société (chercheur d'emploi)"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`mailto:${u.email}`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-white/80 hover:bg-white/5" style={{ borderColor: "#334155" }}>
              <Mail className="h-4 w-4" /> Email
            </a>
            {u.phone && (
              <a href={`tel:${u.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-white/80 hover:bg-white/5" style={{ borderColor: "#334155" }}>
                <Phone className="h-4 w-4" /> Appeler
              </a>
            )}
            <SendUserMessage userId={u.id} userName={fullName} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Contact & identité */}
        <Section title="Contact & identité">
          <Row label="Email professionnel" value={<a href={`mailto:${u.email}`} className="text-cyan-300 hover:underline">{u.email}</a>} />
          <Row label="Email personnel" value={u.personalEmail ? <a href={`mailto:${u.personalEmail}`} className="text-cyan-300 hover:underline">{u.personalEmail}</a> : "—"} />
          <Row label="Téléphone" value={u.phone ? <a href={`tel:${u.phone.replace(/\s/g, "")}`} className="text-cyan-300 hover:underline">{u.phone}</a> : "—"} />
          <Row label="Mobile" value={u.phoneMobile ? <a href={`tel:${u.phoneMobile.replace(/\s/g, "")}`} className="text-cyan-300 hover:underline">{u.phoneMobile}</a> : "—"} />
          <Row label="Adresse" value={u.address ?? "—"} />
          <Row label="Date de naissance" value={fmtDate(u.dateOfBirth)} />
        </Section>

        {/* Compte */}
        <Section title="Compte">
          <Row label="Rôle" value={roleLabel(u.role)} />
          <Row label="Statut" value={sc.label} />
          <Row label="Double authentification" value={u.twoFactorEnabled ? "Activée" : "Désactivée"} />
          <Row label="Email vérifié" value={u.emailVerified ? "Oui" : "Non"} />
          <Row label="Dernière connexion" value={u.lastLoginAt ? fmtDate(u.lastLoginAt) : "Jamais"} />
          <Row label="Inscrit le" value={fmtDate(u.createdAt)} />
        </Section>

        {/* Société */}
        {u.tenant && (
          <Section title="Société">
            <Row label="Nom" value={<span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-white/50" /> {u.tenant.name}</span>} />
            <Row label="Identifiant" value={u.tenant.slug} />
            <Row label="Statut société" value={u.tenant.status} />
          </Section>
        )}

        {/* Emploi */}
        {u.employment && (
          <Section title="Emploi">
            <Row label="Matricule" value={u.employment.matricule ?? "—"} />
            <Row label="ID employé" value={u.employment.employeeId ?? "—"} />
            <Row label="Date d'embauche" value={fmtDate(u.employment.hireDate)} />
            <Row label="Type de contrat" value={u.employment.contractType ?? "—"} />
            <Row label="Chantiers assignés" value={u.employment.sites.length ? u.employment.sites.map((s) => s.code).join(", ") : "—"} />
          </Section>
        )}

        {/* Candidat / chercheur d'emploi */}
        {u.candidate && (
          <Section title="Profil chercheur d'emploi" wide>
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <Row label="Poste recherché" value={u.candidate.desiredJob ?? "—"} />
              <Row label="Type de contrat" value={u.candidate.desiredContractType ?? "—"} />
              <Row label="Localisation" value={u.candidate.desiredLocation ?? "—"} />
              <Row label="Disponibilité" value={u.candidate.availability ?? "—"} />
              <Row label="Consentement RGPD" value={u.candidate.gdprConsent ? "Oui" : "Non"} />
              <Row
                label="CV"
                value={u.candidate.cvUrl
                  ? <a href={u.candidate.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:underline"><FileText className="h-3.5 w-3.5" /> Ouvrir le CV</a>
                  : "—"}
              />
            </div>
            {u.candidate.skills.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">Compétences</p>
                <div className="flex flex-wrap gap-1.5">
                  {u.candidate.skills.map((s) => (
                    <span key={s} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/70">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/45">Candidatures ({u.candidate.applications.length})</p>
              {u.candidate.applications.length === 0 ? (
                <p className="text-xs text-white/40">Aucune candidature.</p>
              ) : (
                <div className="space-y-1.5">
                  {u.candidate.applications.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: "#334155" }}>
                      <div className="min-w-0">
                        <div className="truncate text-white/85">{a.jobTitle}</div>
                        <div className="truncate text-[11px] text-white/45">{a.company} · {fmtDate(a.appliedAt)}</div>
                      </div>
                      <span className="ml-2 shrink-0 rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">{a.stage}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <div className="rounded-xl border p-5" style={{ background: "#1E293B", borderColor: "#334155" }}>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-cyan-300/70">{title}</h2>
        <div className="space-y-1">{children}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span className="shrink-0 text-white/45">{label}</span>
      <span className="min-w-0 truncate text-right text-white/85">{value}</span>
    </div>
  );
}
