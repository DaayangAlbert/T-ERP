"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGedSpaces, type GedSpacesFilters } from "@/hooks/useGedSpaces";
import { SpacesHeader } from "@/components/ged/espaces/SpacesHeader";
import { SpacesTabs, type SpacesTab } from "@/components/ged/espaces/SpacesTabs";
import { SpacesFiltersCard } from "@/components/ged/espaces/SpacesFiltersCard";
import { TransverseSpacesTable } from "@/components/ged/espaces/TransverseSpacesTable";
import { ConstructionSitesSpacesTable } from "@/components/ged/espaces/ConstructionSitesSpacesTable";
import { SpaceDetailDrawer } from "@/components/ged/espaces/SpaceDetailDrawer";
import { NewSpaceModal } from "@/components/ged/espaces/NewSpaceModal";
import { Confidentiality } from "@prisma/client";

export default function GedEspacesPage() {
  const { user } = useAuth();
  const readOnly = user?.role !== "ARCHIVIST";

  const [tab, setTab] = useState<SpacesTab>("all");
  const [q, setQ] = useState("");
  const [conf, setConf] = useState<Confidentiality | "ALL">("ALL");
  const [minIndex, setMinIndex] = useState<number | "">("");
  const [minVol, setMinVol] = useState<number | "">("");

  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

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
    </div>
  );
}
