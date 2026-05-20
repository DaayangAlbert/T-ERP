"use client";

import { Briefcase, Mail, Phone } from "lucide-react";
import { useLawyers } from "@/hooks/useSgLegalCases";

function fmtFcfa(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  if (n >= 1_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k`;
  return n.toString();
}

export function LawyersDirectory() {
  const { data, isLoading } = useLawyers();

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-violet-600" />
          <h2 className="text-[13.5px] font-semibold text-ink">
            Avocats partenaires ({data?.items.length ?? "…"})
          </h2>
        </div>
      </header>

      {isLoading ? (
        <div className="px-4 py-6 text-center text-[12px] text-ink-3">Chargement…</div>
      ) : !data || data.items.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-ink-3/40" />
          <p className="mt-2 text-[12.5px] text-ink-3">Aucun avocat enregistré.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {data.items.map((l) => {
            const email = (l.contactInfo as any)?.email as string | undefined;
            const phone = (l.contactInfo as any)?.phone as string | undefined;
            return (
              <li key={`${l.lawyerName}__${l.lawFirm}`} className="px-4 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-ink">{l.lawyerName}</div>
                    <div className="truncate text-[11px] text-ink-3">{l.lawFirm}</div>
                    {(email || phone) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-3">
                        {email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {email}
                          </span>
                        )}
                        {phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-[10.5px]">
                    <div className="rounded bg-violet-100 px-1.5 py-0.5 font-semibold text-violet-700">
                      {l.activeCases} actif{l.activeCases > 1 ? "s" : ""}
                    </div>
                    <div className="mt-0.5 text-ink-3">{l.totalCases} total</div>
                    <div className="mt-0.5 font-mono text-ink-3">{fmtFcfa(l.totalAtStake)} F</div>
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
