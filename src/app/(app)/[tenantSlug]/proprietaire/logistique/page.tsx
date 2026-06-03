"use client";

import { useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useOwnerLogistique } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Explain, Pill, Loading, ErrorBox } from "@/components/owner/ui";
import { PageHelp } from "@/components/help/PageHelp";
import { PcaLogistiqueTutorial } from "@/components/help/tutorials/PcaLogistiqueTutorial";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function OwnerLogistiquePage() {
  const { data, isLoading, isError } = useOwnerLogistique();
  const [chantier, setChantier] = useState<string>("");
  const head = <OwnerHeader title="Logistique & engins" subtitle="Votre parc matériel : qui travaille, qui ne fait rien, qui est loué." help={<PageHelp title="Aide — Logistique (PCA)"><PcaLogistiqueTutorial /></PageHelp>} />;

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!chantier) return data.items;
    if (chantier === "__idle") return data.items.filter((i) => i.statut === "Inactif");
    if (chantier === "__rented") return data.items.filter((i) => i.isRented);
    return data.items.filter((i) => i.chantier === chantier);
  }, [data, chantier]);

  if (isError) return <div className="space-y-4">{head}<ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4">{head}<Loading /></div>;

  return (
    <div className="space-y-4">
      {head}

      <Section title="Vue d'ensemble du parc" icon={<Truck className="h-4 w-4" />}>
        <Explain><strong className="text-success">Au travail</strong> = affecté à un chantier. <strong className="text-danger">Inactif</strong> = vous appartient mais ne produit rien (coût dormant). <strong>Loué</strong> = engin loué à un tiers (coût récurrent). Idéalement, peu d&apos;inactifs et peu de loués si des engins dorment.</Explain>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <BigStat label="Total des engins" value={`${data.resume.total}`} explain="Tout le parc matériel suivi." />
          <BigStat label="Au travail" value={`${data.resume.auTravail}`} tone="ok" explain="Engins affectés à un chantier." />
          <BigStat label="Inactifs" value={`${data.resume.inactifs}`} tone={data.resume.inactifs > 0 ? "bad" : "ok"} explain="Engins qui vous appartiennent mais ne font rien." />
          <BigStat label="En maintenance / panne" value={`${data.resume.enMaintenance}`} tone={data.resume.enMaintenance > 0 ? "warn" : "ok"} explain="Indisponibles temporairement." />
          <BigStat label="Loués à un tiers" value={`${data.resume.loues}`} tone={data.resume.loues > 0 ? "warn" : "neutral"} explain="Engins que vous payez en location." />
          <BigStat label="Valeur du parc" value={f(data.resume.valeurParc)} explain="Valeur actuelle estimée de vos engins." />
        </div>
        {data.resume.inactifs > 0 && data.resume.loues > 0 && (
          <p className="mt-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[12.5px] text-ink-2">
            ⚠️ Vous louez <strong>{data.resume.loues}</strong> engin(s) alors que <strong>{data.resume.inactifs}</strong> des vôtres sont inactifs : il y a peut-être des économies à faire.
          </p>
        )}
      </Section>

      <Section title="Quantités par type d'engin">
        <Explain>Combien vous possédez de chaque type de matériel, et dans quel état (au travail, inactif, loué).</Explain>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead className="border-b border-line text-left text-[10.5px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-2 py-2">Engin</th>
                <th className="px-2 py-2 text-center">Quantité</th>
                <th className="px-2 py-2 text-center">Au travail</th>
                <th className="px-2 py-2 text-center">Inactifs</th>
                <th className="px-2 py-2 text-center">Loués</th>
                <th className="px-2 py-2 text-right">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {data.parModele.map((g) => (
                <tr key={g.nom} className="border-b border-line">
                  <td className="px-2 py-2"><span className="font-medium text-ink">{g.nom}</span> <span className="text-[11px] text-ink-3">· {g.type}</span></td>
                  <td className="px-2 py-2 text-center text-[14px] font-bold tabular-nums text-ink">{g.quantite}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-success">{g.auTravail || "—"}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-danger">{g.inactifs || "—"}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-warning">{g.loues || "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-3">{f(g.valeur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Détail par engin">
        <Explain>Filtrez par chantier pour voir <strong>ce qui y est affecté</strong>, ou isolez les engins inactifs / loués.</Explain>
        <select value={chantier} onChange={(e) => setChantier(e.target.value)} className="mb-3 h-10 w-full rounded-md border border-line bg-white px-3 text-[13px] sm:max-w-md">
          <option value="">Tous les engins ({data.items.length})</option>
          <option value="__idle">Seulement les inactifs ({data.resume.inactifs})</option>
          <option value="__rented">Seulement les loués ({data.resume.loues})</option>
          {data.chantiers.map((c) => <option key={c} value={c}>Chantier : {c}</option>)}
        </select>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[12.5px]">
            <thead className="border-b border-line text-left text-[10.5px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-2 py-2">Engin</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">État</th>
                <th className="px-2 py-2">Chantier / info</th>
                <th className="px-2 py-2 text-right">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-2 py-4 text-center text-ink-3">Aucun engin pour ce filtre.</td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id} className="border-b border-line">
                  <td className="px-2 py-2">
                    <div className="font-medium text-ink">{e.nom}</div>
                    <div className="font-mono text-[11px] text-ink-3">{e.immatriculation}</div>
                  </td>
                  <td className="px-2 py-2 text-ink-2">{e.type}</td>
                  <td className="px-2 py-2">
                    <Pill tone={e.tone}>{e.statut}</Pill>
                    {e.isRented && <span className="ml-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">Loué</span>}
                  </td>
                  <td className="px-2 py-2 text-ink-2">
                    {e.chantier ?? (e.statut === "Inactif"
                      ? <span className="text-danger">Ne travaille pas{e.inactifJours != null ? ` depuis ${e.inactifJours} j` : ""}</span>
                      : "—")}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-3">{f(e.valeur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
