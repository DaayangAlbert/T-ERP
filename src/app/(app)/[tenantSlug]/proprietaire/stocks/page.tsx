"use client";

import { Package, AlertTriangle } from "lucide-react";
import { formatFCFA, formatNumber } from "@/lib/format";
import { useOwnerStocks } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Row, Explain, Loading, ErrorBox } from "@/components/owner/ui";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function OwnerStocksPage() {
  const { data, isLoading, isError } = useOwnerStocks();
  const head = <OwnerHeader title="Stocks" subtitle="Ce que valent vos magasins et ce qui manque, expliqué." />;

  if (isError) return <div className="space-y-4">{head}<ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4">{head}<Loading /></div>;

  return (
    <div className="space-y-4">
      {head}

      <Section title="Vue d'ensemble" icon={<Package className="h-4 w-4" />}>
        <Explain>La <strong>valeur du stock</strong> est l&apos;argent immobilisé en matériaux et fournitures dans vos magasins. Une <strong>alerte</strong> signale un article dont la quantité est tombée sous le seuil minimum (risque de rupture sur chantier).</Explain>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BigStat label="Valeur totale du stock" value={f(data.resume.valeurTotale)} explain="Argent immobilisé en matériaux dans tous les magasins." />
          <BigStat label="Magasins" value={`${data.resume.nbMagasins}`} explain="Nombre de magasins (chantiers, directions, central)." />
          <BigStat label="Articles en stock" value={formatNumber(data.resume.nbArticles)} explain="Nombre de références différentes stockées." />
          <BigStat label="Alertes de rupture" value={`${data.resume.nbAlertes}`} tone={data.resume.nbAlertes > 0 ? "bad" : "ok"} explain={data.resume.nbAlertes > 0 ? "Articles à réapprovisionner rapidement." : "Aucun article sous le seuil."} />
        </div>
      </Section>

      <Section title="Par magasin">
        <Explain>Répartition de la valeur du stock et des alertes entre vos magasins.</Explain>
        {data.magasins.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-ink-3">Aucun magasin.</p>
        ) : (
          data.magasins.map((m) => (
            <Row
              key={m.nom}
              label={`${m.nom} (${m.type})${m.chantier ? ` — ${m.chantier}` : ""} · ${m.nbArticles} article(s)`}
              value={f(m.valeur)}
              tone={m.alertes > 0 ? "warn" : "neutral"}
              explain={m.alertes > 0 ? `${m.alertes} article(s) en alerte de rupture.` : undefined}
            />
          ))
        )}
      </Section>

      <Section title="À réapprovisionner" icon={<AlertTriangle className="h-4 w-4" />}>
        <Explain>Les articles dont la quantité est sous le seuil minimum. À commander en priorité pour ne pas bloquer les chantiers.</Explain>
        {data.ruptures.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-success">✓ Aucun article en rupture.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[12.5px]">
              <thead className="text-left text-[10.5px] uppercase tracking-wider text-ink-3">
                <tr><th className="px-2 py-1">Article</th><th className="px-2 py-1">Magasin</th><th className="px-2 py-1 text-right">En stock</th><th className="px-2 py-1 text-right">Seuil mini</th></tr>
              </thead>
              <tbody>
                {data.ruptures.map((r, idx) => (
                  <tr key={`${r.article}-${idx}`} className="border-t border-line/60">
                    <td className="px-2 py-1.5 font-medium text-ink">{r.article}</td>
                    <td className="px-2 py-1.5 text-ink-3">{r.magasin}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-danger">{formatNumber(r.quantite)} {r.unite}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-ink-3">{formatNumber(r.seuil)} {r.unite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
