"use client";

import type { HierarchyLevel } from "@/hooks/useOuvTeam";

interface Props {
  hierarchy: HierarchyLevel[];
}

// Liste hiérarchie : DTrav (haut) → CondTrav → CC → Moi (bas).
// Le CC est en surbrillance violette ("← mon chef direct"). Moi aussi
// en surbrillance ("← moi"). Tap zone élargie pour appel rapide.
export function TeamHierarchyList({ hierarchy }: Props) {
  if (hierarchy.length === 0) return null;
  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">📋 Ma hiérarchie</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {hierarchy.map((level, idx) => (
          <Row
            key={level.id}
            level={level}
            isLast={idx === hierarchy.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function Row({ level, isLast }: { level: HierarchyLevel; isLast: boolean }) {
  const isCurrent = level.isMe;
  const bgCls = level.isDirectChief
    ? "bg-purple-50"
    : isCurrent
      ? "bg-slate-50"
      : "bg-white";
  return (
    <div
      className={`flex min-h-[64px] items-center gap-3 px-4 py-3 ${bgCls} ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <span
        className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-[13px] font-bold text-white ${
          level.isDirectChief ? "bg-purple-700" : isCurrent ? "bg-purple-500" : "bg-[#A855F7]"
        }`}
      >
        {level.initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-slate-900">
          {level.fullName}
          {level.isDirectChief && (
            <span className="ml-1 text-[11px] font-bold text-purple-600">← mon chef direct</span>
          )}
          {isCurrent && (
            <span className="ml-1 text-[11px] font-bold text-purple-600">← moi</span>
          )}
        </p>
        <p className="truncate text-[12px] text-slate-500">
          {level.roleLabel}
          {level.levelLabel ? ` · ${level.levelLabel}` : ""}
        </p>
      </div>
      {level.telUrl && !isCurrent && (
        <a
          href={level.telUrl}
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 active:bg-slate-200"
          aria-label={`Appeler ${level.fullName}`}
        >
          📞
        </a>
      )}
    </div>
  );
}
