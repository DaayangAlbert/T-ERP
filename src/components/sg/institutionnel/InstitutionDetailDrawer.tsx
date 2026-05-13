"use client";

import { useEffect, useState } from "react";
import { X, Phone, Mail, Globe, MapPin, Save, FileText, Gavel, Mail as MailIcon } from "lucide-react";
import { clsx } from "clsx";
import type { RelationshipStatus } from "@prisma/client";
import { useInstitutionDetail, useUpdateInstitution } from "@/hooks/useSgInstitutions";

interface Props {
  institutionId: string | null;
  readOnly: boolean;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  WATCH: "bg-violet-100 text-violet-700",
  SENSITIVE: "bg-amber-100 text-amber-700",
  INACTIVE: "bg-slate-200 text-slate-700",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  WATCH: "À surveiller",
  SENSITIVE: "Sensible",
  INACTIVE: "Inactif",
};

const TYPE_LABEL: Record<string, string> = {
  MINISTRY: "Ministère",
  MUNICIPALITY: "Commune",
  PUBLIC_INSTITUTION: "Institution publique",
  PROFESSIONAL_ASSOCIATION: "Association professionnelle",
  LAW_FIRM: "Cabinet juridique",
  AUDIT_FIRM: "Cabinet d'audit",
  BANK: "Banque",
  OTHER: "Autre",
};

const CATEGORY_LABEL: Record<string, string> = {
  CLIENT: "Client",
  REGULATORY: "Régulateur",
  ASSOCIATION: "Association",
  SUPPLIER: "Fournisseur",
  PARTNER: "Partenaire",
};

function fmtFcfa(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  return n.toLocaleString("fr-FR");
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function InstitutionDetailDrawer({ institutionId, readOnly, onClose }: Props) {
  const { data, isLoading } = useInstitutionDetail(institutionId);
  const update = useUpdateInstitution(institutionId ?? "");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState<RelationshipStatus>("ACTIVE");
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setContactName(data.primaryContactName ?? "");
      setContactRole(data.primaryContactRole ?? "");
      setContactPhone(data.primaryContactPhone ?? "");
      setContactEmail(data.primaryContactEmail ?? "");
      setStatus(data.relationshipStatus);
      setNotes(data.relationshipNotes ?? "");
      setDirty(false);
    }
  }, [data]);

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  async function save() {
    await update.mutateAsync({
      primaryContactName: contactName,
      primaryContactRole: contactRole,
      primaryContactPhone: contactPhone,
      primaryContactEmail: contactEmail,
      relationshipStatus: status,
      relationshipNotes: notes,
    });
    setDirty(false);
  }

  if (!institutionId) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="flex w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {data ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-violet-700">
                    {TYPE_LABEL[data.type]}
                  </span>
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
                    {CATEGORY_LABEL[data.category]}
                  </span>
                  <span className={clsx("rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_BADGE[data.relationshipStatus])}>
                    {STATUS_LABEL[data.relationshipStatus]}
                  </span>
                </div>
                <h2 className="mt-1 text-[14px] font-bold text-ink">{data.name}</h2>
              </>
            ) : (
              <h2 className="text-[14px] font-bold text-ink">Chargement…</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading || !data ? (
            <div className="space-y-2">
              <div className="h-24 animate-pulse rounded-lg bg-surface-alt" />
              <div className="h-32 animate-pulse rounded-lg bg-surface-alt" />
            </div>
          ) : (
            <div className="space-y-3">
              <section className="rounded-lg border border-line bg-white p-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Contact principal
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Nom">
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => markDirty(setContactName)(e.target.value)}
                      disabled={readOnly}
                      className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400 disabled:bg-surface-alt"
                    />
                  </Field>
                  <Field label="Fonction">
                    <input
                      type="text"
                      value={contactRole}
                      onChange={(e) => markDirty(setContactRole)(e.target.value)}
                      disabled={readOnly}
                      className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400 disabled:bg-surface-alt"
                    />
                  </Field>
                  <Field label="Téléphone" icon={Phone}>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => markDirty(setContactPhone)(e.target.value)}
                      disabled={readOnly}
                      className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400 disabled:bg-surface-alt"
                    />
                  </Field>
                  <Field label="Email" icon={Mail}>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => markDirty(setContactEmail)(e.target.value)}
                      disabled={readOnly}
                      className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400 disabled:bg-surface-alt"
                    />
                  </Field>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
                  {data.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {data.address}
                    </span>
                  )}
                  {data.website && (
                    <a
                      href={data.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-violet-700 hover:underline"
                    >
                      <Globe className="h-3 w-3" /> {data.website}
                    </a>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-line bg-white p-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Relation</h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr]">
                  <Field label="Statut">
                    <select
                      value={status}
                      onChange={(e) => markDirty(setStatus)(e.target.value as RelationshipStatus)}
                      disabled={readOnly}
                      className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400 disabled:bg-surface-alt"
                    >
                      {(["ACTIVE", "WATCH", "SENSITIVE", "INACTIVE"] as const).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Notes confidentielles SG">
                    <textarea
                      value={notes}
                      onChange={(e) => markDirty(setNotes)(e.target.value)}
                      disabled={readOnly}
                      rows={3}
                      placeholder="Contexte politique, attentes, leviers, prudence…"
                      className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400 disabled:bg-surface-alt"
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-lg border border-line bg-white">
                <header className="border-b border-line px-3 py-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    Historique des relations
                  </h3>
                </header>
                <div className="space-y-2 p-3 text-[12px]">
                  <HistoryGroup
                    icon={FileText}
                    label="Marchés"
                    empty="Aucun marché associé."
                    items={data.history.contracts.map((c) => ({
                      key: c.id,
                      title: c.title,
                      ref: c.reference,
                      meta: `${fmtFcfa(c.amountHT)} F · ${c.phase}`,
                      date: c.signatureDate ? fmtDate(c.signatureDate) : "—",
                    }))}
                  />
                  <HistoryGroup
                    icon={Gavel}
                    label="Contentieux"
                    empty="Aucun contentieux associé."
                    items={data.history.cases.map((c) => ({
                      key: c.id,
                      title: c.title,
                      ref: c.reference,
                      meta: `${c.status} · ${fmtFcfa(c.amountAtStake)} F`,
                      date: "",
                    }))}
                  />
                  <HistoryGroup
                    icon={MailIcon}
                    label="Courriers"
                    empty="Aucun courrier indexé."
                    items={data.history.correspondences.map((c) => ({
                      key: c.id,
                      title: c.subject,
                      ref: c.reference,
                      meta: `${c.direction === "INCOMING" ? "Entrant" : "Sortant"} · ${c.status}`,
                      date: fmtDate(c.date),
                    }))}
                  />
                </div>
              </section>

              {update.isError && (
                <p className="text-[11.5px] text-rose-600">{(update.error as Error)?.message ?? "Erreur"}</p>
              )}
            </div>
          )}
        </div>

        {data && !readOnly && (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || update.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Phone; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-ink-3">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function HistoryGroup({
  icon: Icon,
  label,
  items,
  empty,
}: {
  icon: typeof FileText;
  label: string;
  items: { key: string; title: string; ref: string; meta: string; date: string }[];
  empty: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface-alt/30 p-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-3">
        <Icon className="h-3.5 w-3.5" /> {label} ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="mt-1 text-[10.5px] italic text-ink-3/70">{empty}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((i) => (
            <li key={i.key} className="rounded bg-white px-2 py-1 text-[11px]">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-semibold text-ink">{i.title}</span>
                <span className="font-mono text-[10px] text-ink-3">{i.ref}</span>
              </div>
              <div className="text-[10.5px] text-ink-3">
                {i.meta}
                {i.date && <> · {i.date}</>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
