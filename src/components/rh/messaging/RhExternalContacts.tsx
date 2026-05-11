"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Stethoscope, ShieldCheck, Scale, Heart, Briefcase } from "lucide-react";
import { clsx } from "clsx";

interface ExternalContact {
  category: "MEDICAL" | "CNPS" | "LABOR" | "MUTUAL" | "RECRUITMENT";
  name: string;
  org: string;
  position?: string;
  email?: string;
  phone?: string;
}

const ICONS = {
  MEDICAL: { Icon: Stethoscope, color: "bg-emerald-100 text-emerald-700" },
  CNPS: { Icon: ShieldCheck, color: "bg-blue-100 text-blue-700" },
  LABOR: { Icon: Scale, color: "bg-amber-100 text-amber-700" },
  MUTUAL: { Icon: Heart, color: "bg-rose-100 text-rose-700" },
  RECRUITMENT: { Icon: Briefcase, color: "bg-primary-100 text-primary-700" },
} as const;

const CONTACTS: ExternalContact[] = [
  { category: "MEDICAL", name: "Dr. NGOUFO Pierre", org: "Médecin du travail BatimCAM", position: "Référent visites médicales", email: "ngoufo.medtravail@batimcam.cm", phone: "+237 6 77 12 88 90" },
  { category: "CNPS", name: "Mme BIYELE Solange", org: "Centre Prévoyance Sociale", position: "Référente entreprise", email: "biyele.cnps@gov.cm", phone: "+237 6 77 45 90 88" },
  { category: "LABOR", name: "M. NDONGO Achille", org: "Inspection du travail — Centre", position: "Inspecteur référent dossier", email: "andongo.inspection@mintss.gov.cm", phone: "+237 6 99 23 14 88" },
  { category: "MUTUAL", name: "Mme MBELI Christine", org: "Activa Mutuelle Santé", position: "Gestionnaire compte entreprise", email: "mbeli.c@activa.cm", phone: "+237 6 88 12 45 30" },
  { category: "RECRUITMENT", name: "Cabinet RMO Cameroun", org: "Cabinet de recrutement partenaire", position: "Mme TCHATCHOUA — consultante", email: "tchatchoua@rmo.cm", phone: "+237 6 95 02 18 45" },
];

export function RhExternalContactsCompact() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mb-3 rounded-lg border border-line bg-white p-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3 hover:text-ink"
      >
        <ExternalLink className="h-3 w-3" /> Contacts externes RH
        <ChevronDown className={clsx("ml-auto h-3 w-3 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <ul className="mt-1 space-y-1">
          {CONTACTS.map((c) => {
            const meta = ICONS[c.category];
            const Icon = meta.Icon;
            return (
              <li key={c.name} className="rounded-md p-2 hover:bg-surface-alt">
                <div className="flex items-start gap-2">
                  <span className={clsx("grid h-7 w-7 flex-shrink-0 place-items-center rounded-md", meta.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-ink">{c.name}</div>
                    <div className="text-[10.5px] text-ink-3">{c.org}</div>
                    {c.position && <div className="text-[10px] italic text-ink-3">{c.position}</div>}
                    {(c.email || c.phone) && (
                      <div className="mt-0.5 space-x-2 text-[10px] text-primary-700">
                        {c.email && <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>}
                        {c.phone && <span className="text-ink-3">· {c.phone}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
