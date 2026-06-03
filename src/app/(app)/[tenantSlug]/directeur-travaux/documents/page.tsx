"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Map,
  Image as ImageIcon,
  FileCheck2,
  ShieldAlert,
  Mail,
  FileText,
  Search,
} from "lucide-react";
import { clsx } from "clsx";
import { useChantier } from "@/contexts/ChantierContext";
import { PhotoCaptureButton } from "@/components/dtrav/documents/PhotoCaptureButton";
import { PageHelp } from "@/components/help/PageHelp";
import { DtravDocumentsTutorial } from "@/components/help/tutorials/DtravDocumentsTutorial";

interface Document {
  id: string;
  category: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl: string | null;
  uploadedBy: { firstName: string; lastName: string } | null;
  uploadedAt: string;
  tags: string[];
}

const CATEGORIES: Array<{ key: string; label: string; icon: typeof Map; color: string }> = [
  { key: "EXECUTION_PLANS", label: "Plans", icon: Map, color: "text-primary-600" },
  { key: "FIELD_PHOTOS", label: "Photos terrain", icon: ImageIcon, color: "text-warning" },
  { key: "RECEPTION_PV", label: "PV réception", icon: FileCheck2, color: "text-success" },
  { key: "HSE_REPORTS", label: "Rapports HSE", icon: ShieldAlert, color: "text-danger" },
  { key: "MOA_CORRESPONDENCE", label: "Courriers MOA", icon: Mail, color: "text-primary-700" },
  { key: "CONTRACT_AMENDMENTS", label: "Marché", icon: FileText, color: "text-ink-2" },
];

export default function DocumentsPage() {
  const { activeChantierId, activeChantier } = useChantier();
  const qc = useQueryClient();
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "documents", activeChantierId, category, search],
    enabled: !!activeChantierId,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      const res = await fetch(`/api/dtrav/sites/${activeChantierId}/documents?${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Document[]; countsByCategory: Record<string, number> }>;
    },
  });

  return (
    <div id="screen-dtrav-documents" className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Documents chantier</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {activeChantier?.code} — GED filtrée, capture photo terrain.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeChantierId && (
            <PhotoCaptureButton
              siteId={activeChantierId}
              onUploaded={() => qc.invalidateQueries({ queryKey: ["dtrav", "documents"] })}
            />
          )}
          <PageHelp title="Aide — Documents chantier"><DtravDocumentsTutorial /></PageHelp>
        </div>
      </header>

      <section
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const count = data?.countsByCategory[c.key] ?? 0;
          const active = category === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(active ? null : c.key)}
              style={{ minHeight: 72 }}
              className={clsx(
                "flex flex-col items-start gap-1 rounded-xl border bg-white p-3 text-left shadow-card transition",
                active
                  ? "border-primary-500 ring-1 ring-primary-300"
                  : "border-line hover:border-primary-300"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <Icon className={clsx("h-4 w-4", c.color)} />
                <span className="text-2xl font-bold text-ink">{count}</span>
              </div>
              <span className="text-[12.5px] font-medium text-ink-2">{c.label}</span>
            </button>
          );
        })}
      </section>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans le contenu, le titre, les tags…"
            style={{ minHeight: 40 }}
            className="w-full rounded-md border border-line bg-white pl-8 pr-2 text-[13px]"
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          {category ? `${CATEGORIES.find((c) => c.key === category)?.label} (${data?.items.length ?? 0})` : "Documents récents"}
        </h2>
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucun document.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.items.map((d) => (
              <li
                key={d.id}
                style={{ minHeight: 56 }}
                className="flex items-center gap-3 p-3 text-[12.5px]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-50 text-[11px] font-bold uppercase text-primary-700">
                  {extLabel(d.fileName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink">{d.title}</div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    {d.uploadedBy ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}` : "—"} ·{" "}
                    {new Date(d.uploadedAt).toLocaleDateString("fr-FR")} ·{" "}
                    {(d.fileSize / 1024).toFixed(0)} ko
                  </div>
                </div>
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ minHeight: 36 }}
                  className="inline-flex items-center rounded-md border border-line px-2 text-[11.5px] font-medium text-ink-2 hover:border-primary-300"
                >
                  Ouvrir
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function extLabel(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "JPG";
  if (["pdf"].includes(ext)) return "PDF";
  if (["dwg", "dxf"].includes(ext)) return "DWG";
  if (["xls", "xlsx", "csv"].includes(ext)) return "XLS";
  return ext.toUpperCase() || "DOC";
}
