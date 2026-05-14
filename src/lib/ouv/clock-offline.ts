"use client";

/**
 * File offline IndexedDB pour les pointages : si l'ouvrier pointe sans
 * réseau (carrière sans 4G), le payload est stocké localement puis rejoué
 * dès que la connexion revient.
 *
 * Stratégie :
 *  - Stockage IndexedDB (db `terp-ouv`, store `clock-queue`, keyPath `localId`)
 *  - Au pointage, l'UI tente le POST direct. Si fetch échoue (offline) ou
 *    le SW renvoie 503 { queued: true }, on push le payload dans la file.
 *  - Au retour online (event `online` ou message SW), on draine la file
 *    en série (FIFO). Chaque envoi réussi → suppression de l'entry.
 *  - Si un envoi échoue avec un 4xx métier (ex: déjà pointé), on retire
 *    quand même l'entry pour éviter une boucle infinie.
 *
 * Note : pas de dépendance idb-keyval ou Dexie pour rester < 200 ko bundle
 * sur smartphone bas de gamme (RAM 2-4 Go, débit 3G).
 */

const DB_NAME = "terp-ouv";
const DB_VERSION = 1;
const STORE = "clock-queue";

export interface QueuedClockEntry {
  localId: string; // uuid client
  endpoint: "in" | "out";
  payload: Record<string, any>;
  queuedAt: number; // epoch ms
  retries: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB indisponible"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "localId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueClock(entry: {
  endpoint: "in" | "out";
  payload: Record<string, any>;
  localId?: string;
}): Promise<string> {
  const localId = entry.localId ?? `ouv-clock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: QueuedClockEntry = {
    localId,
    endpoint: entry.endpoint,
    payload: entry.payload,
    queuedAt: Date.now(),
    retries: 0,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(full);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return localId;
}

export async function listQueuedClocks(): Promise<QueuedClockEntry[]> {
  try {
    const db = await openDb();
    const items = await new Promise<QueuedClockEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return items;
  } catch {
    return [];
  }
}

export async function removeQueuedClock(localId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function incrementRetry(localId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const item = getReq.result as QueuedClockEntry | undefined;
      if (item) {
        item.retries = (item.retries ?? 0) + 1;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Vide la file en envoyant chaque pointage en série. À appeler dès que
 * `navigator.onLine === true` ou quand le SW reçoit "ouv-clock-sync".
 *
 * Retourne un récap { sent, dropped, kept } pour permettre à l'UI
 * d'afficher un toast "3 pointages synchronisés".
 */
export async function drainClockQueue(): Promise<{ sent: number; dropped: number; kept: number }> {
  const items = await listQueuedClocks();
  let sent = 0;
  let dropped = 0;
  let kept = 0;
  for (const item of items) {
    try {
      const res = await fetch(`/api/ouv/clock/${item.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item.payload, fromOfflineQueue: true, localId: item.localId }),
      });
      if (res.ok) {
        await removeQueuedClock(item.localId);
        sent++;
      } else if (res.status >= 400 && res.status < 500) {
        // Erreur métier (déjà pointé, etc.) → on retire pour éviter la boucle
        await removeQueuedClock(item.localId);
        dropped++;
      } else {
        await incrementRetry(item.localId);
        kept++;
      }
    } catch {
      await incrementRetry(item.localId);
      kept++;
    }
  }
  return { sent, dropped, kept };
}

export function watchOnlineAndDrain(onSync: (result: { sent: number; dropped: number; kept: number }) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = async () => {
    if (navigator.onLine) {
      const result = await drainClockQueue();
      if (result.sent + result.dropped + result.kept > 0) onSync(result);
    }
  };
  window.addEventListener("online", handler);
  // Si déjà online au mount, draine une fois
  void handler();
  return () => window.removeEventListener("online", handler);
}
