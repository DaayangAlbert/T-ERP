"use client";

import { useMemo, useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useGedAllDocuments, type GedDocument } from "@/hooks/useGedDocuments";
import { useGedSpaces } from "@/hooks/useGedSpaces";
import { SpaceTreeSidebar } from "./SpaceTreeSidebar";
import { DocumentsTable } from "./DocumentsTable";
import { BulkActionBar } from "./BulkActionBar";
import { MoveToSpaceModal } from "./MoveToSpaceModal";
import { ImportDocumentModal } from "./ImportDocumentModal";
import { ClassifyDocumentModal } from "./ClassifyDocumentModal";
import { ShareDocumentsModal } from "./ShareDocumentsModal";
import { PageHelp } from "@/components/help/PageHelp";
import { GedDocumentsTutorial } from "@/components/help/tutorials/GedDocumentsTutorial";

const PAGE_SIZE = 50;

export function DocumentsListPage() {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [unclassifiedOnly, setUnclassifiedOnly] = useState(false);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "size">("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [classifyDoc, setClassifyDoc] = useState<GedDocument | null>(null);
  const [shareDocs, setShareDocs] = useState<GedDocument[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  /**
   * Déclenche le téléchargement de plusieurs documents en série en simulant
   * un clic sur un lien `<a download>` éphémère pour chacun. Le navigateur
   * regroupe les téléchargements dans sa barre de download.
   */
  function bulkDownload(docs: GedDocument[]) {
    if (docs.length === 0) return;
    docs.forEach((d, idx) => {
      // Léger décalage pour éviter que certains navigateurs ne bloquent les
      // téléchargements multiples comme étant du popup spam.
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = d.url;
        a.download = d.name;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, idx * 200);
    });
    showToast(
      `Téléchargement de ${docs.length} document${docs.length > 1 ? "s" : ""} lancé`,
    );
  }

  const filters = {
    spaceId: selectedSpaceId ?? undefined,
    unclassified: unclassifiedOnly,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort,
  };

  const docsQ = useGedAllDocuments(filters);
  const spacesQ = useGedSpaces({});

  const allSpaces = useMemo(() => {
    if (!spacesQ.data) return [];
    return [...spacesQ.data.transverse, ...spacesQ.data.sites].map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      icon: s.icon ?? null,
      spaceType: s.spaceType,
      documentsCount: s.documentsCount,
    }));
  }, [spacesQ.data]);

  const totalDocuments = useMemo(() => {
    if (!spacesQ.data) return 0;
    return [...spacesQ.data.transverse, ...spacesQ.data.sites].reduce(
      (n, s) => n + (s.documentsCount ?? 0),
      0,
    );
  }, [spacesQ.data]);

  // Comptage des non classés via le facet de la réponse (si on est en mode all)
  const unclassifiedCount = useMemo(() => {
    return docsQ.data?.facets.bySpace["__none__"] ?? 0;
  }, [docsQ.data]);

  function selectAll() {
    setSelectedSpaceId(null);
    setUnclassifiedOnly(false);
    setPage(1);
    setSelectedIds(new Set());
  }
  function selectUnclassified() {
    setSelectedSpaceId(null);
    setUnclassifiedOnly(true);
    setPage(1);
    setSelectedIds(new Set());
  }
  function selectSpace(id: string) {
    setSelectedSpaceId(id);
    setUnclassifiedOnly(false);
    setPage(1);
    setSelectedIds(new Set());
  }

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!docsQ.data) return;
    const visibleIds = docsQ.data.items.map((d) => d.id);
    setSelectedIds((prev) => {
      const allSel = visibleIds.every((id) => prev.has(id));
      if (allSel) return new Set();
      return new Set(visibleIds);
    });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchInput);
    setPage(1);
  }

  const selectedDocs = useMemo(() => {
    if (!docsQ.data) return [];
    return docsQ.data.items.filter((d) => selectedIds.has(d.id));
  }, [docsQ.data, selectedIds]);

  const currentSpaceName = useMemo(() => {
    if (unclassifiedOnly) return "Non classés";
    if (!selectedSpaceId) return "Tous les documents";
    return allSpaces.find((s) => s.id === selectedSpaceId)?.name ?? "Dossier";
  }, [allSpaces, selectedSpaceId, unclassifiedOnly]);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Bibliothèque documentaire
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Vue exhaustive pour le référent documentaire — tous les espaces, toutes les directions
            (hors bulletins de paie et contentieux RH).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" /> Importer un document
          </button>
          <PageHelp title="Aide — Documents GED"><GedDocumentsTutorial /></PageHelp>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row">
        <SpaceTreeSidebar
          spaces={allSpaces}
          selectedSpaceId={selectedSpaceId}
          unclassifiedOnly={unclassifiedOnly}
          totalDocuments={totalDocuments}
          unclassifiedCount={unclassifiedCount}
          facetBySpace={docsQ.data?.facets.bySpace ?? {}}
          onSelectAll={selectAll}
          onSelectUnclassified={selectUnclassified}
          onSelectSpace={selectSpace}
        />

        <main className="min-w-0 flex-1 space-y-3">
          <div className="rounded-lg border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink">{currentSpaceName}</div>
                {docsQ.data && (
                  <div className="text-[11px] text-ink-3">
                    {docsQ.data.total} document{docsQ.data.total > 1 ? "s" : ""}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <form onSubmit={submitSearch} className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Rechercher (nom, OCR, réf.)…"
                    className="h-8 w-56 rounded-md border border-line bg-white pl-7 pr-2 text-[12px] outline-none focus:border-violet-400"
                  />
                </form>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as typeof sort);
                    setPage(1);
                  }}
                  className="h-8 rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                >
                  <option value="newest">Plus récent</option>
                  <option value="oldest">Plus ancien</option>
                  <option value="name">Nom A-Z</option>
                  <option value="size">Taille</option>
                </select>
              </div>
            </div>

            {docsQ.isError && (
              <div className="border-b border-line bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
                {(docsQ.error as Error)?.message ?? "Erreur de chargement"}
              </div>
            )}

            <DocumentsTable
              documents={docsQ.data?.items ?? []}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onToggleAll={toggleAll}
              onClassify={setClassifyDoc}
              onShare={(d) => setShareDocs([d])}
              isLoading={docsQ.isLoading}
            />

            {docsQ.data && docsQ.data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[11.5px] text-ink-3">
                <span>
                  Page {docsQ.data.page} sur {docsQ.data.pages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="grid h-7 w-7 place-items-center rounded-md border border-line bg-white hover:bg-surface-alt disabled:opacity-40"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(docsQ.data!.pages, p + 1))}
                    disabled={page === docsQ.data.pages}
                    className="grid h-7 w-7 place-items-center rounded-md border border-line bg-white hover:bg-surface-alt disabled:opacity-40"
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <BulkActionBar
            count={selectedIds.size}
            onMove={() => setMoveOpen(true)}
            onClassify={() => {
              if (selectedDocs.length === 1) setClassifyDoc(selectedDocs[0]);
            }}
            onShare={() => {
              if (selectedDocs.length > 0) setShareDocs(selectedDocs);
            }}
            onDownload={() => bulkDownload(selectedDocs)}
            onClear={() => setSelectedIds(new Set())}
          />
        </main>
      </div>

      {importOpen && (
        <ImportDocumentModal
          defaultSpaceId={selectedSpaceId ?? undefined}
          defaultSpaceName={
            selectedSpaceId
              ? allSpaces.find((s) => s.id === selectedSpaceId)?.name
              : undefined
          }
          onClose={() => setImportOpen(false)}
          onUploaded={() => {
            setImportOpen(false);
          }}
        />
      )}

      {moveOpen && (
        <MoveToSpaceModal
          documentIds={Array.from(selectedIds)}
          onClose={() => setMoveOpen(false)}
          onMoved={() => {
            setSelectedIds(new Set());
            setMoveOpen(false);
          }}
        />
      )}

      {classifyDoc && (
        <ClassifyDocumentModal
          documentId={classifyDoc.id}
          documentName={classifyDoc.name}
          currentClassificationId={classifyDoc.classificationId}
          currentSpaceId={classifyDoc.spaceId}
          onClose={() => setClassifyDoc(null)}
          onClassified={() => {
            setClassifyDoc(null);
            setSelectedIds(new Set());
          }}
        />
      )}

      {shareDocs && shareDocs.length > 0 && (
        <ShareDocumentsModal
          documents={shareDocs}
          onClose={() => setShareDocs(null)}
          onShared={({ recipients, messagesCreated }) => {
            showToast(
              `Partagé vers ${recipients} destinataire${recipients > 1 ? "s" : ""} · ${messagesCreated} message${messagesCreated > 1 ? "s" : ""} créé${messagesCreated > 1 ? "s" : ""}`,
            );
            setShareDocs(null);
            setSelectedIds(new Set());
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
