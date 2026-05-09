"use client";

import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { SYSCOHADA_STATES } from "@/lib/syscohada";

interface Props {
  period: string;
}

export function SyscohadaStateCard({ period }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-[12.5px] text-warning">
        ⚠ Documents brouillons. La validation par un expert-comptable agréé OHADA est requise
        avant toute utilisation officielle (DGI, banques, AG).
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SYSCOHADA_STATES.map((s) => (
          <div key={s.key} className="rounded-xl border border-line bg-white p-4 shadow-card">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-100 text-primary-700">
                <FileText className="h-4 w-4" />
              </span>
              <h3 className="text-[13.5px] font-semibold text-ink">{s.label}</h3>
            </div>
            <p className="mb-3 text-[11.5px] text-ink-3">{s.description}</p>
            <div className="flex items-center justify-between">
              <Link
                href={`/api/accounting/syscohada/${s.key}?period=${period}`}
                className="text-[11.5px] text-primary-700 hover:underline"
              >
                Aperçu JSON
              </Link>
              <a
                href={`/api/accounting/syscohada/${s.key}/pdf?period=${period}`}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-primary-500 px-2.5 text-[11.5px] font-medium text-white hover:bg-primary-600"
              >
                <Download className="h-3 w-3" /> PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
