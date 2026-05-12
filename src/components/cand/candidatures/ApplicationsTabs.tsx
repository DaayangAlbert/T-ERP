"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";

interface Props {
  active: number;
  archived: number;
  total: number;
}

export function ApplicationsTabs({ active, archived, total }: Props) {
  const params = useSearchParams();
  const current = params?.get("filter") ?? "active";

  const tabs = [
    { key: "active", label: "Actives", count: active },
    { key: "archived", label: "Archivées", count: archived },
    { key: "all", label: "Toutes", count: total },
  ];

  return (
    <nav className="flex gap-1 border-b border-line">
      {tabs.map((t) => {
        const isActive = current === t.key;
        return (
          <Link
            key={t.key}
            href={t.key === "active" ? "/cand/candidatures" : `/cand/candidatures?filter=${t.key}`}
            className={clsx(
              "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary-700"
                : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {t.label}
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                isActive ? "bg-primary-100 text-primary-700" : "bg-ink-3/10 text-ink-3",
              )}
            >
              {t.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
