"use client";

import { FileText, Coins, Wrench, Download } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useOwnerRapports, type OwnerRapports } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, Explain, Loading, ErrorBox } from "@/components/owner/ui";

type Report = OwnerRapports["conseil"][number];

export default function OwnerRapportsPage() {
  const { data, isLoading, isError } = useOwnerRapports();
  const head = <OwnerHeader title="Rapports reçus" subtitle="Les rapports que la direction vous transmet : conseil, financier, technique." />;

  if (isError) return <div className="space-y-4">{head}<ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4">{head}<Loading /></div>;

  return (
    <div className="space-y-4">
      {head}

      <Section title="Rapports du Directeur Général (conseil)" icon={<FileText className="h-4 w-4" />}>
        <Explain>Les rapports de synthèse que le DG prépare et publie pour le conseil d&apos;administration.</Explain>
        <ReportList items={data.conseil} empty="Aucun rapport du DG publié pour l'instant." />
      </Section>

      <Section title="Rapports financiers" icon={<Coins className="h-4 w-4" />}>
        <Explain>Les rapports financiers mensuels validés par la Direction Financière.</Explain>
        <ReportList items={data.financier} empty="Aucun rapport financier disponible." />
      </Section>

      <Section title="Rapports techniques" icon={<Wrench className="h-4 w-4" />}>
        <Explain>Les rapports techniques mensuels de la Direction Technique (avancement, qualité, sécurité des chantiers).</Explain>
        <ReportList items={data.technique} empty="Aucun rapport technique disponible." />
      </Section>
    </div>
  );
}

function ReportList({ items, empty }: { items: Report[]; empty: string }) {
  if (items.length === 0) return <p className="py-3 text-center text-[12.5px] text-ink-3">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-ink">{r.titre}</div>
            <div className="text-[11.5px] text-ink-3">Par {r.auteur} · {formatDate(r.date)}</div>
          </div>
          {r.pdfUrl ? (
            <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:border-primary-300 hover:text-primary-700">
              <Download className="h-3.5 w-3.5" /> Ouvrir le PDF
            </a>
          ) : (
            <span className="text-[11px] text-ink-3">PDF non disponible</span>
          )}
        </li>
      ))}
    </ul>
  );
}
