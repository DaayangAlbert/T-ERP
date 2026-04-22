import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { comptableProjectPill } from "@/features/comptable/theme";
import { cn } from "@/shared/utils/cn";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface ComptableMobileNavProps {
  items: NavItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function ComptableMobileNav({ items, activeId, onChange }: ComptableMobileNavProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn("inline-flex min-h-[3.25rem] items-center gap-2 rounded-2xl", comptableProjectPill(isActive))}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.count !== undefined ? (
                <Badge className={isActive ? "border-white/20 bg-white/10 text-white" : ""} variant={isActive ? "neutral" : "info"}>
                  {item.count}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
