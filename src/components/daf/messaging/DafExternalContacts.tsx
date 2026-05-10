"use client";

import { useState } from "react";
import { ExternalLink, Briefcase, Scale, ScrollText, Building2, Users2, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

interface ExternalContact {
  category: "EXPERT" | "AUDIT" | "LAW" | "DGI" | "CNPS";
  name: string;
  org: string;
  position?: string;
  email?: string;
  phone?: string;
}

const ICON_BY_CAT = {
  EXPERT: { Icon: Briefcase, label: "Cabinet expert-comptable", color: "bg-primary-100 text-primary-700" },
  AUDIT: { Icon: Scale, label: "Cabinet CAC", color: "bg-amber-100 text-amber-800" },
  LAW: { Icon: ScrollText, label: "Avocat fiscaliste", color: "bg-rose-100 text-rose-800" },
  DGI: { Icon: Building2, label: "Inspecteur DGI", color: "bg-blue-100 text-blue-800" },
  CNPS: { Icon: Users2, label: "Inspecteur CNPS", color: "bg-emerald-100 text-emerald-800" },
} as const;

const CONTACTS: ExternalContact[] = [
  { category: "EXPERT", name: "Cabinet ECF Cameroun", org: "Expert-comptable agréé OHADA", position: "Mme TCHAMBA — associée principale", email: "tchamba@ecf.cm", phone: "+237 6 99 12 34 56" },
  { category: "AUDIT", name: "Cabinet PwC Cameroun", org: "Commissaire aux comptes (mandat 2024-2026)", position: "M. NKOLO — associé audit", email: "associate.audit@pwc.cm", phone: "+237 6 75 11 88 90" },
  { category: "LAW", name: "Maître TCHOUA Joseph", org: "Avocat fiscaliste — Barreau Yaoundé", position: "Conseil habituel sur contentieux fiscal", email: "tchoua@avocats-yaounde.cm", phone: "+237 6 95 03 41 27" },
  { category: "DGI", name: "M. ATEBA Ferdinand", org: "Direction Générale des Impôts — Centre", position: "Inspecteur référent dossier", email: "fa.ateba@impots.gov.cm", phone: "+237 6 79 88 22 11" },
  { category: "CNPS", name: "Mme BIYELE Solange", org: "Centre Prévoyance Sociale", position: "Référente entreprise", email: "biyele.cnps@gov.cm", phone: "+237 6 77 45 90 88" },
];

export function DafExternalContactsCompact() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mb-3 rounded-lg border border-line bg-white p-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3 hover:text-ink"
      >
        <ExternalLink className="h-3 w-3" /> Contacts externes DAF
        <ChevronDown className={clsx("ml-auto h-3 w-3 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <ul className="mt-1 space-y-1">
          {CONTACTS.map((c) => {
            const meta = ICON_BY_CAT[c.category];
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
