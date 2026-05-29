"use client";

import { useMemo, useState } from "react";
import { Plus, Paperclip } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCptEntries, useValidateEntry } from "@/hooks/useCptEntries";
import { JournalSelector } from "@/components/comptable/entries/JournalSelector";
import { EntryFormModal } from "@/components/comptable/entries/EntryFormModal";

export default function ComptableEntriesPage() {
  const [journal, setJournal] = useState("ACH");
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useCptEntries(journal, period);
  const validate = useValidateEntry();

  const sitesQuery = useQuery({
    queryKey: ["comptable", "sites-scope"],
    queryFn: async () => {
      const res = await fetch("/api/sites", { credentials: "same-origin" });
      if (!res.ok) return { items: [] };
      return res.json() as Promise<{ items: Array<{ id: string; code: string; name: string }> }>;
    },
  });

  const isSiteAccountant = data?.scope?.isDirection === false;
  const allowedSites = useMemo(() => {
    const all = sitesQuery.data?.items ?? [];
    if (!data?.scope) return all;
    if (data.scope.isDirection) return all;
    return all.filter((s) => data.scope.siteIds?.includes(s.id));
  }, [sitesQuery.data, data?.scope]);

  const monthCount = data?.items.length ?? 0;
  const draftCount = data?.items.filter((e) => e.status === "DRAFT").length ?? 0;
  const validatedCount = data?.items.filter((e) => e.status === "VALIDATED").length ?? 0;
  const totalAmount = data?.items.reduce((s, e) => s + e.totalDebit, 0) ?? 0;

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-ecritures">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Saisie d'écritures</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Journaux comptables SYSCOHADA — équilibre débit/crédit en temps réel.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvelle écriture
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <JournalSelector value={journal} onChange={setJournal} isSiteAccountant={isSiteAccountant} />
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2 text-[13px]"
        />
      </div>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Écritures du mois" value={monthCount.toString()} />
        <Kpi label="En brouillard" value={draftCount.toString()} accent="warning" />
        <Kpi label="Validées" value={validatedCount.toString()} accent="success" />
        <Kpi label="Montant cumulé" value={`${new Intl.NumberFormat("fr-FR").format(Math.round(totalAmount))} FCFA`} />
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Référence</th>
                    <th className="px-3 py-2">Libellé</th>
                    {!isSiteAccountant && <th className="px-3 py-2">Chantier</th>}
                    <th className="px-3 py-2 text-right">Débit</th>
                    <th className="px-3 py-2 text-right">Crédit</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Pièce</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((e) => (
                    <tr key={e.id} className="border-b border-line">
                      <td className="px-3 py-2 text-ink-3">
                        {new Date(e.entryDate).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-3 py-2 font-medium text-ink">{e.reference}</td>
                      <td className="px-3 py-2 text-ink-2">{e.description}</td>
                      {!isSiteAccountant && (
                        <td className="px-3 py-2 text-ink-3">{e.site?.code ?? "—"}</td>
                      )}
                      <td className="px-3 py-2 text-right tabular-nums">
                        {e.totalDebit.toLocaleString("fr-FR")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {e.totalCredit.toLocaleString("fr-FR")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            e.status === "VALIDATED"
                              ? "rounded bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success"
                              : e.status === "CANCELLED"
                                ? "rounded bg-ink-3/10 px-2 py-0.5 text-[11px] font-medium text-ink-3"
                                : "rounded bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning"
                          }
                        >
                          {e.status === "VALIDATED" ? "Validée" : e.status === "CANCELLED" ? "Annulée" : "Brouillard"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {e.attachmentUrl ? (
                          <a
                            href={`/api/comptable/entries/${e.id}/attachment`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={e.attachmentName ?? "Justificatif"}
                            className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-ink-2 hover:border-primary-300 hover:text-primary-700"
                          >
                            <Paperclip className="h-3.5 w-3.5" /> Voir
                          </a>
                        ) : (
                          <span className="text-[11px] text-ink-3">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {e.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={() => validate.mutate(e.id)}
                            className="text-[11.5px] font-medium text-primary-700 hover:underline"
                          >
                            Valider
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-line bg-surface-alt text-[12px] font-medium">
                  <tr>
                    <td colSpan={isSiteAccountant ? 3 : 4} className="px-3 py-2 text-right uppercase tracking-wider text-ink-3">
                      Total période
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {(data?.totals.debit ?? 0).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {(data?.totals.credit ?? 0).toLocaleString("fr-FR")}
                    </td>
                    <td colSpan={3} className={data?.totals.balanced ? "text-success" : "text-danger"}>
                      {data?.totals.balanced ? "✓ Équilibré" : "✗ Déséquilibre"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="space-y-2 p-3 md:hidden">
              {data?.items.map((e) => (
                <div key={e.id} className="rounded-lg border border-line bg-white p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-ink">{e.reference}</div>
                      <div className="text-[11.5px] text-ink-3">
                        {new Date(e.entryDate).toLocaleDateString("fr-FR")} · {e.site?.code ?? "siège"}
                      </div>
                    </div>
                    <span
                      className={
                        e.status === "VALIDATED"
                          ? "rounded bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success"
                          : "rounded bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning"
                      }
                    >
                      {e.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-2">{e.description}</p>
                  <div className="mt-2 flex items-center justify-between text-[12px]">
                    <span className="text-ink-3">D : {e.totalDebit.toLocaleString("fr-FR")}</span>
                    <span className="text-ink-3">C : {e.totalCredit.toLocaleString("fr-FR")}</span>
                  </div>
                  {e.attachmentUrl && (
                    <a
                      href={`/api/comptable/entries/${e.id}/attachment`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11.5px] text-ink-2"
                    >
                      <Paperclip className="h-3.5 w-3.5" /> Justificatif
                    </a>
                  )}
                </div>
              ))}
              {data?.items.length === 0 && (
                <p className="py-6 text-center text-[12.5px] text-ink-3">Aucune écriture sur la période.</p>
              )}
            </div>
          </>
        )}
      </section>

      <EntryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        journalCode={journal}
        isSiteAccountant={isSiteAccountant}
        availableSites={allowedSites}
      />
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
      <div
        className={
          accent === "success"
            ? "mt-1 text-2xl font-bold text-success"
            : accent === "warning"
              ? "mt-1 text-2xl font-bold text-warning"
              : "mt-1 text-2xl font-bold text-ink"
        }
      >
        {value}
      </div>
    </div>
  );
}
