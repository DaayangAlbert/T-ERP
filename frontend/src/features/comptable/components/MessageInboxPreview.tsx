import { MessageSquareMore } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { comptableTheme } from "@/features/comptable/theme";
import type { InboxThread } from "@/features/comptable/types";

interface MessageInboxPreviewProps {
  items: InboxThread[];
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(parsed);
}

export function MessageInboxPreview({ items }: MessageInboxPreviewProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className={`${comptableTheme.insetPanel} space-y-3`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-black/8 bg-white/90 p-2 dark:border-white/10 dark:bg-slate-950/78">
                <MessageSquareMore className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${comptableTheme.primaryText}`}>{item.title}</p>
                <p className={`text-xs ${comptableTheme.subtleText}`}>{item.channelLabel} - {formatDateTime(item.receivedAt)}</p>
              </div>
            </div>
            {item.unreadCount ? <Badge variant="warning">{item.unreadCount}</Badge> : null}
          </div>
          <p className={`text-sm ${comptableTheme.secondaryText}`}>{item.snippet}</p>
        </Card>
      ))}
      <Link to="/app/chat" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
        Ouvrir la messagerie
      </Link>
    </div>
  );
}
