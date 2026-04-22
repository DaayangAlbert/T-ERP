import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { ComptableSection } from "@/features/comptable/components/ComptableSection";
import { comptableTheme } from "@/features/comptable/theme";

interface ComptableChartCardProps {
  eyebrow?: string;
  title: string;
  description?: string;
  badgeLabel?: string | number;
  badgeVariant?: "neutral" | "info" | "success" | "warning" | "danger";
  children: ReactNode;
  footer?: ReactNode;
}

export function ComptableChartCard({
  eyebrow,
  title,
  description,
  badgeLabel,
  badgeVariant,
  children,
  footer,
}: ComptableChartCardProps) {
  return (
    <Card className={`${comptableTheme.strongPanel} space-y-4`}>
      <ComptableSection
        eyebrow={eyebrow}
        title={title}
        description={description}
        badgeLabel={badgeLabel}
        badgeVariant={badgeVariant}
      />
      {children}
      {footer}
    </Card>
  );
}
