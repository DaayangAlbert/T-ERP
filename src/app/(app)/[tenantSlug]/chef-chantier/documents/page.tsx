"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  FileText,
  Folder,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import type { DocumentCategory } from "@prisma/client";
import {
  DOCUMENT_CATEGORY_LABEL,
  DOCUMENT_CATEGORY_GROUPS,
} from "@/schemas/site-document";
import { formatFCFA } from "@/lib/format";

interface DocItem {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  subCategory: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  referenceNumber: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  amount: number | null;
  relatedPartyName: string | null;
  archived: boolean;
  archivedAt: string | null;
  tags: string[];
  uploadedAt: string;
  uploadedBy: string;
  site: { id: string; code: string; name: string };
}

interface Response {
  items: DocItem[];
  summary: {
    totalActive: number;
    totalArchived: number;
    expiringSoon: number;
    expired: number;
    totalGuaranteesValue: number;
  };
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function CcDocumentsPage() {
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<DocItem | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (showArchived) sp.set("archived", "true");
    else sp.set("archived", "false");
    if (search.trim()) sp.set("search", search.trim());
    return sp.toString();
  }, [showArchived, search]);

  const { data, isLoading } = useQuery({
    queryKey: ["cc", "documents", showArchived, search],
    queryFn: async (): Promise<Response> => {
      const res = await fetch(`/api/cc/documents?${qs}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const archive = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const res = await fetch(`/api/cc/documents/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: (_, vars) => {
      setFeedback({ tone: "ok", msg: vars.archived ? "Document réduit (archivé)" : "Document restauré" });
      qc.invalidateQueries({ queryKey: ["cc", "documents"] });
    },
    onError: (e: Error) => setFeedback({ tone: "err", msg: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("Supprimer définitivement ce document ? Cette action est irréversible.")) {
        throw new Error("Annulé");
      }
      const res = await fetch(`/api/cc/documents/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      setFeedback({ tone: "ok", msg: "Document supprimé" });
      qc.invalidateQueries({ queryKey: ["cc", "documents"] });
    },
    onError: (e: Error) => {
      if (e.message !== "Annulé") setFeedback({ tone: "err", msg: e.message });
    },
  });

  // Regroupe les items par catégorie puis par grand groupe
  const grouped = useMemo(() => {
    if (!data) return [];
    const byCat = new Map<DocumentCategory, DocItem[]>();
    for (const d of data.items) {
      if (!byCat.has(d.category)) byCat.set(d.category, []);
      byCat.get(d.category)!.push(d);
    }
    return DOCUMENT_CATEGORY_GROUPS.map((g) => ({
      ...g,
      catItems: g.categories.map((c) => ({ cat: c, items: byCat.get(c) ?? [] })).filter((c) => c.items.length > 0),
    })).filter((g) => g.catItems.length > 0);
  }, [data]);

  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Documents chantier</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            PV de réunion, correspondances, cautions bancaires, assurances,
            décomptes, plans et autres documents — classés par catégorie.
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary-500 px-3 py-2 text-[13px] font-medium text-white hover:bg-primary-600"
        >
          <Upload className="h-4 w-4" /> Téléverser un document
        </button>
      </header>

      {feedback && (
        <div
          className={clsx(
            "mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-[12.5px]",
            feedback.tone === "ok"
              ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border border-danger/30 bg-danger/5 text-danger",
          )}
        >
          {feedback.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <div className="flex-1">{feedback.msg}</div>
          <button onClick={() => setFeedback(null)} aria-label="Fermer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPIs */}
      {data && (
        <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi icon={<Folder className="h-4 w-4" />} label="Documents actifs" value={data.summary.totalActive.toString()} />
          <Kpi
            icon={<Wallet className="h-4 w-4" />}
            label="Valeur cautions"
            value={`${(data.summary.totalGuaranteesValue / 1_000_000).toFixed(1)} M`}
            unit="FCFA"
            tone="primary"
          />
          <Kpi
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Expire < 30j"
            value={data.summary.expiringSoon.toString()}
            tone={data.summary.expiringSoon > 0 ? "warning" : "default"}
          />
          <Kpi
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Expirés"
            value={data.summary.expired.toString()}
            tone={data.summary.expired > 0 ? "danger" : "default"}
          />
        </section>
      )}

      {/* Barre filtres */}
      <section className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-white p-3">
        <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-md border border-line bg-surface-alt px-2">
          <Search className="h-3.5 w-3.5 text-ink-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (titre, n° pièce, partie)…"
            className="h-8 flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
        </div>
        <label className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[12.5px] text-ink hover:bg-surface-alt">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary-500"
          />
          Voir archivés uniquement
        </label>
      </section>

      {isLoading && <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />}

      {!isLoading && grouped.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-surface-alt p-8 text-center">
          <Folder className="mx-auto h-8 w-8 text-ink-3" />
          <h3 className="mt-2 text-sm font-semibold text-ink">
            {showArchived ? "Aucun document archivé" : "Aucun document"}
          </h3>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {showArchived
              ? "Vous n'avez réduit aucun document pour l'instant."
              : "Commencez par téléverser un document de votre chantier."}
          </p>
        </div>
      )}

      {/* Groupes catégorisés */}
      {!isLoading && grouped.length > 0 && (
        <div className="space-y-3">
          {grouped.map((g) => {
            const totalItems = g.catItems.reduce((acc, c) => acc + c.items.length, 0);
            const isCollapsed = collapsedGroups.has(g.key);
            return (
              <section key={g.key} className="overflow-hidden rounded-xl border border-line bg-white">
                <header
                  className="flex cursor-pointer items-center justify-between gap-2 border-b border-line bg-surface-alt px-3 py-2.5"
                  onClick={() => toggleGroup(g.key)}
                >
                  <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <Folder className="h-3.5 w-3.5 text-primary-600" />
                    {g.label}
                    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                      {totalItems}
                    </span>
                  </h2>
                  <button
                    type="button"
                    aria-label={isCollapsed ? "Déplier" : "Réduire"}
                    className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-white"
                  >
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </header>
                {!isCollapsed && (
                  <div className="divide-y divide-line">
                    {g.catItems.map(({ cat, items }) => (
                      <div key={cat}>
                        <div className="bg-surface-alt/50 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
                          {DOCUMENT_CATEGORY_LABEL[cat]} ({items.length})
                        </div>
                        <ul className="divide-y divide-line">
                          {items.map((d) => (
                            <DocRow
                              key={d.id}
                              doc={d}
                              onEdit={() => setEditing(d)}
                              onArchive={() => archive.mutate({ id: d.id, archived: !d.archived })}
                              onDelete={() => remove.mutate(d.id)}
                              busy={archive.isPending || remove.isPending}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false);
            setFeedback({ tone: "ok", msg: "Document téléversé avec succès." });
            qc.invalidateQueries({ queryKey: ["cc", "documents"] });
          }}
        />
      )}

      {editing && (
        <EditModal
          doc={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setFeedback({ tone: "ok", msg: "Document mis à jour." });
            qc.invalidateQueries({ queryKey: ["cc", "documents"] });
          }}
        />
      )}
    </>
  );
}

function DocRow({
  doc: d,
  onEdit,
  onArchive,
  onDelete,
  busy,
}: {
  doc: DocItem;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const days = daysUntil(d.validUntil);
  const expiringSoon = days !== null && days >= 0 && days <= 30;
  const expired = days !== null && days < 0;

  return (
    <li className="flex flex-wrap items-start gap-3 px-3 py-2.5">
      <FileTypeIcon mimeType={d.mimeType} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">{d.title}</span>
          {d.referenceNumber && (
            <span className="font-mono text-[10.5px] text-ink-3">{d.referenceNumber}</span>
          )}
          {d.subCategory && (
            <span className="rounded-full bg-surface-alt px-1.5 py-0.5 text-[10px] text-ink-3">
              {d.subCategory}
            </span>
          )}
          {expired && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
              <AlertTriangle className="h-2.5 w-2.5" /> Expiré
            </span>
          )}
          {expiringSoon && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              <AlertTriangle className="h-2.5 w-2.5" /> Expire dans {days}j
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-ink-3">
          <span>{d.site.code}</span>
          <span>·</span>
          <span>{fmtSize(d.fileSize)}</span>
          {d.amount !== null && (
            <>
              <span>·</span>
              <span className="font-semibold text-ink-2">
                {formatFCFA(d.amount)} FCFA
              </span>
            </>
          )}
          {d.relatedPartyName && (
            <>
              <span>·</span>
              <span>{d.relatedPartyName}</span>
            </>
          )}
          {d.validUntil && (
            <>
              <span>·</span>
              <span>Valide jusqu'au {fmtDate(d.validUntil)}</span>
            </>
          )}
          <span>·</span>
          <span>Téléversé par {d.uploadedBy} le {fmtDate(d.uploadedAt)}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <a
          href={d.fileUrl}
          download={d.fileName}
          target="_blank"
          rel="noopener"
          className="grid h-8 w-8 place-items-center rounded-md border border-line bg-white text-ink-3 hover:bg-primary-50 hover:text-primary-700"
          title="Télécharger"
          aria-label="Télécharger"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={onEdit}
          disabled={busy}
          className="grid h-8 w-8 place-items-center rounded-md border border-line bg-white text-ink-3 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
          title="Modifier"
          aria-label="Modifier"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onArchive}
          disabled={busy}
          className="grid h-8 w-8 place-items-center rounded-md border border-line bg-white text-ink-3 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
          title={d.archived ? "Restaurer" : "Réduire (archiver)"}
          aria-label={d.archived ? "Restaurer" : "Réduire"}
        >
          {d.archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className="grid h-8 w-8 place-items-center rounded-md border border-danger/30 bg-white text-danger hover:bg-danger/5 disabled:opacity-50"
          title="Supprimer définitivement"
          aria-label="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  return (
    <span
      className={clsx(
        "grid h-10 w-10 flex-shrink-0 place-items-center rounded-md",
        isImage ? "bg-blue-50 text-blue-700" : isPdf ? "bg-rose-50 text-rose-700" : "bg-surface-alt text-ink-3",
      )}
    >
      {isPdf ? <FileText className="h-5 w-5" /> : isImage ? <Folder className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
    </span>
  );
}

function Kpi({
  icon,
  label,
  value,
  unit,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "primary" | "warning" | "danger";
}) {
  const toneCls = {
    default: "bg-surface-alt text-ink-2",
    primary: "bg-primary-50 text-primary-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-danger/10 text-danger",
  }[tone];
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2">
        <span className={clsx("grid h-7 w-7 place-items-center rounded-full", toneCls)}>{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</span>
      </div>
      <div className="mt-1.5 font-mono text-[18px] font-bold tabular-nums text-ink">
        {value}
        {unit && <span className="ml-1 text-[10.5px] font-medium text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Upload Modal
// ════════════════════════════════════════════════════════════════════════

function UploadModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("MEETING_MINUTES");
  const [subCategory, setSubCategory] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [amount, setAmount] = useState("");
  const [relatedPartyName, setRelatedPartyName] = useState("");
  const [description, setDescription] = useState("");
  const [siteId, setSiteId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Récupère les sites du CC
  const { data: profileData } = useQuery({
    queryKey: ["cc", "profile-sites"],
    queryFn: async (): Promise<{ sites: Array<{ id: string; code: string; name: string }> }> => {
      const res = await fetch("/api/cc/profile", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const sites = profileData?.sites ?? [];

  // Auto-sélection du premier site
  useMemo(() => {
    if (!siteId && sites.length > 0) setSiteId(sites[0].id);
  }, [sites, siteId]);

  // Requiert montant + dates pour cautions/assurances
  const needsValidity = category.startsWith("BANK_GUARANTEE_") || category.startsWith("INSURANCE_");
  const needsAmount = category.startsWith("BANK_GUARANTEE_") || category === "STATEMENT" || category === "PURCHASE_ORDER";

  const submit = async () => {
    setError(null);
    if (!file) return setError("Sélectionnez un fichier");
    if (!title.trim()) return setError("Titre requis");
    if (!siteId) return setError("Sélectionnez un chantier");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("siteId", siteId);
    fd.append(
      "metadata",
      JSON.stringify({
        title: title.trim(),
        category,
        subCategory: subCategory.trim() || undefined,
        description: description.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        issuedAt: issuedAt ? new Date(issuedAt).toISOString() : undefined,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        amount: amount ? Number(amount.replace(/[\s,]/g, "")) : undefined,
        relatedPartyName: relatedPartyName.trim() || undefined,
      }),
    );

    setSubmitting(true);
    try {
      const res = await fetch("/api/cc/documents", {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Échec de l'upload");
      }
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[700px] max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-2 border-b border-line bg-primary-500 px-4 py-3 text-white">
          <h2 className="text-[15px] font-semibold">Téléverser un document</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/15" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {/* Fichier */}
          <Field label="Fichier (max 20 Mo)">
            <input
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
              className="block w-full text-[12.5px]"
            />
            {file && (
              <div className="mt-1 text-[11px] text-ink-3">
                {file.name} · {fmtSize(file.size)}
              </div>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Chantier *">
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              >
                {sites.length === 0 && <option value="">— Chargement —</option>}
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Catégorie *">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              >
                {DOCUMENT_CATEGORY_GROUPS.flatMap((g) => (
                  <optgroup key={g.key} label={g.label}>
                    {g.categories.map((c) => (
                      <option key={c} value={c}>
                        {DOCUMENT_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Titre du document *">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Ex : PV réunion chantier du 15 mai 2026"
              className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
            />
          </Field>

          <Field label="Sous-catégorie / précision (optionnel)">
            <input
              type="text"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              maxLength={120}
              placeholder="Ex : Décompte mensuel n°4"
              className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="N° de pièce / référence">
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Ex : BL-2026-04-1854"
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </Field>
            <Field label="Émetteur / partie associée">
              <input
                type="text"
                value={relatedPartyName}
                onChange={(e) => setRelatedPartyName(e.target.value)}
                placeholder="Ex : BICEC · Bonanjo"
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date d'émission">
              <input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </Field>
            {needsValidity && (
              <Field label="Validité jusqu'au *">
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
                />
              </Field>
            )}
          </div>

          {needsAmount && (
            <Field label="Montant (FCFA)">
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="Ex : 50 000 000"
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-right font-mono text-[13px]"
              />
            </Field>
          )}

          <Field label="Description / notes (optionnel)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12.5px]"
            />
          </Field>
        </div>

        {error && (
          <div className="border-t border-line bg-danger/5 px-4 py-2 text-[12.5px] text-danger">{error}</div>
        )}

        <footer className="flex items-center justify-end gap-2 border-t border-line bg-white px-3 py-2.5">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-alt">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={submitting || !file || !title.trim() || !siteId}
            className="inline-flex items-center gap-1 rounded-md bg-primary-500 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" /> {submitting ? "Envoi…" : "Téléverser"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Edit Modal (métadonnées uniquement, pas de remplacement de fichier)
// ════════════════════════════════════════════════════════════════════════

function EditModal({
  doc,
  onClose,
  onSaved,
}: {
  doc: DocItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [subCategory, setSubCategory] = useState(doc.subCategory ?? "");
  const [referenceNumber, setReferenceNumber] = useState(doc.referenceNumber ?? "");
  const [issuedAt, setIssuedAt] = useState(doc.issuedAt ? doc.issuedAt.slice(0, 10) : "");
  const [validUntil, setValidUntil] = useState(doc.validUntil ? doc.validUntil.slice(0, 10) : "");
  const [amount, setAmount] = useState(doc.amount?.toString() ?? "");
  const [relatedPartyName, setRelatedPartyName] = useState(doc.relatedPartyName ?? "");
  const [description, setDescription] = useState(doc.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cc/documents/${doc.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subCategory: subCategory.trim() || undefined,
          description: description.trim() || undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          issuedAt: issuedAt ? new Date(issuedAt).toISOString() : "",
          validUntil: validUntil ? new Date(validUntil).toISOString() : "",
          amount: amount ? Number(amount.replace(/[\s,]/g, "")) : null,
          relatedPartyName: relatedPartyName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[640px] max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-2 border-b border-line bg-blue-600 px-4 py-3 text-white">
          <h2 className="text-[15px] font-semibold">Modifier le document</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/15" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <Field label="Titre">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
            />
          </Field>
          <Field label="Sous-catégorie">
            <input
              type="text"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="N° de pièce">
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </Field>
            <Field label="Émetteur">
              <input
                type="text"
                value={relatedPartyName}
                onChange={(e) => setRelatedPartyName(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </Field>
            <Field label="Date d'émission">
              <input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </Field>
            <Field label="Validité jusqu'au">
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </Field>
          </div>
          <Field label="Montant (FCFA)">
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ""))}
              className="h-9 w-full rounded-md border border-line bg-white px-2 text-right font-mono text-[13px]"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12.5px]"
            />
          </Field>
        </div>
        {error && (
          <div className="border-t border-line bg-danger/5 px-4 py-2 text-[12.5px] text-danger">{error}</div>
        )}
        <footer className="flex items-center justify-end gap-2 border-t border-line bg-white px-3 py-2.5">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-alt">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={submitting || !title.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {label}
      </span>
      {children}
    </label>
  );
}
