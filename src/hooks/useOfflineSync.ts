"use client";

import { useEffect, useState, useCallback } from "react";
import { flushAllQueues, totalQueueSize } from "@/lib/offline/db";

export interface OfflineSync {
  isOnline: boolean;
  queueSize: number;
  isSyncing: boolean;
  lastSyncAt: number | null;
  forceSyncNow: () => Promise<void>;
}

export function useOfflineSync(): OfflineSync {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const refreshQueueSize = useCallback(async () => {
    try {
      const size = await totalQueueSize();
      setQueueSize(size);
    } catch {
      // ignore
    }
  }, []);

  const forceSyncNow = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await flushAllQueues();
      setLastSyncAt(Date.now());
      await refreshQueueSize();
    } finally {
      setIsSyncing(false);
    }
  }, [refreshQueueSize]);

  // Online/offline events
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      forceSyncNow();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [forceSyncNow]);

  // Initial queue read + periodic refresh
  useEffect(() => {
    refreshQueueSize();
    const intv = window.setInterval(refreshQueueSize, 5000);
    return () => window.clearInterval(intv);
  }, [refreshQueueSize]);

  // Service worker message → trigger sync
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "SYNC_TRIGGERED") forceSyncNow();
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [forceSyncNow]);

  return { isOnline, queueSize, isSyncing, lastSyncAt, forceSyncNow };
}
