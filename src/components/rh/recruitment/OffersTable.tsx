"use client";

import { Building2, MapPin, Pencil, Send, Ban, RotateCcw, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { OfferRow } from "@/hooks/useRhRecruitment";

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  CLOSED: "Fermée",
  ARCHIVED: "Archivée",
};

function statusBadge(s: string): string {
  if (s === "PUBLISHED") return "bg-emerald-100 text-emerald-800";
  if (s === "DRAFT") return "bg-surface-alt text-ink-3";
  if (s === "CLOSED") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-800";
}

export interface OffersTableHandlers {
  onEdit: (id: string) => void;
  onPublish: (id: string) => void;
  onClose: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (o: OfferRow) => void;
}

export function OffersTable({
  items,
  handlers,
}: {
  items: OfferRow[];
  handlers?: OffersTableHandlers;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface-alt p-6 text-center text-[12.5px] text-ink-3">
        Aucune offre. Créez votre première offre d&apos;emploi.
      </div>
    );
  }

  return (
    <>
      {/* Desktop : table */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Référence</th>
              <th className="px-3 py-2 text-left">Poste</th>
              <th className="px-3 py-2 text-left">Contrat</th>
              <th className="px-3 py-2 text-right">Postes</th>
              <th className="px-3 py-2 text-right">Candid.</th>
              <th className="px-3 py-2 text-left">Publié</th>
              <th className="px-3 py-2 text-left">Statut</th>
              {handlers && <th className="px-3 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((o) => (
              <tr key={o.id} className="hover:bg-surface-alt/40">
                <td className="px-3 py-2 font-mono text-[11.5px] text-ink-3">{o.reference}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-ink">{o.title}</div>
                  <div className="text-[11px] text-ink-3">{o.department}</div>
                </td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{o.contractType}</td>
                <td className="px-3 py-2 text-right font-mono text-[12px] text-ink">{o.positions}</td>
                <td className="px-3 py-2 text-right font-mono text-[12px] text-ink">{o.applicationsCount}</td>
                <td className="px-3 py-2 text-[11.5px] text-ink-3">{fmtDate(o.publishedAt)}</td>
                <td className="px-3 py-2">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", statusBadge(o.status))}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </td>
                {handlers && (
                  <td className="px-3 py-2">
                    <RowActions o={o} h={handlers} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <ul className="space-y-2 md:hidden">
        {items.map((o) => (
          <li key={o.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10.5px] text-ink-3">{o.reference}</div>
                <div className="text-[13px] font-semibold text-ink">{o.title}</div>
                <div className="mt-0.5 text-[11.5px] text-ink-3">
                  <Building2 className="mr-1 inline h-3 w-3" /> {o.department}
                </div>
              </div>
              <span className={clsx("flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", statusBadge(o.status))}>
                {STATUS_LABEL[o.status] ?? o.status}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center">
              <div>
                <div className="text-[10px] uppercase text-ink-3">Postes</div>
                <div className="font-mono text-[12px] font-bold text-ink">{o.positions}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-ink-3">Candid.</div>
                <div className="font-mono text-[12px] font-bold text-ink">{o.applicationsCount}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-ink-3">Région</div>
                <div className="text-[11.5px] text-ink">
                  <MapPin className="mr-0.5 inline h-2.5 w-2.5" />
                  {o.region}
                </div>
              </div>
            </div>
            {handlers && (
              <div className="mt-2 border-t border-line pt-2">
                <RowActions o={o} h={handlers} mobile />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function RowActions({ o, h, mobile }: { o: OfferRow; h: OffersTableHandlers; mobile?: boolean }) {
  const btn = mobile
    ? "inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11.5px] font-medium"
    : "grid h-7 w-7 place-items-center rounded";
  return (
    <div className={clsx("flex items-center gap-1", !mobile && "justify-end")}>
      <button type="button" onClick={() => h.onEdit(o.id)} title="Modifier" className={clsx(btn, "text-ink-3 hover:bg-surface-alt hover:text-primary-700")}>
        <Pencil className="h-3.5 w-3.5" /> {mobile && "Éditer"}
      </button>
      {o.status === "PUBLISHED" ? (
        <button type="button" onClick={() => h.onClose(o.id)} title="Fermer" className={clsx(btn, "text-ink-3 hover:bg-rose-50 hover:text-rose-600")}>
          <Ban className="h-3.5 w-3.5" /> {mobile && "Fermer"}
        </button>
      ) : o.status === "DRAFT" ? (
        <button type="button" onClick={() => h.onPublish(o.id)} title="Publier" className={clsx(btn, "text-ink-3 hover:bg-emerald-50 hover:text-emerald-700")}>
          <Send className="h-3.5 w-3.5" /> {mobile && "Publier"}
        </button>
      ) : (
        <button type="button" onClick={() => h.onReopen(o.id)} title="Republier" className={clsx(btn, "text-ink-3 hover:bg-emerald-50 hover:text-emerald-700")}>
          <RotateCcw className="h-3.5 w-3.5" /> {mobile && "Republier"}
        </button>
      )}
      {o.applicationsCount === 0 && (
        <button type="button" onClick={() => h.onDelete(o)} title="Supprimer" className={clsx(btn, "text-ink-3 hover:bg-rose-50 hover:text-rose-600")}>
          <Trash2 className="h-3.5 w-3.5" /> {mobile && "Suppr."}
        </button>
      )}
    </div>
  );
}
