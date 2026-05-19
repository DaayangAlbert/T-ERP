"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useGedSpaces, type GedSpacesFilters } from "@/hooks/useGedSpaces";
import { SpacesHeader } from "@/components/ged/espaces/SpacesHeader";
import { SpacesTabs, type SpacesTab } from "@/components/ged/espaces/SpacesTabs";
import { SpacesFiltersCard } from "@/components/ged/espaces/SpacesFiltersCard";
import { TransverseSpacesTable } from "@/components/ged/espaces/TransverseSpacesTable";
import { ConstructionSitesSpacesTable } from "@/components/ged/espaces/ConstructionSitesSpacesTable";
import { SpaceDetailDrawer } from "@/components/ged/espaces/SpaceDetailDrawer";
import { NewSpaceModal } from "@/components/ged/espaces/NewSpaceModal";
import { ImportDocumentModal } from "@/components/ged/documents/ImportDocumentModal";
import { UnclassifiedDocumentsCard } from "@/components/ged/documents/UnclassifiedDocumentsCard";
import { Upload } from "lucide-react";
import { Confidentiality } from "@prisma/client";

export default function GedEspacesPage() {
  const { user } = useAuth();
  const readOnly = user?.role !== "ARCHIVIST";

  const [tab, setTab] = useState<SpacesTab>("all");
  const [q, setQ] = useState("");
  const [conf, setConf] = useState<Confidentiality | "ALL">("ALL");
  const [minIndex, setMinIndex] = useState<number | "">("");
  const [minVol, setMinVol] = useState<number | "">("");

  // Permet l'ouverture directe d'un espace via /espaces?openId=<id>
  // (utilisé par les liens depuis le dashboard GED).
  const searchParams = useSearchParams();
  const initialOpenId = searchParams.get("openId");
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const filters: GedSpacesFilters = useMemo(
    () => ({
      q: q.trim() || undefined,
      confidentiality: conf,
      minIndexation: typeof minIndex === "number" ? minIndex : null,
      tab,
    }),
    [q, conf, minIndex, tab],
  );

  const { data, isLoading, isError } = useGedSpaces(filters);

  const totalDocs = useMemo(() => {
    if (!data) return 0;
    return [...data.transverse, ...data.sites].reduce((s, r) => s + r.documentsCount, 0);
  }, [data]);
  const totalVol = useMemo(() => {
    if (!data) return 0;
    return [...data.transverse, ...data.sites].reduce((s, r) => s + r.volumeBytes, 0);
  }, [data]);

  const showTransverse = tab === "all" || tab === "transverse";
  const showSites = tab === "all" || tab === "sites";

  // Filtre côté client pour minVolume (peu efficace sur le SQL — petit dataset)
  const minVolBytes = typeof minVol === "number" ? minVol * 1_000_000 : 0;
  const transverseRows = (data?.transverse ?? []).filter((r) => r.volumeBytes >= minVolBytes);
  const sitesRows = (data?.sites ?? []).filter((r) => r.volumeBytes >= minVolBytes);

  return (
    <div className="space-y-3">
      <SpacesHeader
        spacesTotal={data?.counts.total ?? 0}
        documentsTotal={totalDocs}
        volumeBytes={totalVol}
        readOnly={readOnly}
        onOpenAccessPolicy={() => {
          /* Pas d'éditeur global — édité par espace via le drawer */
          alert("La politique d'accès se modifie dans chaque espace (ouvre un espace pour la voir).");
        }}
        onCreate={() => setShowNew(true)}
      />
      <SpacesTabs
        active={tab}
        counts={{
          all: data?.counts.total ?? 0,
          sites: data?.counts.sites ?? 0,
          transverse: data?.counts.transverse ?? 0,
        }}
        onChange={setTab}
      />
      <SpacesFiltersCard
        q={q}
        confidentiality={conf}
        minIndexation={minIndex}
        minVolumeMb={minVol}
        onChange={(n) => {
          if (n.q !== undefined) setQ(n.q);
          if (n.confidentiality !== undefined) setConf(n.confidentiality);
          if (n.minIndexation !== undefined) setMinIndex(n.minIndexation);
          if (n.minVolumeMb !== undefined) setMinVol(n.minVolumeMb);
        }}
      />

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800">
          Impossible de charger les espaces.
        </div>
      )}

      {isLoading && !data ? (
        <div className="space-y-2">
          <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
          <div className="h-48 animate-pulse rounded-xl bg-surface-alt" />
        </div>
      ) : (
        <>
          {showTransverse && <TransverseSpacesTable rows={transverseRows} onOpen={setOpenId} />}
          {showSites && <ConstructionSitesSpacesTable rows={sitesRows} onOpen={setOpenId} />}
        </>
      )}

      {/* Carte « Documents à classer » — visible uniquement quand il y en a */}
      {!readOnly && <UnclassifiedDocumentsCard readOnly={readOnly} />}

      {/* Bouton flottant « Importer » global (raccourci sans ouvrir un espace) */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-violet-600 px-4 text-[13px] font-semibold text-white shadow-lg hover:bg-violet-700"
        >
          <Upload className="h-4 w-4" /> Importer un document
        </button>
      )}

      <SpaceDetailDrawer
        spaceId={openId}
        readOnly={readOnly}
        onClose={() => setOpenId(null)}
      />
      {showNew && (
        <NewSpaceModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => setOpenId(id)}
        />
      )}
      {showImport && (
        <ImportDocumentModal
          onClose={() => setShowImport(false)}
          onUploaded={(res) =>
            showToast(
              res.internalReference
                ? `Document importé · ${res.internalReference}`
                : "Document importé — à classer manuellement (préfixe non détecté)",
            )
          }
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
