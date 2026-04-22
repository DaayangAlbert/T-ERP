import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { comptableTheme } from "@/features/comptable/theme";
import { cn } from "@/shared/utils/cn";

interface ComptableSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  badgeLabel?: string | number;
  badgeVariant?: "neutral" | "info" | "success" | "warning" | "danger";
  action?: ReactNode;
  className?: string;
}

export function ComptableSection({
  eyebrow,
  title,
  description,
  badgeLabel,
  badgeVariant = "neutral",
  action,
  className,
}: ComptableSectionProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="space-y-1">
        {eyebrow ? <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${comptableTheme.subtleText}`}>{eyebrow}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`text-lg font-semibold ${comptableTheme.primaryText}`}>{title}</h3>
          {badgeLabel !== undefined ? <Badge variant={badgeVariant}>{badgeLabel}</Badge> : null}
        </div>
        {description ? <p className={`max-w-3xl text-sm ${comptableTheme.secondaryText}`}>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
