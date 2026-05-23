"use client";

import { clsx } from "clsx";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatFCFA, formatDate } from "@/lib/format";
import { useOwnerRecouvrement } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Explain, Loading, ErrorBox } from "@/components/owner/ui";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function OwnerRecouvrementPage() {
  const { data, isLoading, isError } = useOwnerRecouvrement();
  const head = <OwnerHeader title="Recouvrement & paiements" subtitle="Ce qu'on vous doit, et ce que vous devez — clairement." />;

  if (isError) return <div className="space-y-4">{head}<ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4">{head}<Loading /></div>;

  const net = BigInt(data.soldeNet);

  return (
    <div className="space-y-4">
      {head}

      <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <Explain>
          <strong>À encaisser</strong> = argent que vos clients vous doivent (factures envoyées non encore payées).
          {" "}<strong>À payer</strong> = argent que vous devez à vos fournisseurs / prestataires. Le <strong>solde net</strong> indique si, une fois tout réglé, il vous restera de l&apos;argent.
        </Explain>
        <div className="grid gap-3 sm:grid-cols-3">
          <BigStat label="À encaisser (clients)" value={f(data.aEncaisser.total)} tone="ok" explain={`${data.aEncaisser.nombre} facture(s). Dont ${f(data.aEncaisser.enRetard)} en retard de paiement.`} />
          <BigStat label="À payer (fournisseurs)" value={f(data.aPayer.total)} tone="bad" explain={`${data.aPayer.nombre} facture(s). Dont ${f(data.aPayer.enRetard)} déjà en retard.`} />
          <BigStat label="Solde net" value={f(data.soldeNet)} tone={net >= 0n ? "ok" : "bad"} explain={net >= 0n ? "Après avoir tout encaissé et tout payé, il vous resterait de l'argent." : "Vous devez plus que ce qu'on vous doit : surveillez la trésorerie."} />
        </div>
      </div>

      <Section title="À encaisser — factures clients" icon={<ArrowDownToLine className="h-4 w-4" />}>
        <Explain>Les situations de travaux envoyées à vos clients qui ne sont pas encore réglées. En rouge = échéance dépassée (à relancer).</Explain>
        <TableRecv items={data.aEncaisser.items} />
      </Section>

      <Section title="À payer — factures fournisseurs / prestataires" icon={<ArrowUpFromLine className="h-4 w-4" />}>
        <Explain>Les factures des fournisseurs et sous-traitants à qui l&apos;entreprise doit de l&apos;argent. En rouge = paiement en retard.</Explain>
        <TablePay items={data.aPayer.items} />
      </Section>
    </div>
  );
}

function TableRecv({ items }: { items: { ref: string; client: string; reste: string; echeance: string; enRetard: boolean }[] }) {
  if (items.length === 0) return <p className="py-4 text-center text-[12.5px] text-success">✓ Aucune facture client en attente.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-[12.5px]">
        <thead className="text-left text-[10.5px] uppercase tracking-wider text-ink-3">
          <tr><th className="px-2 py-1">Référence</th><th className="px-2 py-1">Chantier / client</th><th className="px-2 py-1 text-right">Reste à encaisser</th><th className="px-2 py-1">Échéance</th></tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.ref} className="border-t border-line/60">
              <td className="px-2 py-1.5 font-mono text-[11px] text-ink-3">{b.ref}</td>
              <td className="px-2 py-1.5">{b.client}</td>
              <td className="px-2 py-1.5 text-right tabular-nums font-medium">{f(b.reste)}</td>
              <td className={clsx("px-2 py-1.5", b.enRetard ? "font-medium text-danger" : "text-ink-3")}>{formatDate(b.echeance)}{b.enRetard ? " · en retard" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablePay({ items }: { items: { ref: string; fournisseur: string; chantier: string | null; montant: string; echeance: string; enRetard: boolean }[] }) {
  if (items.length === 0) return <p className="py-4 text-center text-[12.5px] text-success">✓ Aucune facture fournisseur en attente.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-[12.5px]">
        <thead className="text-left text-[10.5px] uppercase tracking-wider text-ink-3">
          <tr><th className="px-2 py-1">Référence</th><th className="px-2 py-1">Fournisseur</th><th className="px-2 py-1">Chantier</th><th className="px-2 py-1 text-right">Montant</th><th className="px-2 py-1">Échéance</th></tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.ref} className="border-t border-line/60">
              <td className="px-2 py-1.5 font-mono text-[11px] text-ink-3">{i.ref}</td>
              <td className="px-2 py-1.5 font-medium text-ink">{i.fournisseur}</td>
              <td className="px-2 py-1.5 text-ink-3">{i.chantier ?? "—"}</td>
              <td className="px-2 py-1.5 text-right tabular-nums font-medium">{f(i.montant)}</td>
              <td className={clsx("px-2 py-1.5", i.enRetard ? "font-medium text-danger" : "text-ink-3")}>{formatDate(i.echeance)}{i.enRetard ? " · en retard" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
