"use client";

import { useEffect, useState } from "react";
import { WifiOff, Loader2, Check } from "lucide-react";
import { listQueuedClocks, watchOnlineAndDrain } from "@/lib/ouv/clock-offline";

// Badge sticky en haut : "📵 Hors ligne · N pointage(s) en attente" si offline
// ou file non vide, "✓ Synchronisé" pendant 3s après drain réussi.
// Le SW publie aussi un message OUV_CLOCK_SYNC_REQUESTED lors du Background Sync.
export function OfflineIndicator() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queueSize, setQueueSize] = useState(0);
  const [syncedFlash, setSyncedFlash] = useState(0);

  useEffect(() => {
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const items = await listQueuedClocks();
      if (mounted) setQueueSize(items.length);
    };
    void refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const unwatch = watchOnlineAndDrain((result) => {
      if (result.sent > 0) {
        setSyncedFlash(result.sent);
        setTimeout(() => setSyncedFlash(0), 3000);
      }
      void listQueuedClocks().then((items) => setQueueSize(items.length));
    });
    return unwatch;
  }, []);

  // Écoute aussi les messages du Service Worker (Background Sync)
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "OUV_CLOCK_SYNC_REQUESTED") {
        void listQueuedClocks().then((items) => setQueueSize(items.length));
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  if (syncedFlash > 0) {
    return (
      <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-emerald-500 px-3 py-1.5 text-[12.5px] font-semibold text-white">
        <Check className="h-4 w-4" />
        {syncedFlash} pointage{syncedFlash > 1 ? "s" : ""} synchronisé{syncedFlash > 1 ? "s" : ""}
      </div>
    );
  }

  if (!online) {
    return (
      <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-[12.5px] font-semibold text-white">
        <WifiOff className="h-4 w-4" />
        📵 Hors ligne — pointage stocké local
        {queueSize > 0 && ` · ${queueSize} en attente`}
      </div>
    );
  }

  if (queueSize > 0) {
    return (
      <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-blue-500 px-3 py-1.5 text-[12.5px] font-semibold text-white">
        <Loader2 className="h-4 w-4 animate-spin" />
        Synchronisation… {queueSize} pointage{queueSize > 1 ? "s" : ""} en attente
      </div>
    );
  }

  return null;
}
