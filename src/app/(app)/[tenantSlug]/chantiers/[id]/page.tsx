"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Calendar, MapPin, Users, Wallet, FileSignature, Image as ImageIcon, AlertTriangle, MessageSquare, ClipboardList } from "lucide-react";
import { useSite, useSitePhotos, useAddAmendment } from "@/hooks/useSites";
import { ProgressInline } from "@/components/sites/ProgressInline";
import { AlertsPanel } from "@/components/sites/AlertsPanel";
import { DgDecisionForm } from "@/components/sites/DgDecisionForm";
import { formatDate, formatFCFA, formatPercent } from "@/lib/format";
import { SiteStatus } from "@prisma/client";
import { clsx } from "clsx";

const STATUS_LABELS: Record<SiteStatus, string> = {
  PLANNED: "Planifié",
  ACTIVE: "Actif",
  ON_HOLD: "Suspendu",
  AT_RISK: "Vigilance",
  DRIFTING: "En dérive",
  COMPLETED: "Terminé",
  ARCHIVED: "Archivé",
};

const STATUS_TONE: Record<SiteStatus, string> = {
  PLANNED: "bg-info/10 text-info",
  ACTIVE: "bg-success/10 text-success",
  ON_HOLD: "bg-ink-3/10 text-ink-3",
  AT_RISK: "bg-warning/10 text-warning",
  DRIFTING: "bg-danger/10 text-danger",
  COMPLETED: "bg-ink-3/10 text-ink-3",
  ARCHIVED: "bg-ink-3/10 text-ink-3",
};

type Tab = "marche" | "planning" | "decomptes" | "equipe" | "stock" | "photos" | "hse" | "docs" | "decisions";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "marche", label: "Marché" },
  { key: "planning", label: "Planning" },
  { key: "decomptes", label: "Décomptes" },
  { key: "equipe", label: "Équipe" },
  { key: "stock", label: "Stock" },
  { key: "photos", label: "Photos" },
  { key: "hse", label: "HSE" },
  { key: "docs", label: "Documents" },
  { key: "decisions", label: "Décisions DG" },
];

export default function ChantierDetailPage({ params }: { params: { id: string } }) {
  const { data: site, isLoading, isError } = useSite(params.id);
  const [tab, setTab] = useState<Tab>("marche");

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Chantier introuvable.
      </div>
    );
  }

  if (isLoading || !site) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-surface-alt" />
        <div className="h-32 w-full animate-pulse rounded bg-surface-alt" />
      </div>
    );
  }

  return (
    <>
      <Link
        href="/chantiers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </Link>

      {/* Hero violet */}
      <section className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 p-5 text-white shadow-brand">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="rounded bg-white/15 px-2 py-0.5 font-mono text-[11.5px] backdrop-blur">
              {site.code}
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{site.name}</h1>
            <p className="mt-1 text-[13px] text-white/80">
              {site.client} · {site.region ?? "—"}
            </p>
          </div>
          <span className={clsx("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider", STATUS_TONE[site.status])}>
            {STATUS_LABELS[site.status]}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat icon={<Wallet className="h-3.5 w-3.5" />} label="Montant HT">{formatFCFA(BigInt(site.budget))}</HeroStat>
          <HeroStat icon={<Calendar className="h-3.5 w-3.5" />} label="Livraison">{formatDate(site.plannedEndDate)}</HeroStat>
          <HeroStat icon={<MapPin className="h-3.5 w-3.5" />} label="Avancement">{site.progress} %</HeroStat>
          <HeroStat icon={<Users className="h-3.5 w-3.5" />} label="Dir. travaux">
            {site.manager ? `${site.manager.firstName} ${site.manager.lastName}` : "Non assigné"}
          </HeroStat>
        </div>
      </section>

      {/* Synthèse marché — premier regard */}
      <MarcheSynthese site={site} />

      {/* Avancement & marge */}
      <section className="mb-4 grid gap-3.5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-ink">Avancement &amp; rentabilité</h2>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11.5px] text-ink-3">
                <span>Avancement physique</span>
                <span className="font-mono tabular-nums">{site.progress} %</span>
              </div>
              <ProgressInline progress={site.progress} status={site.status} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11.5px] text-ink-3">
                <span>Marge actuelle</span>
                <span
                  className={
                    site.margin < 10
                      ? "text-danger font-mono tabular-nums"
                      : site.margin < 15
                        ? "text-warning font-mono tabular-nums"
                        : "text-success font-mono tabular-nums"
                  }
                >
                  {formatPercent(site.margin)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-ink">Compteurs</h2>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <CountStat icon={<AlertTriangle className="h-4 w-4 text-danger" />} label="Alertes" value={site.counts?.alerts ?? 0} />
            <CountStat icon={<ImageIcon className="h-4 w-4 text-primary-500" />} label="Photos" value={site.counts?.photos ?? 0} />
            <CountStat icon={<MessageSquare className="h-4 w-4 text-info" />} label="Décisions DG" value={site.counts?.decisions ?? 0} />
          </dl>
        </div>
      </section>

      {/* Alertes en haut (inline) */}
      <section className="mb-4">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Alertes en cours</h2>
        <AlertsPanel siteId={site.id} />
      </section>

      {/* Onglets */}
      <div className="mb-4 flex flex-wrap gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative whitespace-nowrap px-3 py-2 text-[13px] font-medium transition",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "marche" && <MarcheTab siteId={site.id} contract={site.contract} />}
      {tab === "photos" && <PhotosTab siteId={site.id} />}
      {tab === "decisions" && <DgDecisionForm siteId={site.id} />}
      {(tab === "planning" || tab === "decomptes" || tab === "equipe" || tab === "stock" || tab === "hse" || tab === "docs") && (
        <PlaceholderTab label={TABS.find((t) => t.key === tab)?.label ?? ""} />
      )}
    </>
  );
}

function MarcheSynthese({ site }: { site: NonNullable<ReturnType<typeof useSite>["data"]> }) {
  const ht = Number(site.budget);
  const vat = site.vatRate ?? 19.25;
  const ir = site.irRate ?? 0;
  const ttc = ht * (1 + vat / 100);
  const net = ht * (1 - ir / 100);

  const startMs = new Date(site.startDate).getTime();
  const endMs = new Date(site.plannedEndDate).getTime();
  const nowMs = Date.now();
  const elapsedPct =
    endMs > startMs
      ? Math.min(100, Math.max(0, ((nowMs - startMs) / (endMs - startMs)) * 100))
      : 0;
  const durationMonths =
    site.durationMonths ??
    (endMs > startMs ? Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24 * 30.44))) : null);

  const financings = Array.isArray(site.financings) ? site.financings : [];
  const fmt = (n: number) => formatFCFA(BigInt(Math.round(n)));

  return (
    <section className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Synthèse du marché</h2>
        <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
          {site.financingType === "JOINT" ? "Financement conjoint" : "Financement simple"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SyntheseTile label="Délai d'exécution" value={durationMonths ? `${durationMonths} mois` : "—"} />
        <SyntheseTile
          label="Temps écoulé"
          value={`${Math.round(elapsedPct)} %`}
          accent={elapsedPct >= 90 ? "danger" : elapsedPct >= 70 ? "warning" : "ok"}
        >
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className={clsx(
                "h-full rounded-full",
                elapsedPct >= 90 ? "bg-danger" : elapsedPct >= 70 ? "bg-warning" : "bg-success",
              )}
              style={{ width: `${elapsedPct}%` }}
            />
          </div>
        </SyntheseTile>
        <SyntheseTile label="Montant HT" value={fmt(ht)} />
        <SyntheseTile label={`Montant TTC · TVA ${vat}%`} value={fmt(ttc)} />
        <SyntheseTile label={`Net à mandater · IR ${ir}%`} value={fmt(net)} highlight />
      </div>

      {financings.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
            {site.financingType === "JOINT" ? "Sources de financement" : "Source du financement"}
          </div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {financings.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface-alt px-3 py-1.5 text-[12.5px]"
              >
                <span className="text-ink-2">{f.label || `Source ${i + 1}`}</span>
                <span className="font-mono font-semibold text-ink">{fmt(Number(f.amountHT))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SyntheseTile({
  label,
  value,
  highlight,
  accent,
  children,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: "ok" | "warning" | "danger";
  children?: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border p-3",
        highlight ? "border-primary-300 bg-primary-50" : "border-line bg-surface-alt",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div
        className={clsx(
          "mt-0.5 font-mono text-[15px] font-bold",
          highlight
            ? "text-primary-800"
            : accent === "danger"
              ? "text-danger"
              : accent === "warning"
                ? "text-warning"
                : "text-ink",
        )}
      >
        {value}
      </div>
      {children}
    </div>
  );
}

function HeroStat({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/10 p-2.5 backdrop-blur">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/70">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-[14px] font-semibold">{children}</div>
    </div>
  );
}

function CountStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-surface-alt px-2 py-2.5">
      <div className="flex items-center justify-center gap-1">{icon}</div>
      <div className="mt-1 font-mono text-[18px] font-bold text-ink">{value}</div>
      <div className="text-[10.5px] text-ink-3">{label}</div>
    </div>
  );
}

function MarcheTab({ siteId, contract }: { siteId: string; contract: NonNullable<ReturnType<typeof useSite>["data"]>["contract"] }) {
  const [showAmendForm, setShowAmendForm] = useState(false);
  const [ref, setRef] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = useAddAmendment(siteId);

  if (!contract) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-[13px] text-ink-3">
        Aucun contrat enregistré pour ce chantier.
      </div>
    );
  }

  const initial = BigInt(contract.initialAmount);
  const current = BigInt(contract.currentAmount);
  const delta = current - initial;
  const amendments = Array.isArray(contract.amendments) ? contract.amendments : [];

  const submit = async () => {
    setError(null);
    if (!ref || !amount || !reason) {
      setError("Référence, montant et motif requis.");
      return;
    }
    try {
      await add.mutateAsync({ ref, amount, date, reason });
      setRef("");
      setAmount("");
      setReason("");
      setShowAmendForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Contrat de marché</h2>
            <p className="mt-0.5 font-mono text-[11.5px] text-ink-3">{contract.reference}</p>
          </div>
          {contract.publicMarket && (
            <span className="inline-flex items-center gap-1 rounded bg-info/10 px-2 py-0.5 text-[11px] font-semibold text-info">
              Marché public · {contract.procuringEntity}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Montant initial" value={formatFCFA(initial)} />
          <Stat label="Avenants cumulés" value={delta >= 0n ? `+${formatFCFA(delta)}` : `−${formatFCFA(-delta)}`} tone={delta > 0n ? "warning" : "ok"} />
          <Stat label="Montant courant" value={formatFCFA(current)} highlight />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label="Conditions de paiement">{contract.paymentTerms ?? "—"}</Info>
          <Info label="Garanties">
            <span className="text-[11.5px]">
              Caution {contract.guarantees?.caution ?? "—"} · Retenue {contract.guarantees?.retention ?? "—"}
            </span>
          </Info>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">
            Avenants ({amendments.length})
          </h3>
          <button
            type="button"
            onClick={() => setShowAmendForm((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600"
          >
            <FileSignature className="h-3.5 w-3.5" /> Nouvel avenant
          </button>
        </div>

        {showAmendForm && (
          <div className="mb-3 rounded-lg border border-primary-200 bg-primary-50/40 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Référence (AV-2026-01)" className="h-9 rounded-md border border-line bg-white px-2.5 text-[13px]" />
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant FCFA (peut être négatif)" className="h-9 rounded-md border border-line bg-white px-2.5 text-[13px] font-mono" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2.5 text-[13px]" />
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif" className="h-9 rounded-md border border-line bg-white px-2.5 text-[13px]" />
            </div>
            {error && <p className="mt-2 text-[12.5px] text-rose-700">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAmendForm(false)} className="inline-flex h-8 items-center rounded-md border border-line-2 bg-white px-3 text-[12px] text-ink-2">Annuler</button>
              <button type="button" onClick={submit} disabled={add.isPending} className="inline-flex h-8 items-center rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600 disabled:opacity-60">
                {add.isPending ? "Ajout…" : "Ajouter l'avenant"}
              </button>
            </div>
          </div>
        )}

        {amendments.length === 0 ? (
          <p className="text-[12.5px] text-ink-3">Aucun avenant pour le moment.</p>
        ) : (
          <ul className="space-y-1.5 text-[12.5px]">
            {amendments.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface-alt px-3 py-2">
                <div className="flex-1">
                  <span className="font-mono text-[11px] text-ink-3">{(a as { ref?: string }).ref}</span>
                  <span className="ml-2 text-ink-2">{(a as { reason?: string }).reason}</span>
                </div>
                <span className="font-mono font-semibold text-ink">
                  {(a as { amount?: string }).amount ? formatFCFA(BigInt((a as { amount: string }).amount)) : "—"}
                </span>
                <span className="text-[10.5px] text-ink-3">{(a as { date?: string }).date}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PhotosTab({ siteId }: { siteId: string }) {
  const { data, isLoading } = useSitePhotos(siteId);
  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-surface-alt" />;
  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-[13px] text-ink-3">
        Aucune photo pour ce chantier.
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((p) => (
        <figure key={p.id} className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt={p.caption ?? ""} className="h-44 w-full object-cover" />
          <figcaption className="p-2.5 text-[12px]">
            <div className="font-medium text-ink">{p.caption ?? "—"}</div>
            <div className="text-[10.5px] text-ink-3">{formatDate(p.takenAt)}</div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface-alt p-8 text-center">
      <ClipboardList className="mx-auto h-8 w-8 text-ink-3" />
      <h3 className="mt-2 text-sm font-semibold text-ink">{label}</h3>
      <p className="mt-1 text-[12.5px] text-ink-3">Section disponible dans une livraison ultérieure.</p>
    </div>
  );
}

function Stat({ label, value, tone, highlight }: { label: string; value: string; tone?: "ok" | "warning" | "danger"; highlight?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-lg border p-3",
        highlight ? "border-primary-300 bg-primary-50" : tone === "warning" ? "border-warning/30 bg-warning/5" : tone === "danger" ? "border-danger/30 bg-danger/5" : "border-line bg-white"
      )}
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={clsx("mt-1 font-mono text-[16px] font-bold", highlight ? "text-primary-800" : "text-ink")}>{value}</div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface-alt px-3 py-2">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] text-ink-2">{children}</dd>
    </div>
  );
}
