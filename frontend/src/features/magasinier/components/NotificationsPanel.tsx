import { Bell, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { NotificationItem } from "@/features/magasinier/types";
import { formatDateTime } from "@/features/magasinier/utils/format";

interface NotificationsPanelProps {
  items: NotificationItem[];
}

export function NotificationsPanel({ items }: NotificationsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-2 dark:border-slate-700 dark:bg-slate-900">
            <Bell className="h-4 w-4 text-slate-700 dark:text-slate-200" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Notifications autorisees</p>
            <p className="text-xs text-slate-500">Seulement les alertes de vos projets affectes.</p>
          </div>
        </div>
        <Badge variant="neutral">{items.length}</Badge>
      </div>

      <div className="space-y-2">
        {items.length ? (
          items.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="rounded-[22px] border border-slate-200 bg-white/75 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{item.title}</p>
                <Badge variant={item.tone}>{item.tone}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDateTime(item.createdAt)}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700">
            Aucune notification dans votre perimetre.
          </div>
        )}
      </div>
    </div>
  );
}
