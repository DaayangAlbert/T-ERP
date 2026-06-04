"use client";

import { clsx } from "clsx";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileType,
  File as FileIcon,
  Share2,
  Download,
  Tags,
  AlertCircle,
} from "lucide-react";
import type { GedDocument } from "@/hooks/useGedDocuments";

interface Props {
  documents: GedDocument[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onClassify: (doc: GedDocument) => void;
  onShare: (doc: GedDocument) => void;
  isLoading: boolean;
}

function iconForMime(mime: string): typeof FileText {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("pdf")) return FileType;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return FileSpreadsheet;
  if (mime.includes("word") || mime === "text/plain") return FileText;
  return FileIcon;
}

function fmtSize(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} Mo`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(0)} Ko`;
  return `${b} o`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CONF_TONE: Record<string, string> = {
  PUBLIC: "bg-slate-100 text-slate-700",
  INTERNAL: "bg-violet-100 text-violet-800",
  RESTRICTED: "bg-amber-100 text-amber-800",
  CONFIDENTIAL: "bg-rose-100 text-rose-800",
};

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  REVIEW: "bg-sky-100 text-sky-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-zinc-100 text-zinc-700",
  EXPIRED: "bg-rose-100 text-rose-700",
};

export function DocumentsTable({
  documents,
  selectedIds,
  onToggle,
  onToggleAll,
  onClassify,
  onShare,
  isLoading,
}: Props) {
  if (isLoading && documents.length === 0) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-ink-3">
        <FileIcon className="h-10 w-10 opacity-30" />
        <p className="text-[13px]">Aucun document dans cette sélection.</p>
      </div>
    );
  }

  const allSelected =
    documents.length > 0 && documents.every((d) => selectedIds.has(d.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="sticky top-0 bg-surface-alt text-[11px] uppercase tracking-wider text-ink-3">
          <tr>
            <th className="w-10 px-3 py-2 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Tout sélectionner"
              />
            </th>
            <th className="px-2 py-2 text-left font-semibold">Document</th>
            <th className="hidden px-2 py-2 text-left font-semibold lg:table-cell">
              Classification
            </th>
            <th className="hidden px-2 py-2 text-left font-semibold lg:table-cell">Espace</th>
            <th className="hidden px-2 py-2 text-left font-semibold md:table-cell">Auteur</th>
            <th className="hidden px-2 py-2 text-left font-semibold xl:table-cell">Chantier</th>
            <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell">Taille</th>
            <th className="hidden px-2 py-2 text-left font-semibold md:table-cell">Date</th>
            <th className="px-2 py-2 text-center font-semibold">Statut</th>
            <th className="w-20 px-2 py-2 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {documents.map((d) => {
            const Icon = iconForMime(d.mimeType);
            const checked = selectedIds.has(d.id);
            const needsClassif = !d.classificationId || !d.spaceId;
            return (
              <tr
                key={d.id}
                className={clsx("hover:bg-surface-alt/40", checked && "bg-violet-50/60")}
              >
                <td className="px-3 py-2 align-middle">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(d.id)}
                    aria-label={`Sélectionner ${d.name}`}
                  />
                </td>
                <td className="px-2 py-2 align-middle">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-ink-3" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-ink" title={d.name}>
                          {d.name}
                        </span>
                        {needsClassif && (
                          <span title="À classer">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          </span>
                        )}
                      </div>
                      {d.internalReference && (
                        <div className="font-mono text-[10.5px] text-ink-3">
                          {d.internalReference}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden px-2 py-2 align-middle text-ink-2 lg:table-cell">
                  {d.classificationName ? (
                    <div className="flex flex-col">
                      <span className="font-mono text-[10.5px] font-semibold text-violet-700">
                        {d.classificationPrefix}
                      </span>
                      <span className="truncate" title={d.classificationName}>
                        {d.classificationName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-amber-600">— à classer —</span>
                  )}
                </td>
                <td className="hidden px-2 py-2 align-middle text-ink-2 lg:table-cell">
                  {d.spaceName ? (
                    <span className="inline-flex items-center gap-1">
                      <span>{d.spaceIcon ?? "📁"}</span>
                      <span className="truncate">{d.spaceName}</span>
                    </span>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className="hidden px-2 py-2 align-middle md:table-cell">
                  <div className="text-ink-2">{d.authorName}</div>
                  {d.authorRole && (
                    <div className="text-[10.5px] text-ink-3">{d.authorRole}</div>
                  )}
                </td>
                <td className="hidden px-2 py-2 align-middle text-ink-2 xl:table-cell">
                  {d.siteCode ? (
                    <div className="flex flex-col">
                      <span className="font-mono text-[10.5px]">{d.siteCode}</span>
                      <span className="truncate text-[11px] text-ink-3">{d.siteName}</span>
                    </div>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className="hidden px-2 py-2 text-right align-middle font-mono text-[11px] text-ink-3 sm:table-cell">
                  {fmtSize(d.sizeBytes)}
                </td>
                <td className="hidden px-2 py-2 align-middle text-ink-3 md:table-cell">
                  {fmtDate(d.createdAt)}
                </td>
                <td className="px-2 py-2 align-middle text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className={clsx(
                        "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        STATUS_TONE[d.status] ?? "bg-slate-100 text-slate-700",
                      )}
                    >
                      {d.status}
                    </span>
                    <span
                      className={clsx(
                        "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        CONF_TONE[d.confidentiality] ?? "bg-slate-100 text-slate-700",
                      )}
                    >
                      {d.confidentiality}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right align-middle">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onClassify(d)}
                      className="grid h-7 w-7 place-items-center rounded-md text-violet-600 hover:bg-violet-50"
                      aria-label="Classer"
                      title="Classer ce document"
                    >
                      <Tags className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onShare(d)}
                      className="grid h-7 w-7 place-items-center rounded-md text-emerald-600 hover:bg-emerald-50"
                      aria-label="Partager"
                      title="Partager via la messagerie"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={d.url}
                      download={d.name}
                      className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
                      aria-label="Télécharger"
                      title="Télécharger le document"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
