"use client";

import { useState } from "react";
import { Building2, IdCard, Mail, Phone, X, Briefcase, FileText, Activity, Banknote } from "lucide-react";
import { clsx } from "clsx";
import { usePersonnelFiche } from "@/hooks/useRhPersonnel";

interface Props {
  id: string;
  onClose: () => void;
}

type Tab = "identity" | "pro" | "documents" | "pay" | "activity";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "identity", label: "Identité", icon: <IdCard className="h-3.5 w-3.5" /> },
  { key: "pro", label: "Pro", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: "documents", label: "Documents", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "pay", label: "Paie", icon: <Banknote className="h-3.5 w-3.5" /> },
  { key: "activity", label: "Activité", icon: <Activity className="h-3.5 w-3.5" /> },
];

function initials(first: string, last: string): string {
  return `${first[0] ?? "?"}${last[0] ?? "?"}`.toUpperCase();
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const FAMILY_LABEL: Record<string, string> = {
  SINGLE: "Célibataire",
  MARRIED: "Marié(e)",
  WIDOWED: "Veuf/veuve",
  DIVORCED: "Divorcé(e)",
  FREE_UNION: "Union libre",
};

export function EmployeeFiche({ id, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("identity");
  const { data, isLoading } = usePersonnelFiche(id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-3 py-2">
          <h3 className="text-[13px] font-semibold text-ink">Fiche employé</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {isLoading || !data ? (
          <div className="space-y-2 p-3">
            <div className="h-24 animate-pulse rounded-md bg-surface-alt" />
            <div className="h-32 animate-pulse rounded-md bg-surface-alt" />
          </div>
        ) : (
          <>
            <div className="p-3">
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt p-3">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-primary-500 text-[14px] font-bold text-white">
                  {initials(data.firstName, data.lastName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10.5px] text-ink-3">{data.matricule}</div>
                  <div className="text-[15px] font-bold text-ink">
                    {data.firstName} {data.lastName}
                  </div>
                  <div className="text-[12px] text-ink-3">{data.position}</div>
                </div>
                {data.isSynthetic && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    Démo
                  </span>
                )}
              </div>
            </div>

            <div className="px-3">
              <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-line">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={clsx(
                      "relative inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-[12px] font-medium",
                      tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
                    )}
                  >
                    {t.icon}
                    {t.label}
                    {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-3">
              {tab === "identity" && (
                <>
                  <Section title="Coordonnées">
                    <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={data.email} mono />
                    <Row icon={<Phone className="h-3.5 w-3.5" />} label="Téléphone" value={data.phone ?? "—"} mono />
                    <Row icon={<IdCard className="h-3.5 w-3.5" />} label="N° CNI" value={data.profile?.identityCard ?? "—"} mono />
                  </Section>
                  <Section title="Situation familiale">
                    <Row label="Statut familial" value={FAMILY_LABEL[data.profile?.familyStatus ?? ""] ?? "—"} />
                    <Row label="Nombre d'enfants" value={String(data.profile?.childrenCount ?? 0)} />
                  </Section>
                  <Section title="Adresse">
                    <Row label="Ville" value={data.profile?.address?.city ?? "—"} />
                    <Row label="Quartier" value={data.profile?.address?.neighborhood ?? "—"} />
                  </Section>
                  <Section title="Contact d'urgence">
                    <Row label="Nom" value={data.profile?.emergencyContact?.name ?? "—"} />
                    <Row label="Téléphone" value={data.profile?.emergencyContact?.phone ?? "—"} mono />
                    <Row label="Lien" value={data.profile?.emergencyContact?.relation ?? "—"} />
                  </Section>
                </>
              )}
              {tab === "pro" && (
                <Section title="Informations professionnelles">
                  <Row icon={<Briefcase className="h-3.5 w-3.5" />} label="Poste" value={data.position} />
                  <Row label="Catégorie" value={data.category} />
                  <Row label="Type de contrat" value={data.contractType} />
                  <Row icon={<Building2 className="h-3.5 w-3.5" />} label="Affectation" value={data.site} />
                  <Row label="Région" value={data.region ?? "—"} />
                  <Row label="Date d'embauche" value={fmtDate(data.hireDate)} />
                  <Row label="N° CNPS" value={data.cnpsNumber ?? "—"} mono />
                </Section>
              )}
              {tab === "documents" && (
                <Section title={`Documents (${data.documents.length})`}>
                  {data.documents.length === 0 ? (
                    <p className="text-[12px] text-ink-3">Aucun document enregistré pour cet employé.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {data.documents.map((d) => (
                        <li key={d.id} className="flex items-center gap-2 rounded-md border border-line bg-white p-2">
                          <FileText className="h-4 w-4 text-primary-600" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-medium text-ink truncate">{d.title}</div>
                            <div className="text-[10.5px] text-ink-3">{d.type} · {fmtDate(d.uploadedAt)}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              )}
              {tab === "pay" && (
                <Section title="Coordonnées bancaires">
                  <Row icon={<Banknote className="h-3.5 w-3.5" />} label="Banque" value={data.profile?.bankAccount?.bank ?? "—"} />
                  <Row label="IBAN" value={data.profile?.bankAccount?.iban ?? "—"} mono />
                  <Row label="SWIFT/BIC" value={data.profile?.bankAccount?.swift ?? "—"} mono />
                </Section>
              )}
              {tab === "activity" && (
                <Section title="Historique d'activité">
                  <p className="text-[12px] text-ink-3">
                    Module activité (audits, modifications, accès) à venir dans une prochaine itération.
                  </p>
                </Section>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{title}</h4>
      <div className="rounded-md border border-line bg-white p-2.5 space-y-1">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <span className="mt-0.5 inline-flex w-32 flex-shrink-0 items-center gap-1 text-ink-3">
        {icon}
        {label}
      </span>
      <span className={clsx("min-w-0 flex-1 break-words text-ink", mono && "font-mono text-[11.5px]")}>{value}</span>
    </div>
  );
}
