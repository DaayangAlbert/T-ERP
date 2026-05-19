"use client";

import { clsx } from "clsx";
import { Folder, FolderOpen, AlertCircle, Layers } from "lucide-react";

interface Space {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  spaceType: string;
  documentsCount: number;
}

interface Props {
  spaces: Space[];
  selectedSpaceId: string | null;
  unclassifiedOnly: boolean;
  totalDocuments: number;
  unclassifiedCount: number;
  facetBySpace: Record<string, number>;
  onSelectAll: () => void;
  onSelectUnclassified: () => void;
  onSelectSpace: (spaceId: string) => void;
}

export function SpaceTreeSidebar({
  spaces,
  selectedSpaceId,
  unclassifiedOnly,
  totalDocuments,
  unclassifiedCount,
  facetBySpace,
  onSelectAll,
  onSelectUnclassified,
  onSelectSpace,
}: Props) {
  const transverse = spaces.filter((s) => s.spaceType !== "CONSTRUCTION_SITE");
  const sites = spaces.filter((s) => s.spaceType === "CONSTRUCTION_SITE");
  const allActive = !selectedSpaceId && !unclassifiedOnly;

  return (
    <aside className="w-full shrink-0 rounded-lg border border-line bg-white text-[12.5px] sm:w-60">
      <div className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        Dossiers
      </div>
      <nav className="space-y-0.5 p-2">
        <NavItem
          active={allActive}
          icon={Layers}
          label="Tous les documents"
          count={totalDocuments}
          tone="primary"
          onClick={onSelectAll}
        />
        <NavItem
          active={unclassifiedOnly}
          icon={AlertCircle}
          label="Non classés"
          count={unclassifiedCount}
          tone="warning"
          onClick={onSelectUnclassified}
        />
      </nav>

      {transverse.length > 0 && (
        <>
          <div className="mt-2 border-t border-line px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
            Transverses
          </div>
          <nav className="space-y-0.5 p-2">
            {transverse.map((s) => (
              <NavItem
                key={s.id}
                active={selectedSpaceId === s.id}
                emoji={s.icon ?? null}
                icon={Folder}
                label={s.name}
                count={facetBySpace[s.id] ?? s.documentsCount}
                onClick={() => onSelectSpace(s.id)}
              />
            ))}
          </nav>
        </>
      )}

      {sites.length > 0 && (
        <>
          <div className="mt-2 border-t border-line px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
            Chantiers
          </div>
          <nav className="space-y-0.5 p-2">
            {sites.map((s) => (
              <NavItem
                key={s.id}
                active={selectedSpaceId === s.id}
                emoji={s.icon ?? null}
                icon={Folder}
                label={s.name}
                count={facetBySpace[s.id] ?? s.documentsCount}
                onClick={() => onSelectSpace(s.id)}
              />
            ))}
          </nav>
        </>
      )}
    </aside>
  );
}

type Tone = "default" | "primary" | "warning";

function NavItem({
  active,
  icon: Icon,
  emoji,
  label,
  count,
  tone = "default",
  onClick,
}: {
  active: boolean;
  icon: typeof Folder;
  emoji?: string | null;
  label: string;
  count: number;
  tone?: Tone;
  onClick: () => void;
}) {
  const ActiveIcon = active && Icon === Folder ? FolderOpen : Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
        active
          ? "bg-violet-100 font-semibold text-violet-900"
          : "text-ink-2 hover:bg-surface-alt",
      )}
    >
      {emoji ? (
        <span className="text-[14px] leading-none">{emoji}</span>
      ) : (
        <ActiveIcon
          className={clsx(
            "h-3.5 w-3.5 shrink-0",
            tone === "primary" && (active ? "text-violet-700" : "text-violet-500"),
            tone === "warning" && (active ? "text-amber-700" : "text-amber-500"),
            tone === "default" && (active ? "text-violet-700" : "text-ink-3"),
          )}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      <span
        className={clsx(
          "rounded px-1.5 py-0.5 text-[10px] font-mono",
          active ? "bg-violet-200 text-violet-900" : "bg-surface-alt text-ink-3",
        )}
      >
        {count}
      </span>
    </button>
  );
}
