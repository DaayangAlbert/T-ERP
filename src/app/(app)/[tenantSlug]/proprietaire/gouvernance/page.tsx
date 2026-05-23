"use client";

import Link from "next/link";
import { Landmark, CheckCircle2, ArrowRight } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useTenantHref } from "@/hooks/useTenantHref";
import { useOwnerGouvernance } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Row, Explain, Loading, ErrorBox } from "@/components/owner/ui";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

const TYPE_LABELS: Record<string, string> = {
  PAYROLL: "Paie",
  EXPENSE: "Dépenses",
  PURCHASE: "Achats",
  HIRING: "Recrutements",
  CONTRACT: "Contrats",
  LEAVE: "Congés",
  AMENDMENT: "Avenants de marché",
  SUBCONTRACTING: "Sous-traitance",
  EQUIPMENT: "Achat de matériel",
  SPECIAL_METHOD: "Méthodes spéciales",
  TECHNICAL_HANDOVER: "Réceptions techniques",
  OTHER: "Divers",
};

export default function OwnerGouvernancePage() {
  const { data, isLoading, isError } = useOwnerGouvernance();
  const tenantHref = useTenantHref();

  if (isError) return <div className="space-y-4"><OwnerHeader title="Gouvernance" subtitle="Décisions et marchés de l'entreprise, expliqués." /><ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4"><OwnerHeader title="Gouvernance" subtitle="Décisions et marchés de l'entreprise, expliqués." /><Loading /></div>;

  return (
    <div className="space-y-4">
      <OwnerHeader title="Gouvernance" subtitle="Décisions et marchés de l'entreprise, expliqués." />

      <Section title="Décisions" icon={<CheckCircle2 className="h-4 w-4" />}>
        <Explain>Les demandes importantes (dépenses, achats, recrutements, avenants…) qui passent par un circuit de validation. « En attente » = pas encore tranchées.</Explain>
        <div className="grid gap-3 sm:grid-cols-2">
          <BigStat label="Décisions en attente" value={`${data.decisions.enAttente}`} tone={data.decisions.enAttente > 0 ? "warn" : "ok"} explain="Demandes qui attendent un accord (le vôtre ou celui d'un responsable)." />
          <BigStat label="Traitées ce mois" value={`${data.decisions.traiteesCeMois}`} tone="neutral" explain="Décisions approuvées ou refusées depuis le début du mois." />
        </div>
        {data.decisions.parType.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">En attente, par nature</div>
            {data.decisions.parType.map((t) => (
              <Row
                key={t.type}
                label={`${TYPE_LABELS[t.type] ?? t.type} — ${t.count} demande${t.count > 1 ? "s" : ""}`}
                value={BigInt(t.montant) > 0n ? f(t.montant) : "—"}
                tone="warn"
              />
            ))}
          </div>
        )}
        {data.decisions.enAttente > 0 && (
          <Link href={tenantHref("/proprietaire/decisions")} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">
            Traiter les décisions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </Section>

      <Section title="Marchés & contrats" icon={<Landmark className="h-4 w-4" />}>
        <Explain>L&apos;ensemble des marchés (contrats clients) que l&apos;entreprise exécute — votre carnet de commandes.</Explain>
        <div className="grid gap-3 sm:grid-cols-3">
          <BigStat label="Marchés en cours" value={`${data.marches.nombre}`} tone="ok" explain="Nombre de contrats clients en exécution." />
          <BigStat label="Valeur du carnet" value={f(data.marches.valeurTotale)} explain="Montant total de tous vos marchés en cours (avec avenants)." />
          <BigStat label="Nouveaux ce mois" value={`${data.marches.nouveauxCeMois}`} tone={data.marches.nouveauxCeMois > 0 ? "ok" : "neutral"} explain="Nouveaux marchés enregistrés ce mois-ci." />
        </div>
      </Section>
    </div>
  );
}
