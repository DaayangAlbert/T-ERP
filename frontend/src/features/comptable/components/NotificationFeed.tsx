import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { comptableTheme, comptableTonePanel } from "@/features/comptable/theme";
import type { NotificationItem } from "@/features/comptable/types";

interface NotificationFeedProps {
  items: NotificationItem[];
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(parsed);
}

export function NotificationFeed({ items }: NotificationFeedProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className={`${comptableTonePanel(item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : item.tone === "info" ? "info" : "neutral")} space-y-2`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${comptableTheme.primaryText}`}>{item.title}</p>
            <Badge variant={item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : "info"}>
              {item.module}
            </Badge>
          </div>
          <p className={`text-sm ${comptableTheme.secondaryText}`}>{item.description}</p>
          <p className={`text-xs ${comptableTheme.subtleText}`}>{formatDateTime(item.createdAt)}</p>
        </Card>
      ))}
    </div>
  );
}
