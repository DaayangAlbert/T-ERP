"use client";

import { clsx } from "clsx";
import { Coins, Banknote, Wallet } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useOwnerFinances } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Row, Explain, Loading, ErrorBox, toneText } from "@/components/owner/ui";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function OwnerFinancesPage() {
  const { data, isLoading, isError } = useOwnerFinances();

  if (isError) return <div className="space-y-4"><OwnerHeader title="Finances" subtitle="Tout l'argent de l'entreprise, expliqué simplement." /><ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4"><OwnerHeader title="Finances" subtitle="Tout l'argent de l'entreprise, expliqué simplement." /><Loading /></div>;

  const net = BigInt(data.mois.net);
  const dette = BigInt(data.comptesProjet.detteTotale);

  return (
    <div className="space-y-4">
      <OwnerHeader title="Finances" subtitle="Tout l'argent de l'entreprise, expliqué simplement." />

      <Section title="Argent en banque" icon={<Coins className="h-4 w-4" />}>
        <Explain>C&apos;est l&apos;argent <strong>immédiatement disponible</strong> sur vos comptes bancaires, plus la réserve que les banques vous autorisent à utiliser (ligne de crédit).</Explain>
        <div className="grid gap-3 sm:grid-cols-2">
          <BigStat label="Disponible en banque" value={f(data.banques.total)} tone={BigInt(data.banques.total) > 0n ? "ok" : "bad"} explain="Somme que vous pouvez utiliser tout de suite, tous comptes confondus." />
          <BigStat label="Réserve de crédit disponible" value={f(data.banques.creditDisponible)} explain="Argent supplémentaire que vos banques vous autorisent à dépenser si besoin (découvert autorisé)." />
        </div>
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Détail par banque</div>
          {data.banques.items.map((b) => (
            <Row key={b.accountNumber} label={`${b.bank} · ${b.accountNumber}`} value={f(b.balance)} tone={BigInt(b.balance) >= 0n ? "neutral" : "bad"} />
          ))}
        </div>
      </Section>

      <Section title="Ce mois-ci" icon={<Wallet className="h-4 w-4" />}>
        <Explain>Ce qui est <strong>entré</strong> (encaissements) et <strong>sorti</strong> (dépenses) de vos banques depuis le début du mois.</Explain>
        <div className="grid gap-3 sm:grid-cols-3">
          <BigStat label="Entrées" value={`+ ${f(data.mois.entrees)}`} tone="ok" explain="Argent reçu ce mois." />
          <BigStat label="Sorties" value={`− ${f(data.mois.sorties)}`} tone="bad" explain="Argent dépensé ce mois." />
          <BigStat label="Solde du mois" value={f(data.mois.net)} tone={net >= 0n ? "ok" : "bad"} explain={net >= 0n ? "Vous avez gagné plus que dépensé ce mois." : "Vous avez dépensé plus que ce qui est rentré ce mois."} />
        </div>
      </Section>

      <Section title="Comptes des chantiers" icon={<Banknote className="h-4 w-4" />}>
        <Explain>Chaque chantier a un compte. Le <strong>solde</strong> est l&apos;argent qui lui reste ; la <strong>dette</strong> est l&apos;argent que l&apos;entreprise lui a avancé et qui devra être récupéré sur la production.</Explain>
        <BigStat label="Dette totale des chantiers" value={f(data.comptesProjet.detteTotale)} tone={dette > 0n ? "warn" : "ok"} explain="Total avancé aux chantiers, en attente de remboursement. Normal en début de projet." />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-[12.5px]">
            <thead className="text-left text-[10.5px] uppercase tracking-wider text-ink-3">
              <tr><th className="px-2 py-1">Chantier</th><th className="px-2 py-1 text-right">Solde dispo.</th><th className="px-2 py-1 text-right">Dette</th></tr>
            </thead>
            <tbody>
              {data.comptesProjet.items.length === 0 ? (
                <tr><td colSpan={3} className="px-2 py-4 text-center text-ink-3">Aucun compte chantier ouvert.</td></tr>
              ) : data.comptesProjet.items.map((c) => (
                <tr key={c.siteCode} className="border-t border-line/60">
                  <td className="px-2 py-1.5"><span className="font-mono text-[11px] text-ink-3">{c.siteCode}</span> {c.siteName}</td>
                  <td className={clsx("px-2 py-1.5 text-right tabular-nums", BigInt(c.balance) < 0n ? "text-danger" : "text-ink")}>{f(c.balance)}</td>
                  <td className={clsx("px-2 py-1.5 text-right tabular-nums", BigInt(c.debt) > 0n ? "text-warning" : "text-ink-3")}>{f(c.debt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {data.compteSalaire && (
        <Section title="Compte salaire (siège)" icon={<Banknote className="h-4 w-4" />}>
          <Explain>Compte qui centralise les salaires du personnel du siège, alimenté par la part que chaque chantier doit aux frais du siège.</Explain>
          <div className={clsx("text-2xl font-bold tabular-nums", toneText[BigInt(data.compteSalaire.balance) >= 0n ? "neutral" : "bad"])}>{f(data.compteSalaire.balance)}</div>
          <p className="mt-1 text-[11.5px] text-ink-3">Banque : {data.compteSalaire.banque ?? "non rattaché"}.</p>
        </Section>
      )}
    </div>
  );
}
