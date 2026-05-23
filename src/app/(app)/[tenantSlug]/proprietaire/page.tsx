"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Coins, Building2, Users, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatFCFA, formatPercent } from "@/lib/format";
import { useOwnerCockpit } from "@/hooks/useOwnerCockpit";

const fcfa = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function ProprietaireCockpitPage() {
  const { data, isLoading, isError } = useOwnerCockpit();

  if (isError) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Impossible de charger le tableau de bord.</div>;
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-surface-alt" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-surface-alt" />)}
        </div>
      </div>
    );
  }

  const { finance, chantiers, personnel, commercial } = data;
  const fluxNet = BigInt(finance.fluxNetMois);
  const tresoOk = BigInt(finance.tresorerie) > 0n;
  const sante = !tresoOk ? "alerte" : chantiers.enDifficulte > 0 ? "vigilance" : "bon";

  return (
    <div className="space-y-4">
      <header className="border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Santé de l&apos;entreprise</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Vue d&apos;ensemble du propriétaire — chiffres clés expliqués simplement.
        </p>
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
          Vous avez <strong>{fcfa(finance.tresorerie)}</strong> disponibles en banque,
          {" "}{chantiers.actifs} chantier{chantiers.actifs > 1 ? "s" : ""} en cours
          {chantiers.enDifficulte > 0 ? <> dont <strong className="text-danger">{chantiers.enDifficulte} à surveiller</strong></> : " et aucun en difficulté"},
          {" "}et {personnel.effectif} personne{personnel.effectif > 1 ? "s" : ""} dans l&apos;effectif.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Finance */}
        <Card icon={<Coins className="h-4 w-4" />} title="Finances & trésorerie" accent="primary">
          <Big label="Trésorerie disponible en banque" value={fcfa(finance.tresorerie)} tone={tresoOk ? "ok" : "bad"} />
          <Line label="Entrées ce mois" value={`+ ${fcfa(finance.entreesMois)}`} tone="ok" />
          <Line label="Sorties ce mois" value={`− ${fcfa(finance.sortiesMois)}`} tone="bad" />
          <Line
            label="Solde du mois (entrées − sorties)"
            value={fcfa(finance.fluxNetMois)}
            tone={fluxNet >= 0n ? "ok" : "bad"}
          />
          <Hint>
            Dette des chantiers : <strong>{fcfa(finance.detteProjets)}</strong> — argent avancé aux projets, à récupérer plus tard.
          </Hint>
        </Card>

        {/* Chantiers */}
        <Card icon={<Building2 className="h-4 w-4" />} title="Chantiers" accent="primary">
          <Big label="Chantiers en cours" value={`${chantiers.actifs}`} tone={chantiers.enDifficulte > 0 ? "warn" : "ok"} />
          <div className="flex gap-4 text-[12.5px]">
            <span className="text-success">🟢 {chantiers.actifs - chantiers.enDifficulte} vont bien</span>
            <span className={chantiers.enDifficulte > 0 ? "text-danger" : "text-ink-3"}>
              🔴 {chantiers.enDifficulte} à surveiller
            </span>
          </div>
          <Line label="Valeur du portefeuille de marchés" value={fcfa(chantiers.valeurPortefeuille)} />
          <Line label="Marge moyenne des chantiers actifs" value={formatPercent(chantiers.margeMoyenne)} tone={chantiers.margeMoyenne >= 15 ? "ok" : chantiers.margeMoyenne >= 8 ? "warn" : "bad"} />
          <Hint>{chantiers.clotures} chantier(s) clôturé(s) · {chantiers.planifies} planifié(s).</Hint>
        </Card>

        {/* Personnel */}
        <Card icon={<Users className="h-4 w-4" />} title="Personnel & masse salariale" accent="primary">
          <Big label="Effectif total" value={`${personnel.effectif}`} suffix="personnes" tone="ok" />
          <Line label="Masse salariale (base mensuelle)" value={fcfa(personnel.masseSalariale)} />
          <Hint>Coût de base du personnel chaque mois (hors primes et charges).</Hint>
        </Card>

        {/* Commercial & gouvernance */}
        <Card icon={<TrendingUp className="h-4 w-4" />} title="Commercial & gouvernance" accent="primary">
          <Big label="Marchés en cours" value={`${commercial.nombreMarches}`} tone="ok" />
          <Line label="Valeur totale des marchés" value={fcfa(commercial.valeurMarches)} />
          <Line label="Nouveaux marchés ce mois" value={`${commercial.nouveauxMarchesMois}`} tone={commercial.nouveauxMarchesMois > 0 ? "ok" : "neutral"} />
          <Link
            href="/proprietaire/decisions"
            className={clsx(
              "mt-1 flex items-center justify-between rounded-lg border px-3 py-2.5 text-[13px] font-medium transition",
              commercial.decisionsEnAttente > 0
                ? "border-warning/40 bg-warning/5 text-ink hover:bg-warning/10"
                : "border-line bg-surface-alt text-ink-2 hover:bg-surface-alt/70",
            )}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary-600" />
              {commercial.decisionsEnAttente > 0
                ? `${commercial.decisionsEnAttente} décision(s) à valider`
                : "Aucune décision en attente"}
            </span>
            <ArrowRight className="h-4 w-4 text-ink-3" />
          </Link>
        </Card>
      </div>
    </div>
  );
}

function Card({ icon, title, accent, children }: { icon: React.ReactNode; title: string; accent: "primary"; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className={clsx("grid h-7 w-7 place-items-center rounded-lg", accent === "primary" && "bg-primary-50 text-primary-700")}>{icon}</span>
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

const toneCls: Record<string, string> = {
  ok: "text-success",
  bad: "text-danger",
  warn: "text-warning",
  neutral: "text-ink",
};

function Big({ label, value, suffix, tone = "neutral" }: { label: string; value: string; suffix?: string; tone?: keyof typeof toneCls | string }) {
  return (
    <div>
      <div className="text-[11.5px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className={clsx("mt-0.5 text-2xl font-bold tabular-nums", toneCls[tone] ?? "text-ink")}>
        {value} {suffix && <span className="text-sm font-medium text-ink-3">{suffix}</span>}
      </div>
    </div>
  );
}

function Line({ label, value, tone = "neutral" }: { label: string; value: string; tone?: keyof typeof toneCls | string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line/60 pt-2 text-[12.5px]">
      <span className="text-ink-2">{label}</span>
      <span className={clsx("tabular-nums font-semibold", toneCls[tone] ?? "text-ink")}>{value}</span>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-surface-alt px-3 py-2 text-[11.5px] leading-relaxed text-ink-3">{children}</p>;
}
