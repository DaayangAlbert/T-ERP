"use client";

import { useState } from "react";
import { User, Edit3, Download, FileText, Shield, Phone, MapPin, Cake, Heart, Building2, CreditCard, X, Save, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useEmpProfile, useEmpDocuments, useEmpPolicies, useRequestProfileModification, type EmpDocument } from "@/hooks/useEmpProfile";
import { useTenant } from "@/hooks/useTenant";
import { AvatarUploader } from "@/components/profile/AvatarUploader";

const MODIFIABLE_FIELDS: { code: string; label: string; type: string }[] = [
  { code: "phoneMobile", label: "Téléphone mobile", type: "tel" },
  { code: "address", label: "Adresse postale", type: "text" },
  { code: "personalEmail", label: "Email personnel", type: "email" },
  { code: "familyStatus", label: "Situation familiale", type: "text" },
  { code: "emergencyContactName", label: "Contact d'urgence — nom", type: "text" },
  { code: "emergencyContactPhone", label: "Contact d'urgence — tél", type: "tel" },
  { code: "bankName", label: "Banque", type: "text" },
  { code: "rib", label: "RIB / IBAN", type: "text" },
];

const DOC_ICON_BY_CAT: Record<EmpDocument["category"], React.ReactNode> = {
  CONTRACT: <FileText className="h-4 w-4 text-primary-600" />,
  ATTESTATION: <FileText className="h-4 w-4 text-blue-600" />,
  CERTIFICATE: <Shield className="h-4 w-4 text-emerald-600" />,
  TRAINING: <Shield className="h-4 w-4 text-amber-600" />,
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function EmpProfilPage() {
  const profile = useEmpProfile();
  const docs = useEmpDocuments();
  const policies = useEmpPolicies();
  const { tenant } = useTenant();
  const [showModify, setShowModify] = useState(false);

  if (profile.isLoading || !profile.data) {
    return (
      <div className="space-y-3 p-3">
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  const emp = profile.data.employee;

  return (
    <div className="space-y-3 pb-20">
      {/* Carte profil */}
      <article className="rounded-xl border border-line bg-white p-4 shadow-card">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <span className="grid h-[72px] w-[72px] flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg">
            {emp.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={emp.avatarUrl} alt={emp.firstName} className="h-[72px] w-[72px] rounded-full object-cover" />
            ) : (
              <User className="h-9 w-9" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-bold text-ink sm:text-xl">
              {emp.firstName} {emp.lastName}
            </h1>
            <p className="text-[12.5px] text-ink-3">
              {emp.position ?? "—"}
              {emp.assignedSite && <> · {emp.assignedSite.name}</>}
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              Matricule <span className="font-mono font-semibold text-ink">{emp.matricule ?? "—"}</span>
              {emp.seniorityYears !== null && (
                <> · ancienneté {emp.seniorityYears} an{emp.seniorityYears > 1 ? "s" : ""}</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModify(true)}
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-semibold text-white hover:bg-primary-600"
          >
            <Edit3 className="h-3.5 w-3.5" /> Demander modification
          </button>
        </div>
      </article>

      {/* Photo de profil — modifiable directement par le salarié */}
      <AvatarUploader compact />

      {/* Informations personnelles */}
      <section className="rounded-xl border border-line bg-white p-3">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Mes informations personnelles</h2>
        <ul className="divide-y divide-line">
          <InfoRow icon={<Cake className="h-3.5 w-3.5" />} label="Date de naissance" value={fmtDate(emp.dateOfBirth)} />
          <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="N° CNI" value={emp.cniNumber ?? "—"} mono />
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Téléphone" value={emp.phoneMobile ?? "—"} />
          <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Email pro" value={emp.email} />
          <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Adresse" value={emp.address ?? "—"} />
          <InfoRow icon={<Heart className="h-3.5 w-3.5" />} label="Situation familiale" value={emp.familyStatus ?? "—"} />
          <InfoRow
            icon={<Phone className="h-3.5 w-3.5" />}
            label="Contact urgence"
            value={emp.emergencyContactName ? `${emp.emergencyContactName} · ${emp.emergencyContactPhone ?? ""}` : "—"}
          />
        </ul>
      </section>

      {/* Informations professionnelles */}
      <section className="rounded-xl border border-line bg-white p-3">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Mes informations professionnelles</h2>
        <ul className="divide-y divide-line">
          <InfoRow icon={<Shield className="h-3.5 w-3.5" />} label="N° CNPS" value={emp.cnpsNumber ?? "—"} mono />
          <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="NIU DGI" value={emp.niu ?? "—"} mono />
          <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Banque" value={emp.bankName ? `${emp.bankName}${emp.bankAgency ? " · " + emp.bankAgency : ""}` : "—"} />
          <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="RIB" value={emp.rib ?? "—"} mono />
          <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Catégorie pro" value={emp.professionalCategory ?? emp.category ?? "—"} />
          <InfoRow
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Type contrat"
            value={`${emp.contractType ?? "—"}${emp.hireDate ? " depuis " + fmtDate(emp.hireDate) : ""}`}
          />
        </ul>
      </section>

      {/* Mes documents */}
      <section className="rounded-xl border border-line bg-white p-3" id="documents">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Mes documents</h2>
        {docs.isLoading || !docs.data ? (
          <div className="h-24 animate-pulse rounded-md bg-surface-alt" />
        ) : (
          <ul className="space-y-1.5">
            {docs.data.items.map((d) => (
              <DocItem key={d.id} doc={d} />
            ))}
          </ul>
        )}
      </section>

      {/* Politiques RH */}
      <section className="rounded-xl border border-line bg-white p-3">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Politiques RH{tenant?.name ? ` ${tenant.name}` : ""}</h2>
        {policies.isLoading || !policies.data ? (
          <div className="h-20 animate-pulse rounded-md bg-surface-alt" />
        ) : (
          <ul className="space-y-1.5">
            {policies.data.items.map((p) => (
              <li key={p.id} className="flex min-h-[68px] items-center gap-2.5 rounded-md border border-line bg-white p-2.5">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">{p.title}</div>
                  <div className="text-[11px] text-ink-3">v{p.version} · publié {fmtDate(p.publishedAt)}</div>
                </div>
                {p.acknowledgmentRequired && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">Lecture requise</span>
                )}
                <button type="button" className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-md border border-line hover:bg-surface-alt">
                  <Download className="h-3.5 w-3.5 text-ink-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showModify && <ModifyDialog onClose={() => setShowModify(false)} />}
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-wide text-ink-3">
        {icon} <span>{label}</span>
      </div>
      <span className={clsx("text-right text-[12.5px] text-ink", mono && "font-mono")}>{value}</span>
    </li>
  );
}

function DocItem({ doc }: { doc: EmpDocument }) {
  const statusColor =
    doc.status === "EXPIRED"
      ? "bg-rose-100 text-rose-800"
      : doc.status === "EXPIRING_SOON"
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-800";
  const statusLabel = doc.status === "EXPIRED" ? "Expiré" : doc.status === "EXPIRING_SOON" ? "Expire bientôt" : "Valide";

  return (
    <li className="flex min-h-[68px] items-center gap-2.5 rounded-md border border-line bg-white p-2.5">
      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded bg-surface-alt">
        {DOC_ICON_BY_CAT[doc.category]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-ink">{doc.title}</div>
        <div className="text-[11px] text-ink-3">
          Émis {fmtDate(doc.issuedAt)}
          {doc.expiresAt && <> · expire {fmtDate(doc.expiresAt)}</>}
        </div>
      </div>
      {doc.status !== "VALID" && (
        <span className={clsx("flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold", statusColor)}>{statusLabel}</span>
      )}
      <a
        href={doc.downloadUrl}
        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-md border border-line hover:bg-surface-alt"
      >
        <Download className="h-3.5 w-3.5 text-ink-3" />
      </a>
    </li>
  );
}

function ModifyDialog({ onClose }: { onClose: () => void }) {
  const [field, setField] = useState("phoneMobile");
  const [newValue, setNewValue] = useState("");
  const [justification, setJustification] = useState("");
  const request = useRequestProfileModification();
  const cur = MODIFIABLE_FIELDS.find((f) => f.code === field);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Demande de modification</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded text-ink-3 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-2.5">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-[11.5px] text-blue-900">
            <AlertTriangle className="mr-1 inline h-3 w-3" /> Modifications validées par la RH. Délai estimé : 2 jours ouvrés.
          </div>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Champ à modifier</div>
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]"
            >
              {MODIFIABLE_FIELDS.map((f) => (
                <option key={f.code} value={f.code}>{f.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Nouvelle valeur</div>
            <input
              type={cur?.type ?? "text"}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]"
            />
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Justification</div>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-[13px]"
              placeholder="Ex. Changement de banque suite à fermeture compte UBA"
            />
          </label>
          {request.isError && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {(request.error as Error).message}
            </div>
          )}
          {request.isSuccess ? (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-[12.5px] font-semibold text-emerald-800">
              ✓ Demande envoyée à la RH — vous serez notifié·e
            </div>
          ) : (
            <button
              type="button"
              disabled={request.isPending || !newValue.trim() || justification.trim().length < 5}
              onClick={() => request.mutate({ field, newValue, justification })}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-primary-500 px-3 text-[14px] font-bold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {request.isPending ? "Envoi..." : "Envoyer à la RH"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
