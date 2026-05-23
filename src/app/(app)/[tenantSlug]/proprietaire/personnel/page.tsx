"use client";

import { Users } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useOwnerPersonnel } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Row, Explain, Loading, ErrorBox } from "@/components/owner/ui";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function OwnerPersonnelPage() {
  const { data, isLoading, isError } = useOwnerPersonnel();

  if (isError) return <div className="space-y-4"><OwnerHeader title="Personnel" subtitle="Vos équipes et ce qu'elles coûtent, clairement." /><ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4"><OwnerHeader title="Personnel" subtitle="Vos équipes et ce qu'elles coûtent, clairement." /><Loading /></div>;

  return (
    <div className="space-y-4">
      <OwnerHeader title="Personnel" subtitle="Vos équipes et ce qu'elles coûtent, clairement." />

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
    </div>
  );
}
