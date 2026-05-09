"use client";

import { clsx } from "clsx";
import { REPORT_CHAPTER_LABELS, type ReportChapterKey } from "@/lib/board-report-chapters";

interface Props {
  chapters: Record<string, boolean>;
  comments?: Record<string, string>;
  onChange: (next: Record<string, boolean>) => void;
  onCommentChange?: (chapter: string, value: string) => void;
  showComments?: boolean;
}

const CHAPTER_KEYS = Object.keys(REPORT_CHAPTER_LABELS) as ReportChapterKey[];

export function ChapterSelector({
  chapters,
  comments,
  onChange,
  onCommentChange,
  showComments,
}: Props) {
  const enabledCount = CHAPTER_KEYS.filter((k) => chapters[k] !== false).length;

  return (
    <div className="space-y-2">
      <div className="text-[11.5px] text-ink-3">
        {enabledCount} / {CHAPTER_KEYS.length} chapitres sélectionnés
      </div>
      <ul className="space-y-2">
        {CHAPTER_KEYS.map((key) => {
          const enabled = chapters[key] !== false;
          return (
            <li key={key}>
              <label
                className={clsx(
                  "flex cursor-pointer items-start gap-3 rounded-md border bg-white p-3 transition",
                  enabled ? "border-primary-300" : "border-line hover:border-primary-200"
                )}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onChange({ ...chapters, [key]: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-line-2 text-primary-500 focus:ring-primary-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">{REPORT_CHAPTER_LABELS[key]}</div>
                  {showComments && enabled && (
                    <textarea
                      value={comments?.[key] ?? ""}
                      onChange={(e) => onCommentChange?.(key, e.target.value)}
                      placeholder="Commentaire DG (optionnel)"
                      rows={2}
                      className="mt-2 w-full resize-none rounded-md border border-line bg-surface-alt px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-ink-3 focus:border-primary-300 focus:outline-none"
                    />
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
