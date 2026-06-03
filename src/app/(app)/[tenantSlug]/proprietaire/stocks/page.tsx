"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Package, AlertTriangle } from "lucide-react";
import { formatFCFA, formatNumber } from "@/lib/format";
import { useOwnerStocks } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Explain, Loading, ErrorBox } from "@/components/owner/ui";
import { PageHelp } from "@/components/help/PageHelp";
import { PcaStocksTutorial } from "@/components/help/tutorials/PcaStocksTutorial";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function OwnerStocksPage() {
  const { data, isLoading, isError } = useOwnerStocks();
  const [selected, setSelected] = useState<string>("");
  const head = <OwnerHeader title="Stocks" subtitle="Ce que vous avez réellement en magasin, magasin par magasin." help={<PageHelp title="Aide — Stocks (PCA)"><PcaStocksTutorial /></PageHelp>} />;

  if (isError) return <div className="space-y-4">{head}<ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4">{head}<Loading /></div>;

  const current = data.magasins.find((m) => m.id === selected) ?? data.magasins[0] ?? null;

  return (
    <div className="space-y-4">
      {head}

      <Section title="Vue d'ensemble" icon={<Package className="h-4 w-4" />}>
        <Explain>La <strong>valeur du stock</strong> est l&apos;argent immobilisé en matériaux. Une <strong>alerte</strong> = un article sous le seuil minimum (risque de rupture sur chantier).</Explain>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BigStat label="Valeur totale du stock" value={f(data.resume.valeurTotale)} explain="Argent immobilisé en matériaux, tous magasins." />
          <BigStat label="Magasins" value={`${data.resume.nbMagasins}`} explain="Chantiers, directions, central." />
          <BigStat label="Articles en stock" value={formatNumber(data.resume.nbArticles)} explain="Références différentes en stock." />
          <BigStat label="Alertes de rupture" value={`${data.resume.nbAlertes}`} tone={data.resume.nbAlertes > 0 ? "bad" : "ok"} explain={data.resume.nbAlertes > 0 ? "Articles à réapprovisionner." : "Aucune rupture."} />
        </div>
      </Section>

      <Section title="Contenu d'un magasin">
        <Explain>Choisissez un magasin (souvent celui d&apos;un chantier) pour voir <strong>exactement ce qu&apos;il contient</strong> : quantité de chaque article.</Explain>
        <select
          value={current?.id ?? ""}
          onChange={(e) => setSelected(e.target.value)}
          className="mb-3 h-10 w-full rounded-md border border-line bg-white px-3 text-[13px] sm:max-w-md"
        >
          {data.magasins.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom} ({m.type}){m.chantier ? ` — ${m.chantier}` : ""} · {m.nbArticles} article(s)
            </option>
          ))}
        </select>

        {!current ? (
          <p className="py-4 text-center text-[12.5px] text-ink-3">Aucun magasin.</p>
        ) : current.articles.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-ink-3">Ce magasin est vide.</p>
        ) : (
          <>
            <div className="mb-2 text-[12px] text-ink-3">
              Valeur de ce magasin : <strong className="text-ink">{f(current.valeur)}</strong>
              {current.alertes > 0 && <span className="ml-2 text-danger">· {current.alertes} alerte(s)</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-[13px]">
                <thead className="text-left text-[10.5px] uppercase tracking-wider text-ink-3">
                  <tr><th className="px-2 py-1.5">Article</th><th className="px-2 py-1.5 text-right">Quantité</th><th className="px-2 py-1.5 text-right">Valeur</th></tr>
                </thead>
                <tbody>
                  {current.articles.map((a, i) => (
                    <tr key={`${a.article}-${i}`} className="border-t border-line/60">
                      <td className="px-2 py-2 font-medium text-ink">
                        {a.article}
                        {a.low && <span className="ml-2 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">stock bas</span>}
                      </td>
                      <td className={clsx("px-2 py-2 text-right tabular-nums font-semibold", a.low ? "text-danger" : "text-ink")}>
                        {formatNumber(a.quantite)} {a.unite}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-ink-3">{f(a.valeur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      <Section title="À réapprovisionner (tous magasins)" icon={<AlertTriangle className="h-4 w-4" />}>
        <Explain>Les articles sous le seuil minimum, à commander en priorité pour ne pas bloquer les chantiers.</Explain>
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
