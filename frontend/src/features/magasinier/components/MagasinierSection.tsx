import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/utils/cn";

interface MagasinierSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  badge?: string;
  className?: string;
}

export function MagasinierSection({
  eyebrow,
  title,
  description,
  action,
  badge,
  className,
}: MagasinierSectionProps) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-start md:justify-between", className)}>
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
          {badge ? <Badge variant="neutral">{badge}</Badge> : null}
        </div>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
