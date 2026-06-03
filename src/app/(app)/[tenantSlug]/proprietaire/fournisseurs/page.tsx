"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Truck, Star } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useOwnerFournisseurs } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Explain, Loading, ErrorBox } from "@/components/owner/ui";
import { PageHelp } from "@/components/help/PageHelp";
import { PcaFournisseursTutorial } from "@/components/help/tutorials/PcaFournisseursTutorial";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function OwnerFournisseursPage() {
  const { data, isLoading, isError } = useOwnerFournisseurs();
  const [cat, setCat] = useState("");
  const head = <OwnerHeader title="Fournisseurs" subtitle="Tous les fournisseurs et prestataires de l'entreprise." help={<PageHelp title="Aide — Fournisseurs (PCA)"><PcaFournisseursTutorial /></PageHelp>} />;

  const items = useMemo(() => {
    if (!data) return [];
    return cat ? data.items.filter((i) => i.categorie === cat) : data.items;
  }, [data, cat]);

  if (isError) return <div className="space-y-4">{head}<ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4">{head}<Loading /></div>;

  return (
    <div className="space-y-4">
      {head}

      <Section title="Vue d'ensemble" icon={<Truck className="h-4 w-4" />}>
        <Explain>L&apos;ensemble de vos fournisseurs et sous-traitants. « Reste dû » = ce que l&apos;entreprise leur doit encore (factures non payées).</Explain>
        <div className="grid gap-3 sm:grid-cols-3">
          <BigStat label="Fournisseurs" value={`${data.resume.total}`} explain="Nombre total de fournisseurs enregistrés." />
          <BigStat label="Avec une dette" value={`${data.resume.avecDette}`} tone={data.resume.avecDette > 0 ? "warn" : "ok"} explain="Fournisseurs à qui vous devez de l'argent." />
          <BigStat label="Total dû" value={f(data.resume.totalDu)} tone={BigInt(data.resume.totalDu) > 0n ? "bad" : "ok"} explain="Montant total restant à payer aux fournisseurs." />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.categories.map((c) => (
            <button
              key={c.categorie}
              type="button"
              onClick={() => setCat(cat === c.categorie ? "" : c.categorie)}
              className={clsx("rounded-full border px-2.5 py-1 text-[11.5px]", cat === c.categorie ? "border-primary-400 bg-primary-50 text-primary-700" : "border-line text-ink-2 hover:bg-surface-alt")}
            >
              {c.categorie} ({c.nombre})
            </button>
          ))}
        </div>
      </Section>

      <Section title={cat ? `Fournisseurs — ${cat}` : "Tous les fournisseurs"}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[12.5px]">
            <thead className="border-b border-line text-left text-[10.5px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-2 py-2">Fournisseur</th>
                <th className="px-2 py-2">Catégorie</th>
                <th className="px-2 py-2">Ville</th>
                <th className="px-2 py-2">Contact</th>
                <th className="px-2 py-2 text-center">Note</th>
                <th className="px-2 py-2 text-right">Reste dû</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-line">
                  <td className="px-2 py-2 font-medium text-ink">{s.nom}</td>
                  <td className="px-2 py-2 text-ink-2">{s.categorie}</td>
                  <td className="px-2 py-2 text-ink-3">{s.ville ?? "—"}</td>
                  <td className="px-2 py-2 text-ink-3">{s.contact ?? "—"}</td>
                  <td className="px-2 py-2 text-center">
                    {s.note != null ? <span className="inline-flex items-center gap-0.5 text-ink-2"><Star className="h-3 w-3 fill-warning text-warning" /> {s.note}</span> : "—"}
                  </td>
                  <td className={clsx("px-2 py-2 text-right tabular-nums", BigInt(s.duMontant) > 0n ? "font-semibold text-danger" : "text-ink-3")}>
                    {BigInt(s.duMontant) > 0n ? <>{f(s.duMontant)} <span className="text-[10px] text-ink-3">({s.duFactures})</span></> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
