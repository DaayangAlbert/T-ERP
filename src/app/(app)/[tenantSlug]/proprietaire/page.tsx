"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Coins, Building2, Users, TrendingUp, ArrowRight, CheckCircle2, Receipt, ClipboardCheck, Package, Truck, Gavel, FileText } from "lucide-react";
import { formatFCFA, formatPercent } from "@/lib/format";
import { useTenantHref } from "@/hooks/useTenantHref";
import { useOwnerCockpit } from "@/hooks/useOwnerCockpit";
import { PageHelp } from "@/components/help/PageHelp";
import { PcaDashboardTutorial } from "@/components/help/tutorials/PcaDashboardTutorial";

const fcfa = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function ProprietaireCockpitPage() {
  const { data, isLoading, isError } = useOwnerCockpit();
  const tenantHref = useTenantHref();

  if (isError) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Impossible de charger le tableau de bord.</div>;
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-surface-alt" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-alt" />)}
        </div>
      </div>
    );
  }

  const { finance, chantiers, personnel, commercial, recouvrement, decomptes, stocks, logistique } = data;
  const fluxNet = BigInt(finance.fluxNetMois);
  const tresoOk = BigInt(finance.tresorerie) > 0n;
  const sante = !tresoOk ? "alerte" : chantiers.enDifficulte > 0 ? "vigilance" : "bon";

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Santé de l&apos;entreprise</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Vue d&apos;ensemble du propriétaire — chaque domaine résumé, cliquez « Voir les détails » pour approfondir.
          </p>
        </div>
        <PageHelp title="Aide — Cockpit PCA"><PcaDashboardTutorial /></PageHelp>
      </header>

      {/* Bandeau santé globale */}
      <div
        className={clsx(
          "rounded-2xl border p-5",
          sante === "bon" && "border-success/30 bg-success/5",
          sante === "vigilance" && "border-warning/30 bg-warning/5",
          sante === "alerte" && "border-danger/30 bg-danger/5",
        )}
      >
        <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">État général</div>
        <div className="mt-1 text-lg font-bold text-ink">
          {sante === "bon" && "🟢 Votre entreprise se porte bien."}
          {sante === "vigilance" && "🟠 Tout fonctionne, mais quelques points méritent votre attention."}
          {sante === "alerte" && "🔴 Attention : votre trésorerie est dans le rouge."}
        </div>
        <p className="mt-1 text-[12.5px] text-ink-2">
          <strong>{fcfa(finance.tresorerie)}</strong> en banque · {chantiers.actifs} chantier{chantiers.actifs > 1 ? "s" : ""} en cours
          {chantiers.enDifficulte > 0 ? <> dont <strong className="text-danger">{chantiers.enDifficulte} à surveiller</strong></> : ""}
          {" "}· {personnel.effectif} personnes · {decomptes.bloques > 0 ? <strong className="text-danger">{decomptes.bloques} décompte(s) bloqué(s)</strong> : "aucun décompte bloqué"}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card icon={<Coins className="h-4 w-4" />} title="Finances & trésorerie" href={tenantHref("/proprietaire/finances")}>
          <Stat label="Disponible en banque" value={fcfa(finance.tresorerie)} tone={tresoOk ? "ok" : "bad"} />
          <Stat label="Solde du mois" value={fcfa(finance.fluxNetMois)} tone={fluxNet >= 0n ? "ok" : "bad"} />
          <Stat label="Dette des chantiers" value={fcfa(finance.detteProjets)} tone={BigInt(finance.detteProjets) > 0n ? "warn" : "ok"} />
        </Card>

        <Card icon={<Receipt className="h-4 w-4" />} title="Recouvrement & paiements" href={tenantHref("/proprietaire/recouvrement")}>
          <Stat label="À encaisser (clients)" value={fcfa(recouvrement.aEncaisser)} tone="ok" />
          <Stat label="À payer (fournisseurs)" value={fcfa(recouvrement.aPayer)} tone="bad" />
          <Stat label="Solde net" value={fcfa((BigInt(recouvrement.aEncaisser) - BigInt(recouvrement.aPayer)).toString())} tone={BigInt(recouvrement.aEncaisser) - BigInt(recouvrement.aPayer) >= 0n ? "ok" : "bad"} />
        </Card>

        <Card icon={<ClipboardCheck className="h-4 w-4" />} title="Suivi des décomptes" href={tenantHref("/proprietaire/decomptes")}>
          <Stat label="Décomptes bloqués" value={`${decomptes.bloques}`} tone={decomptes.bloques > 0 ? "bad" : "ok"} />
          <Stat label="Montant bloqué" value={fcfa(decomptes.montantBloque)} tone={BigInt(decomptes.montantBloque) > 0n ? "bad" : "ok"} />
        </Card>

        <Card icon={<Building2 className="h-4 w-4" />} title="Chantiers" href={tenantHref("/proprietaire/chantiers")}>
          <Stat label="En cours" value={`${chantiers.actifs}`} tone={chantiers.enDifficulte > 0 ? "warn" : "ok"} />
          <Stat label="À surveiller / en difficulté" value={`${chantiers.enDifficulte}`} tone={chantiers.enDifficulte > 0 ? "bad" : "ok"} />
          <Stat label="Marge moyenne" value={formatPercent(chantiers.margeMoyenne)} tone={chantiers.margeMoyenne >= 15 ? "ok" : chantiers.margeMoyenne >= 8 ? "warn" : "bad"} />
        </Card>

        <Card icon={<Package className="h-4 w-4" />} title="Stocks" href={tenantHref("/proprietaire/stocks")}>
          <Stat label="Valeur du stock" value={fcfa(stocks.valeur)} />
          <Stat label="Alertes de rupture" value={`${stocks.alertes}`} tone={stocks.alertes > 0 ? "bad" : "ok"} />
        </Card>

        <Card icon={<Truck className="h-4 w-4" />} title="Logistique & engins" href={tenantHref("/proprietaire/logistique")}>
          <Stat label="Au travail" value={`${logistique.auTravail}`} tone="ok" />
          <Stat label="Inactifs" value={`${logistique.inactifs}`} tone={logistique.inactifs > 0 ? "bad" : "ok"} />
          <Stat label="Loués" value={`${logistique.loues}`} tone={logistique.loues > 0 ? "warn" : "neutral"} />
        </Card>

        <Card icon={<Users className="h-4 w-4" />} title="Personnel" href={tenantHref("/proprietaire/personnel")}>
          <Stat label="Effectif" value={`${personnel.effectif}`} tone="ok" />
          <Stat label="Masse salariale (base)" value={fcfa(personnel.masseSalariale)} />
        </Card>

        <Card icon={<TrendingUp className="h-4 w-4" />} title="Gouvernance" href={tenantHref("/proprietaire/gouvernance")}>
          <Stat label="Marchés en cours" value={`${commercial.nombreMarches}`} tone="ok" />
          <Stat label="Valeur des marchés" value={fcfa(commercial.valeurMarches)} />
        </Card>

        <Card icon={<Gavel className="h-4 w-4" />} title="Agenda" href={tenantHref("/proprietaire/reunions")}>
          {data.prochainConseil ? (
            <>
              <Stat label="Prochaine réunion" value={data.prochainConseil.type} />
              <Stat
                label="Quand"
                value={data.prochainConseil.joursRestants <= 0 ? "Aujourd'hui" : `Dans ${data.prochainConseil.joursRestants} j`}
                tone={data.prochainConseil.joursRestants <= 7 ? "warn" : "neutral"}
              />
            </>
          ) : (
            <Stat label="Réunions programmées" value="Aucune" tone="neutral" />
          )}
        </Card>

        <Card icon={<FileText className="h-4 w-4" />} title="Rapports reçus" href={tenantHref("/proprietaire/rapports")}>
          <Stat label="Du DG, financiers, techniques" value="Consulter" />
        </Card>

        {/* Décisions à valider — action directe */}
        <Link
          href={tenantHref("/proprietaire/decisions")}
          className={clsx(
            "flex items-center justify-between rounded-2xl border p-5 shadow-card transition lg:col-span-2",
            commercial.decisionsEnAttente > 0 ? "border-warning/40 bg-warning/5 hover:bg-warning/10" : "border-line bg-white hover:bg-surface-alt",
          )}
        >
          <span className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-50 text-primary-700"><CheckCircle2 className="h-5 w-5" /></span>
            <span>
              <span className="block text-[14px] font-semibold text-ink">
                {commercial.decisionsEnAttente > 0 ? `${commercial.decisionsEnAttente} décision(s) à valider` : "Aucune décision en attente"}
              </span>
              <span className="block text-[12px] text-ink-3">Demandes transmises par le DG pour votre accord.</span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 text-ink-3" />
        </Link>
      </div>
    </div>
  );
}

function Card({ icon, title, href, children }: { icon: React.ReactNode; title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-700">{icon}</span>
        {title}
      </h2>
      <div className="flex-1 space-y-2">{children}</div>
      <Link href={href} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-[12.5px] font-medium text-primary-700 hover:bg-primary-100">
        Voir les détails <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

const toneCls: Record<string, string> = { ok: "text-success", bad: "text-danger", warn: "text-warning", neutral: "text-ink" };

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line/60 pt-2 text-[12.5px] first:border-t-0 first:pt-0">
      <span className="text-ink-2">{label}</span>
      <span className={clsx("tabular-nums font-semibold", toneCls[tone] ?? "text-ink")}>{value}</span>
    </div>
  );
}
