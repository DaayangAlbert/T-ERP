"use client";

import { clsx } from "clsx";
import { CloudOff, Cloud, RefreshCw } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export function SyncStatusBadge() {
  const { isOnline, queueSize, isSyncing, forceSyncNow } = useOfflineSync();

  let tone: "online" | "syncing" | "offline-queue" | "offline";
  let icon = Cloud;
  let label: string;

  if (!isOnline && queueSize > 0) {
    tone = "offline-queue";
    icon = CloudOff;
    label = `📴 Hors-ligne · ${queueSize} en attente`;
  } else if (!isOnline) {
    tone = "offline";
    icon = CloudOff;
    label = "📴 Mode hors-ligne";
  } else if (isSyncing || queueSize > 0) {
    tone = "syncing";
    icon = RefreshCw;
    label = `⏳ Synchro queue : ${queueSize}`;
  } else {
    tone = "online";
    icon = Cloud;
    label = "● En ligne";
  }

  const Icon = icon;
  return (
    <button
      type="button"
      onClick={forceSyncNow}
      style={{ minHeight: 32 }}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-medium",
        tone === "online" && "border-success/40 bg-success/10 text-success",
        tone === "syncing" && "border-warning/40 bg-warning/10 text-warning",
        tone === "offline-queue" && "border-danger/40 bg-danger/10 text-danger",
        tone === "offline" && "border-danger/40 bg-danger/10 text-danger"
      )}
    >
      <Icon className={clsx("h-3.5 w-3.5", isSyncing && "animate-spin")} />
      {label}
    </button>
  );
}
