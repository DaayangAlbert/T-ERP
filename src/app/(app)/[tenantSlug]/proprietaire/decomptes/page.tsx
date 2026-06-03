"use client";

import { clsx } from "clsx";
import { ClipboardCheck, AlertTriangle, FileX } from "lucide-react";
import { formatFCFA, formatDate } from "@/lib/format";
import { useOwnerDecomptes } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Explain, Pill, Loading, ErrorBox } from "@/components/owner/ui";
import { PageHelp } from "@/components/help/PageHelp";
import { PcaDecomptesTutorial } from "@/components/help/tutorials/PcaDecomptesTutorial";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });
const STATUT: Record<string, { tone: string; label: string }> = {
  termine: { tone: "ok", label: "Terminé" },
  bloque: { tone: "bad", label: "Bloqué" },
  en_cours: { tone: "warn", label: "En cours" },
};

export default function OwnerDecomptesPage() {
  const { data, isLoading, isError } = useOwnerDecomptes();
  const head = <OwnerHeader title="Suivi des décomptes" subtitle="Où en est chaque décompte client, et ce qui le bloque." help={<PageHelp title="Aide — Décomptes (PCA)"><PcaDecomptesTutorial /></PageHelp>} />;

  if (isError) return <div className="space-y-4">{head}<ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4">{head}<Loading /></div>;

  return (
    <div className="space-y-4">
      {head}

      <Section title="Vue d'ensemble" icon={<ClipboardCheck className="h-4 w-4" />}>
        <Explain>Un <strong>décompte</strong> est une facture envoyée au client pour les travaux réalisés. Avant d&apos;être payé, il passe par plusieurs étapes administratives. Un décompte <strong className="text-danger">bloqué</strong> attend un document ou une action — c&apos;est de l&apos;argent retardé.</Explain>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BigStat label="Décomptes suivis" value={`${data.resume.total}`} explain="Nombre de décomptes dans le circuit de paiement." />
          <BigStat label="En cours" value={`${data.resume.enCours}`} tone="warn" explain="Décomptes qui avancent normalement." />
          <BigStat label="Bloqués" value={`${data.resume.bloques}`} tone={data.resume.bloques > 0 ? "bad" : "ok"} explain="Décomptes arrêtés sur une étape — à débloquer." />
          <BigStat label="Montant bloqué" value={f(data.resume.montantBloque)} tone={BigInt(data.resume.montantBloque) > 0n ? "bad" : "ok"} explain="Argent en attente à cause des blocages." />
        </div>
      </Section>

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-10 text-center text-[12.5px] text-ink-3">Aucun décompte en circuit de paiement.</div>
      ) : (
        data.items.map((d) => {
          const st = STATUT[d.statut] ?? STATUT.en_cours;
          const pct = d.etapesTotal > 0 ? Math.round((d.etapesValidees / d.etapesTotal) * 100) : 0;
          return (
            <section key={d.id} className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-3">{d.decompte}</span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </div>
                  <h3 className="mt-0.5 text-[14px] font-semibold text-ink">{d.client}</h3>
                  <p className="text-[11.5px] text-ink-3">
                    Étape : {d.etapeCourante} ({d.etapesValidees}/{d.etapesTotal}){d.suiviPar ? ` · suivi par ${d.suiviPar}` : ""} · échéance {formatDate(d.echeance)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Montant</div>
                  <div className="text-lg font-bold tabular-nums text-ink">{f(d.montant)}</div>
                </div>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                <div className={clsx("h-full rounded-full", d.statut === "bloque" ? "bg-danger" : d.statut === "termine" ? "bg-success" : "bg-warning")} style={{ width: `${pct}%` }} />
              </div>

              {d.blocages.length > 0 && (
                <div className="mt-3 space-y-2 rounded-lg border border-danger/20 bg-danger/5 p-3">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-danger">
                    <AlertTriangle className="h-3.5 w-3.5" /> {d.blocages.length} blocage(s) à lever
                  </div>
                  {d.blocages.map((b, i) => (
                    <div key={i} className="text-[12px] text-ink-2">
                      <span className="font-medium text-ink">{b.etape}</span>
                      {b.motif ? ` — ${b.motif}` : ""}
                      {b.depuis ? <span className="text-ink-3"> (depuis le {formatDate(b.depuis)})</span> : null}
                      {b.documentsManquants.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-danger">
                          <FileX className="h-3 w-3" /> Documents manquants : {b.documentsManquants.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
