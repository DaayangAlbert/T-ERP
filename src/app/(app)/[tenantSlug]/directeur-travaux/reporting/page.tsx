"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Send, CheckCircle2 } from "lucide-react";
import { useChantier } from "@/contexts/ChantierContext";

interface MoaReport {
  id: string;
  reportType: string;
  period: string | null;
  pdfUrl: string | null;
  sentTo: string[];
  sentAt: string | null;
  acknowledgedAt: string | null;
  author: { firstName: string; lastName: string };
  createdAt: string;
}

const TEMPLATES: Array<{ type: string; label: string; desc: string }> = [
  { type: "WEEKLY_PROGRESS", label: "Reporting hebdo chantier", desc: "Vendredi 18h auto-généré · avancement + photos + écarts" },
  { type: "MONTHLY_PROGRESS", label: "CR mensuel avancement", desc: "Émis avec la situation de travaux" },
  { type: "SITE_MEETING_MINUTES", label: "CR réunion chantier", desc: "Réunion MOA hebdomadaire" },
  { type: "HSE_INCIDENT", label: "Rapport incident HSE", desc: "À transmettre MOA + CHSCT" },
  { type: "MOA_NOTICE", label: "Note de service MOA", desc: "Information formelle MOA" },
];

export default function ReportingMoaPage() {
  const { activeChantierId, activeChantier } = useChantier();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "moa-reports", activeChantierId],
    enabled: !!activeChantierId,
    queryFn: async () => {
      const res = await fetch(`/api/dtrav/sites/${activeChantierId}/moa-reports`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: MoaReport[] }>;
    },
  });

  const generate = useMutation({
    mutationFn: async (reportType: string) => {
      const res = await fetch(`/api/dtrav/sites/${activeChantierId}/moa-reports`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dtrav", "moa-reports"] }),
  });

  return (
    <div id="screen-dtrav-reporting" className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Reporting MOA</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {activeChantier?.code} · {activeChantier?.client} — rapports périodiques au maître d&apos;ouvrage.
        </p>
      </header>

      <section
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        {TEMPLATES.map((t) => (
          <article key={t.type} className="flex flex-col rounded-xl border border-line bg-white p-3 shadow-card">
            <FileText className="h-4 w-4 text-primary-600" />
            <h3 className="mt-2 text-[13.5px] font-semibold text-ink">{t.label}</h3>
            <p className="mt-1 flex-1 text-[11.5px] text-ink-3">{t.desc}</p>
            <button
              type="button"
              onClick={() => generate.mutate(t.type)}
              disabled={generate.isPending}
              style={{ minHeight: 40 }}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white disabled:opacity-50"
            >
              Générer
            </button>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Rapports MOA récents
        </h2>
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">
            Aucun rapport généré pour ce chantier.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.items.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-[12.5px]">
                <div>
                  <div className="font-medium text-ink">
                    {TEMPLATES.find((t) => t.type === r.reportType)?.label ?? r.reportType}
                  </div>
                  <div className="text-[11.5px] text-ink-3">
                    {r.period ?? "—"} · {r.author.firstName} {r.author.lastName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.acknowledgedAt && (
                    <span className="inline-flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-[11px] text-success">
                      <CheckCircle2 className="h-3 w-3" /> Reçu MOA
                    </span>
                  )}
                  {r.sentAt && !r.acknowledgedAt && (
                    <span className="inline-flex items-center gap-1 rounded bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700">
                      <Send className="h-3 w-3" /> Envoyé
                    </span>
                  )}
                  {r.pdfUrl && (
                    <a
                      href={r.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ minHeight: 36 }}
                      className="inline-flex items-center rounded-md border border-line px-2 text-[11.5px] font-medium text-ink-2"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
