"use client";

import { useState } from "react";
import { MessageSquare, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useCommentVariance, type VarianceItem, type VarianceTotals } from "@/hooks/useDafFinance";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";

const THRESHOLD_PERCENT = 5; // au-delà de ±5% on déclenche l'alerte visuelle

function fmt(amount: string): string {
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

function severity(percent: number): "danger" | "warn" | "ok" {
  const abs = Math.abs(percent);
  if (abs >= THRESHOLD_PERCENT * 2) return "danger";
  if (abs >= THRESHOLD_PERCENT) return "warn";
  return "ok";
}

function severityClasses(s: ReturnType<typeof severity>) {
  if (s === "danger") return { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", bar: "bg-rose-500" };
  if (s === "warn") return { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", bar: "bg-amber-500" };
  return { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500" };
}

function VarianceBar({ percent }: { percent: number }) {
  const sev = severity(percent);
  const cls = severityClasses(sev);
  const width = Math.min(Math.abs(percent) * 4, 100);
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line">
      <div className={clsx("h-full transition-all", cls.bar)} style={{ width: `${width}%` }} />
    </div>
  );
}

function CommentDialog({ item, onClose }: { item: VarianceItem; onClose: () => void }) {
  const [text, setText] = useState(item.comment ?? "");
  const mut = useCommentVariance();
  // Commentaire de variance : édition autorisée pour FULL sur DAF.
  const canEdit = useAccess(MODULES.DAF).canEdit;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-ink">Commentaire DAF</h3>
          <p className="text-[12px] text-ink-3">{item.costCenter}</p>
        </header>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          disabled={!canEdit}
          className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-500 focus:outline-none disabled:bg-surface-alt"
          placeholder="Commenter cet écart..."
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt"
          >
            Fermer
          </button>
          {canEdit && (
            <button
              type="button"
              disabled={!text.trim() || mut.isPending}
              onClick={() => {
                mut.mutate(
                  { id: item.id, comment: text.trim() },
                  { onSuccess: onClose }
                );
              }}
              className="h-8 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {mut.isPending ? "Enregistrement..." : "Enregistrer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function VariancesTable({ items, totals }: { items: VarianceItem[]; totals: VarianceTotals }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<VarianceItem | null>(null);

  return (
    <>
      {/* Desktop / tablette : tableau classique */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="w-8 px-3 py-2"></th>
              <th className="px-3 py-2 text-left">Poste de coût</th>
              <th className="px-3 py-2 text-right">Budget</th>
              <th className="px-3 py-2 text-right">Réalisé</th>
              <th className="px-3 py-2 text-right">Écart</th>
              <th className="px-3 py-2 text-right">%</th>
              <th className="px-3 py-2 text-center">Visualisation</th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((it) => {
              const sev = severity(it.variancePercent);
              const cls = severityClasses(sev);
              const isOpen = expanded === it.id;
              return (
                <>
                  <tr key={it.id} className="hover:bg-surface-alt/40">
                    <td className="px-3 py-2 align-middle">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : it.id)}
                        className="grid h-6 w-6 place-items-center rounded text-ink-3 hover:bg-surface-alt"
                        aria-label="Drill-down"
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-medium text-ink">{it.costCenter}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(it.budgetAmount)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(it.actualAmount)}</td>
                    <td className={clsx("px-3 py-2 text-right font-mono font-semibold", cls.text)}>
                      {Number(it.variance) > 0 ? "+" : ""}
                      {fmt(it.variance)}
                    </td>
                    <td className={clsx("px-3 py-2 text-right font-mono font-semibold", cls.text)}>
                      <span className={clsx("inline-flex items-center gap-1", sev !== "ok" && "")}>
                        {sev === "danger" && <AlertTriangle className="h-3 w-3" />}
                        {it.variancePercent > 0 ? "+" : ""}
                        {it.variancePercent.toFixed(1)} %
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <VarianceBar percent={it.variancePercent} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setCommentTarget(it)}
                        className={clsx(
                          "grid h-7 w-7 place-items-center rounded hover:bg-surface-alt",
                          it.comment ? "text-primary-600" : "text-ink-3"
                        )}
                        title={it.comment ?? "Commenter"}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${it.id}-detail`} className="bg-surface-alt/40">
                      <td></td>
                      <td colSpan={7} className="px-4 py-3 text-[12px] text-ink-3">
                        <div className="space-y-1">
                          <div>
                            Décomposition principale (synthétique) : top 3 fournisseurs / chantiers contributeurs à l&apos;écart.
                          </div>
                          {it.comment && (
                            <div className={clsx("mt-2 rounded-md p-2", cls.bg)}>
                              <span className="font-semibold text-ink">Note DAF :</span>{" "}
                              <span className="text-ink">{it.comment}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            <tr className="bg-surface-alt font-semibold text-ink">
              <td></td>
              <td className="px-3 py-2">TOTAL</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(totals.budget)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(totals.actual)}</td>
              <td className={clsx("px-3 py-2 text-right font-mono", severityClasses(severity(totals.variancePercent)).text)}>
                {Number(totals.variance) > 0 ? "+" : ""}
                {fmt(totals.variance)}
              </td>
              <td className={clsx("px-3 py-2 text-right font-mono", severityClasses(severity(totals.variancePercent)).text)}>
                {totals.variancePercent > 0 ? "+" : ""}
                {totals.variancePercent.toFixed(1)} %
              </td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile : cards par poste */}
      <div className="space-y-2 md:hidden">
        {items.map((it) => {
          const sev = severity(it.variancePercent);
          const cls = severityClasses(sev);
          const sign = Number(it.variance) > 0 ? "+" : "";
          return (
            <div key={it.id} className="rounded-xl border border-line bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">{it.costCenter}</div>
                </div>
                <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", cls.bg, cls.text)}>
                  {sign}
                  {it.variancePercent.toFixed(1)} %
                </span>
              </div>
              <div className="mt-2 space-y-1 text-[12px] text-ink-3">
                <div className="flex items-center justify-between">
                  <span>Budget</span>
                  <span className="font-mono text-ink">{fmt(it.budgetAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Réalisé</span>
                  <span className="font-mono text-ink">{fmt(it.actualAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Écart</span>
                  <span className={clsx("font-mono font-semibold", cls.text)}>
                    {sign}
                    {fmt(it.variance)}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <VarianceBar percent={it.variancePercent} />
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCommentTarget(it)}
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-md border border-line bg-white px-2.5 py-1 text-[11.5px] font-medium hover:bg-surface-alt",
                    it.comment ? "text-primary-600" : "text-ink-3"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {it.comment ? "Voir note" : "Commenter"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {commentTarget && <CommentDialog item={commentTarget} onClose={() => setCommentTarget(null)} />}
    </>
  );
}
