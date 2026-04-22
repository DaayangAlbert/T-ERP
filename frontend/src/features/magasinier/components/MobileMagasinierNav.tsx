import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/utils/cn";

interface MobileNavItem {
  id: string;
  label: string;
  count?: number;
  icon: LucideIcon;
}

interface MobileMagasinierNavProps {
  items: MobileNavItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function MobileMagasinierNav({ items, activeId, onChange }: MobileMagasinierNavProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                active
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm dark:border-teal-400 dark:bg-teal-500 dark:text-slate-950"
                  : "border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {typeof item.count === "number" ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    active ? "bg-white/15 text-white dark:bg-slate-950/15 dark:text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
