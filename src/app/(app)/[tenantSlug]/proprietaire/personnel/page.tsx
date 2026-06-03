"use client";

import { clsx } from "clsx";
import { Users, Wallet } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useOwnerPersonnel, useOwnerSalaires } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Row, Explain, Loading, ErrorBox } from "@/components/owner/ui";
import { PageHelp } from "@/components/help/PageHelp";
import { PcaPersonnelTutorial } from "@/components/help/tutorials/PcaPersonnelTutorial";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function OwnerPersonnelPage() {
  const { data, isLoading, isError } = useOwnerPersonnel();

  if (isError) return <div className="space-y-4"><OwnerHeader title="Personnel" subtitle="Vos équipes et ce qu'elles coûtent, clairement." help={<PageHelp title="Aide — Personnel (PCA)"><PcaPersonnelTutorial /></PageHelp>} /><ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4"><OwnerHeader title="Personnel" subtitle="Vos équipes et ce qu'elles coûtent, clairement." help={<PageHelp title="Aide — Personnel (PCA)"><PcaPersonnelTutorial /></PageHelp>} /><Loading /></div>;

  return (
    <div className="space-y-4">
      <OwnerHeader title="Personnel" subtitle="Vos équipes et ce qu'elles coûtent, clairement." help={<PageHelp title="Aide — Personnel (PCA)"><PcaPersonnelTutorial /></PageHelp>} />

      <Section title="Vos équipes" icon={<Users className="h-4 w-4" />}>
        <Explain>Le nombre de personnes qui travaillent dans l&apos;entreprise, et le coût de base de leurs salaires chaque mois (hors primes et charges sociales).</Explain>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BigStat label="Effectif total" value={`${data.effectif}`} suffix="pers." tone="ok" explain="Toutes les personnes actives dans l'entreprise." />
          <BigStat label="Ouvriers" value={`${data.ouvriers}`} suffix="pers." explain="Personnel de chantier (ouvriers)." />
          <BigStat label="Cadres & bureau" value={`${data.cadresEtBureau}`} suffix="pers." explain="Personnel d'encadrement et de bureau (siège)." />
          <BigStat label="Embauches ce mois" value={`${data.nouveauxCeMois}`} tone={data.nouveauxCeMois > 0 ? "ok" : "neutral"} explain="Nouvelles personnes arrivées ce mois-ci." />
        </div>
        <div className="mt-3">
          <BigStat label="Masse salariale mensuelle (base)" value={f(data.masseSalariale)} explain="Total des salaires de base versés chaque mois. C'est votre charge fixe de personnel ; ajoutez ~20-40% pour les charges sociales et primes." />
        </div>
      </Section>

      <Section title="Répartition par service">
        <Explain>Comment se répartit votre personnel — et son coût — entre les différents services.</Explain>
        {data.departements.length === 0 ? (
          <p className="py-3 text-center text-[12px] text-ink-3">Aucune donnée de service.</p>
        ) : (
          data.departements.map((d) => (
            <Row
              key={d.departement}
              label={`${d.departement} — ${d.effectif} pers.`}
              value={f(d.masseSalariale)}
              explain={BigInt(d.masseSalariale) === 0n ? "Salaires de base non renseignés pour ce service." : undefined}
            />
          ))
        )}
      </Section>

      <SalairesSection />
    </div>
  );
}

function SalairesSection() {
  const { data, isLoading, isError } = useOwnerSalaires();

  return (
    <Section title="Salaires & paiements" icon={<Wallet className="h-4 w-4" />}>
      <Explain>Pour chaque personne : son salaire de base, le nombre de mois <strong className="text-success">payés</strong> et <strong className="text-danger">impayés</strong> (sur les 12 derniers mois). Les mois impayés sont des bulletins calculés mais pas encore réglés.</Explain>
      {isError ? (
        <p className="py-3 text-center text-[12px] text-danger">Impossible de charger les salaires.</p>
      ) : isLoading || !data ? (
        <div className="h-24 animate-pulse rounded bg-surface-alt" />
      ) : (
        <>
          {BigInt(data.resume.masseImpayee) > 0n && (
            <div className="mb-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[12.5px] text-ink-2">
              <strong className="text-warning">{data.resume.avecImpayes} personne(s)</strong> ont des salaires impayés, pour un total de <strong>{f(data.resume.masseImpayee)}</strong> restant à payer.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[12.5px]">
              <thead className="border-b border-line text-left text-[10.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-2 py-2">Personne</th>
                  <th className="px-2 py-2 text-right">Salaire de base</th>
                  <th className="px-2 py-2 text-center">Mois payés</th>
                  <th className="px-2 py-2 text-center">Mois impayés</th>
                  <th className="px-2 py-2 text-right">Reste à payer</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="border-b border-line">
                    <td className="px-2 py-2">
                      <div className="font-medium text-ink">{p.nom}</div>
                      {p.poste && <div className="text-[11px] text-ink-3">{p.poste}</div>}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{BigInt(p.salaire) > 0n ? f(p.salaire) : "—"}</td>
                    <td className="px-2 py-2 text-center"><span className="rounded bg-success/10 px-2 py-0.5 font-medium text-success">{p.moisPayes}</span></td>
                    <td className="px-2 py-2 text-center">
                      <span className={clsx("rounded px-2 py-0.5 font-medium", p.moisImpayes > 0 ? "bg-danger/10 text-danger" : "bg-ink-3/10 text-ink-3")} title={p.impayes.join(", ")}>
                        {p.moisImpayes}
                      </span>
                    </td>
                    <td className={clsx("px-2 py-2 text-right tabular-nums", BigInt(p.resteAPayer) > 0n ? "font-semibold text-danger" : "text-ink-3")}>{BigInt(p.resteAPayer) > 0n ? f(p.resteAPayer) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}
