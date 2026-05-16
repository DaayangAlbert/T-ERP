"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { clsx } from "clsx";
import { useTenant } from "@/hooks/useTenant";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/useNotifications";

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  const { tenant } = useTenant();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = data?.unreadCount ?? 0;
  const items = data?.notifications ?? [];

  // Convertit un lien relatif `/direction-financiere/...` en lien tenant-scoped
  // `/<tenantSlug>/direction-financiere/...` pour que la navigation marche.
  const tenantHref = (link: string | null): string | null => {
    if (!link) return null;
    if (!tenant?.slug) return link;
    if (link.startsWith(`/${tenant.slug}/`)) return link;
    if (link.startsWith("/")) return `/${tenant.slug}${link}`;
    return link;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded text-white/70 hover:bg-white/8"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-line bg-white text-ink shadow-xl sm:w-96">
          <header className="flex items-center justify-between border-b border-line px-3 py-2">
            <div>
              <h3 className="text-[13px] font-semibold">Notifications</h3>
              <p className="text-[10.5px] text-ink-3">
                {unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"}
              </p>
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-50"
              >
                <CheckCheck className="h-3 w-3" /> Tout marquer comme lu
              </button>
            )}
          </header>

          <ul className="max-h-[420px] overflow-y-auto divide-y divide-line">
            {items.length === 0 ? (
              <li className="px-3 py-8 text-center text-[12px] text-ink-3">
                Aucune notification.
              </li>
            ) : (
              items.map((n) => {
                const href = tenantHref(n.link);
                const content = (
                  <div
                    className={clsx(
                      "flex gap-2 px-3 py-2 text-[12px] transition",
                      !n.read && "bg-primary-50/40",
                      href && "hover:bg-surface-alt",
                    )}
                  >
                    <span
                      className={clsx(
                        "mt-1 h-2 w-2 flex-shrink-0 rounded-full",
                        n.read ? "bg-line" : "bg-primary-500",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink">{n.title}</div>
                      {n.body && (
                        <div className="mt-0.5 text-[11.5px] text-ink-3 line-clamp-2">{n.body}</div>
                      )}
                      <div className="mt-1 text-[10.5px] text-ink-3">
                        {formatRelative(n.createdAt)}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => {
                          if (!n.read) markOne.mutate(n.id);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!n.read) markOne.mutate(n.id);
                        }}
                        className="block w-full text-left"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
