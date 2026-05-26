"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ShieldCheck, AlertOctagon, Plus, Pencil } from "lucide-react";
import { clsx } from "clsx";
import { useDtQhse } from "@/hooks/useDtQhse";
import { NcEditorModal, type NcDraft } from "@/components/qhse/NcEditorModal";

type Tab = "dashboard" | "incidents" | "audits" | "ncs" | "certs";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "dashboard", label: "Tableau de bord" },
  { key: "incidents", label: "Incidents" },
  { key: "audits", label: "Audits" },
  { key: "ncs", label: "Non-conformités" },
  { key: "certs", label: "Certifications ISO" },
];

const SEVERITY_BADGE: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-rose-100 text-rose-700",
  CRITICAL: "bg-rose-200 text-rose-900",
};

const NC_CRIT_BADGE: Record<string, string> = {
  MINOR: "bg-slate-100 text-slate-700",
  MAJOR: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-rose-100 text-rose-700",
};

const DEFAULT_NC_DRAFT: NcDraft = {
  siteId: "",
  category: "QUALITY",
  criticality: "MAJOR",
  description: "",
  correctiveAction: null,
  ownerId: null,
  dueDate: null,
  status: "OPEN",
};

/**
 * Espace de travail QHSE — utilisé par le Responsable QHSE (édition) et par
 * la Direction Technique (lecture seule depuis l'arrivée du rôle QHSE_MANAGER).
 *
 * Tabs : tableau de bord · incidents · audits chantiers · NC · certifications.
 * En lecture seule (canEdit=false), les boutons « Déclarer une NC » et
 * « Modifier » sont masqués.
 */
export function QhseWorkspace({
  title = "Qualité, Hygiène, Sécurité, Environnement",
  subtitle = "Pilotage QHSE des chantiers.",
  canEdit = true,
  readOnlyBanner,
}: {
  title?: string;
  subtitle?: string;
  canEdit?: boolean;
  readOnlyBanner?: React.ReactNode;
}) {
  const { data, isLoading } = useDtQhse();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [ncDraft, setNcDraft] = useState<NcDraft | null>(null);

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const criticalOpen = data.incidents.find(
    (i) => i.severity === "CRITICAL" && i.status !== "CLOSED",
  );

  return (
    <div className="space-y-3">
      {criticalOpen && (
        <div className="sticky top-14 z-30 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800 shadow-md">
          <AlertOctagon className="mr-1.5 inline h-3.5 w-3.5" />
          Incident <strong>CRITIQUE</strong> non clôturé sur {criticalOpen.siteName}
        </div>
      )}

      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">{subtitle}</p>
      </header>

      {readOnlyBanner}

      <div className="rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 p-4 text-white shadow-lg">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Sécurité chantiers</div>
            <div className="mt-1 font-mono text-[24px] font-bold sm:text-[28px]">{data.banner.daysSinceMajorAccident} jours sans accident grave</div>
          </div>
          <div className="flex flex-wrap gap-3 text-[12px] text-white/90">
            <span><strong className="text-white">{data.banner.fatalYtd}</strong> accident mortel YTD</span>
            <span>TF1 <strong className="text-white">{data.banner.tf1}</strong> · cible &lt; <strong className="text-white">{data.banner.tf1Target}</strong></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: "Accidents YTD", v: data.kpis.incidentsYtd.toString() },
          { label: "TF1", v: data.kpis.tf1.toString() },
          { label: "Audits ce mois", v: data.kpis.auditsThisMonth.toString() },
          { label: "NC ouvertes", v: data.kpis.openNcCount.toString() },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-line bg-white px-3 py-2.5">
            <div className="text-[20px] font-bold leading-none text-ink">{k.v}</div>
            <div className="mt-1 text-[11.5px] text-ink-2">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative shrink-0 px-3 py-2 text-[12.5px] font-medium",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink",
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DashCard title="Derniers incidents">
            {data.incidents.slice(0, 5).map((i) => (
              <li key={i.id} className="rounded-md border border-line p-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{i.siteName}</span>
                  <span className={clsx("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", SEVERITY_BADGE[i.severity])}>{i.severity}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-ink-3">{i.description}</p>
              </li>
            ))}
          </DashCard>
          <DashCard title="Audits récents">
            {data.audits.slice(0, 5).map((a) => (
              <li key={a.id} className="rounded-md border border-line p-2">
                <div className="font-medium">{a.siteName}</div>
                <div className="text-[11px] text-ink-3">{a.auditType} · {a.score ? `${Math.round(a.score)}/100` : "à venir"}</div>
              </li>
            ))}
          </DashCard>
          <DashCard title="NC ouvertes">
            {data.ncs.filter((n) => n.status !== "CLOSED").slice(0, 5).map((n) => (
              <li key={n.id} className="rounded-md border border-line p-2">
                <div className="flex justify-between gap-2">
                  <span className="truncate font-medium">{n.description}</span>
                  <span className={clsx("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", NC_CRIT_BADGE[n.criticality])}>{n.criticality}</span>
                </div>
              </li>
            ))}
          </DashCard>
        </div>
      )}

      {tab === "incidents" && (
        <div className="rounded-xl border border-line bg-white">
          <div className="hidden md:block">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt text-[11px] uppercase text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Chantier</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Gravité</th>
                  <th className="px-3 py-2 text-right font-medium">Victimes</th>
                  <th className="px-3 py-2 text-right font-medium">Jours arrêt</th>
                  <th className="px-3 py-2 text-left font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.incidents.map((i) => (
                  <tr key={i.id} className="border-t border-line">
                    <td className="px-3 py-2 text-ink-2">{format(new Date(i.occurredAt), "dd/MM/yy", { locale: fr })}</td>
                    <td className="px-3 py-2 font-medium">{i.siteName}</td>
                    <td className="px-3 py-2 text-ink-2">{i.type.replace("_", " ")}</td>
                    <td className="px-3 py-2"><span className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", SEVERITY_BADGE[i.severity])}>{i.severity}</span></td>
                    <td className="px-3 py-2 text-right tabular-nums">{i.victimsCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{i.workdaysLost}</td>
                    <td className="px-3 py-2 text-ink-2">{i.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {data.incidents.map((i) => (
              <div key={i.id} className={clsx(
                "rounded-lg border border-l-[4px] p-3",
                i.severity === "CRITICAL" || i.severity === "HIGH" ? "border-l-rose-500 bg-rose-50/40"
                  : i.severity === "MEDIUM" ? "border-l-amber-500 bg-amber-50/40"
                  : "border-l-emerald-500 bg-emerald-50/40",
              )}>
                <div className="flex justify-between gap-2">
                  <div className="font-semibold text-ink">{i.siteName}</div>
                  <span className={clsx("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", SEVERITY_BADGE[i.severity])}>{i.severity}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-ink-3">{format(new Date(i.occurredAt), "dd MMM yyyy", { locale: fr })} · {i.type}</div>
                <p className="mt-1 text-[11.5px] text-ink-2">{i.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "audits" && (
        <div className="rounded-xl border border-line bg-white">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date prévue</th>
                <th className="px-3 py-2 text-left font-medium">Chantier</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-right font-medium">Score</th>
                <th className="px-3 py-2 text-left font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.audits.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="px-3 py-2 text-ink-2">{format(new Date(a.scheduledAt), "dd/MM/yy", { locale: fr })}</td>
                  <td className="px-3 py-2 font-medium">{a.siteName}</td>
                  <td className="px-3 py-2 text-ink-2">{a.auditType.replace("_", " ")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.score ? `${Math.round(a.score)}/100` : "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{a.completedAt ? "Réalisé" : "Planifié"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ncs" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] text-ink-3">
              {data.ncs.length} non-conformité{data.ncs.length > 1 ? "s" : ""} · {data.ncs.filter((n) => n.status !== "CLOSED").length} en cours
            </p>
            {canEdit && (
              <button type="button" onClick={() => setNcDraft({ ...DEFAULT_NC_DRAFT })} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700">
                <Plus className="h-3.5 w-3.5" /> Déclarer une NC
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-white">
            {data.ncs.length === 0 ? (
              <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune non-conformité enregistrée pour l&apos;instant.</p>
            ) : (
              <table className="w-full text-[12.5px]">
                <thead className="bg-surface-alt text-[11px] uppercase text-ink-3">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Chantier</th>
                    <th className="px-3 py-2 text-left font-medium">Catégorie</th>
                    <th className="px-3 py-2 text-left font-medium">Criticité</th>
                    <th className="px-3 py-2 text-left font-medium">Description / solution</th>
                    <th className="px-3 py-2 text-left font-medium">Resp.</th>
                    <th className="px-3 py-2 text-left font-medium">Échéance</th>
                    <th className="px-3 py-2 text-left font-medium">Statut</th>
                    {canEdit && <th className="px-3 py-2 text-right font-medium">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.ncs.map((n) => (
                    <tr key={n.id} className="border-t border-line align-top">
                      <td className="px-3 py-2 font-mono text-[11.5px]">{n.site}</td>
                      <td className="px-3 py-2 text-ink-2">{n.category}</td>
                      <td className="px-3 py-2"><span className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", NC_CRIT_BADGE[n.criticality])}>{n.criticality}</span></td>
                      <td className="px-3 py-2 text-ink-2">
                        <div className="whitespace-pre-wrap">{n.description}</div>
                        {n.correctiveAction ? (
                          <div className="mt-1 whitespace-pre-wrap text-[11.5px] text-emerald-700"><strong>Solution :</strong> {n.correctiveAction}</div>
                        ) : (
                          <div className="mt-1 text-[11px] italic text-amber-700">Action corrective à définir</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[11.5px] text-ink-3">{n.owner ?? "—"}</td>
                      <td className="px-3 py-2 text-ink-2">{n.dueDate ? format(new Date(n.dueDate), "dd/MM/yy", { locale: fr }) : "—"}</td>
                      <td className="px-3 py-2">
                        <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-medium", n.status === "CLOSED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>{n.status}</span>
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => setNcDraft({
                            id: n.id,
                            siteId: n.siteId ?? "",
                            category: n.category as NcDraft["category"],
                            criticality: n.criticality as NcDraft["criticality"],
                            description: n.description,
                            correctiveAction: n.correctiveAction,
                            ownerId: n.ownerId,
                            dueDate: n.dueDate,
                            status: n.status as NcDraft["status"],
                          })} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11.5px] text-ink-2 hover:bg-surface-alt">
                            <Pencil className="h-3 w-3" /> Modifier
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {ncDraft && canEdit && (
        <NcEditorModal
          initial={ncDraft}
          sites={data.sites}
          staff={data.staff}
          invalidateKeys={[["dt", "qhse"], ["sg", "site-synthesis"]]}
          onClose={() => setNcDraft(null)}
        />
      )}

      {tab === "certs" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.certifications.map((c) => {
            const valid = new Date(c.validUntil) > new Date();
            return (
              <div key={c.id} className="rounded-xl border border-line bg-white p-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <ShieldCheck className="h-3 w-3" /> {valid ? "Valide" : "Expirée"}
                </div>
                <h3 className="mt-2 text-[14px] font-bold text-ink">{c.standard}</h3>
                <p className="text-[11.5px] text-ink-3">{c.scope ?? ""}</p>
                <dl className="mt-2 space-y-1 text-[11.5px]">
                  <div className="flex justify-between"><dt className="text-ink-3">Organisme</dt><dd className="font-medium">{c.issuedBy}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-3">Valide jusqu&apos;au</dt><dd className="font-medium">{format(new Date(c.validUntil), "dd MMM yyyy", { locale: fr })}</dd></div>
                  {c.surveillanceAuditDate && (
                    <div className="flex justify-between"><dt className="text-ink-3">Audit surveillance</dt><dd className="font-medium">{format(new Date(c.surveillanceAuditDate), "dd MMM yyyy", { locale: fr })}</dd></div>
                  )}
                  <div className="flex justify-between"><dt className="text-ink-3">NC ouvertes</dt><dd className="font-medium tabular-nums">{c.openNcCount}</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DashCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <h3 className="text-[12px] font-semibold uppercase text-ink-3">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-[12px]">{children}</ul>
    </div>
  );
}
