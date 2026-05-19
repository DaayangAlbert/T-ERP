"use client";

/**
 * IndexedDB minimal pour la queue offline du Chef Chantier.
 * Implémentation native sans dépendance (idb).
 *
 * Stores :
 *  - attendance-queue : pointages POST en attente
 *  - production-queue : entrées production
 *  - delivery-queue   : réceptions livraisons
 *  - incident-queue   : déclarations HSE
 *  - photo-queue      : photos compressées
 *  - sites-cache      : copie chantiers du jour
 *  - workforce-cache  : copie équipe du jour
 *
 * Usage typique :
 *   await queueEnqueue("attendance-queue", { url, body, headers });
 *   const items = await queueAll("attendance-queue");
 *   await queueRemove("attendance-queue", item.id);
 */

const DB_NAME = "terp-cc";
// v2 : ajout des stores MAG (Magasinier)
const DB_VERSION = 2;

export type QueueName =
  | "attendance-queue"
  | "production-queue"
  | "delivery-queue"
  | "incident-queue"
  | "photo-queue"
  | "sites-cache"
  | "workforce-cache"
  // MAG — extensions Magasinier
  | "stock-in-queue"
  | "stock-out-queue"
  | "inventory-queue"
  | "articles-cache"
  | "stock-history-cache";

export interface QueueItem {
  id?: number;
  url: string;
  method: "POST" | "PATCH" | "PUT";
  body: unknown;
  headers?: Record<string, string>;
  priority?: "HIGH" | "NORMAL";
  clientUuid?: string;
  enqueuedAt: number;
}

const ALL_STORES: QueueName[] = [
  "attendance-queue",
  "production-queue",
  "delivery-queue",
  "incident-queue",
  "photo-queue",
  "sites-cache",
  "workforce-cache",
  "stock-in-queue",
  "stock-out-queue",
  "inventory-queue",
  "articles-cache",
  "stock-history-cache",
];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined") return Promise.reject(new Error("IndexedDB SSR"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of ALL_STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id", autoIncrement: true });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function queueEnqueue(name: QueueName, item: Omit<QueueItem, "id" | "enqueuedAt"> & Partial<Pick<QueueItem, "enqueuedAt">>): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, "readwrite");
    const store = tx.objectStore(name);
    const payload = { ...item, enqueuedAt: item.enqueuedAt ?? Date.now() };
    const req = store.add(payload);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function queueAll<T = QueueItem>(name: QueueName): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, "readonly");
    const store = tx.objectStore(name);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function queueRemove(name: QueueName, id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, "readwrite");
    const store = tx.objectStore(name);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function queueClear(name: QueueName): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, "readwrite");
    const store = tx.objectStore(name);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function queueCount(name: QueueName): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, "readonly");
    const store = tx.objectStore(name);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const QUEUE_STORES: QueueName[] = [
  "attendance-queue",
  "production-queue",
  "delivery-queue",
  "incident-queue",
  "photo-queue",
  "stock-in-queue",
  "stock-out-queue",
  "inventory-queue",
];

export async function totalQueueSize(): Promise<number> {
  let total = 0;
  for (const name of QUEUE_STORES) {
    try {
      total += await queueCount(name);
    } catch {
      // ignore
    }
  }
  return total;
}

/**
 * Wrapper pratique : POST une requête. Si online, l'envoie directement ;
 * sinon enqueue dans la file appropriée et retourne une promesse résolue
 * immédiatement (UI optimiste). Le hook useOfflineSync se charge du retry.
 */
export async function postOrQueue(
  queue: QueueName,
  url: string,
  body: unknown,
  options: { priority?: "HIGH" | "NORMAL"; clientUuid?: string } = {}
): Promise<{ queued: boolean; response?: Response }> {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return { queued: false, response: res };
      // Si erreur réseau côté serveur on enqueue aussi (retry plus tard)
      if (res.status >= 500) {
        await queueEnqueue(queue, { url, method: "POST", body, priority: options.priority, clientUuid: options.clientUuid });
        return { queued: true };
      }
      return { queued: false, response: res };
    } catch {
      await queueEnqueue(queue, { url, method: "POST", body, priority: options.priority, clientUuid: options.clientUuid });
      return { queued: true };
    }
  }

  await queueEnqueue(queue, { url, method: "POST", body, priority: options.priority, clientUuid: options.clientUuid });
  return { queued: true };
}

/**
 * Vide la queue en envoyant chaque élément au serveur.
 * Renvoie le nombre d'éléments synchronisés et la liste d'erreurs.
 */
export async function flushQueue(name: QueueName): Promise<{ synced: number; errors: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, errors: 0 };
  }
  const items = await queueAll<QueueItem>(name);
  // Tri : priorité HIGH d'abord
  items.sort((a, b) => (a.priority === "HIGH" ? -1 : 0) - (b.priority === "HIGH" ? -1 : 0));
  let synced = 0;
  let errors = 0;
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...item.headers },
        body: JSON.stringify(item.body),
      });
      if (res.ok && item.id !== undefined) {
        await queueRemove(name, item.id);
        synced++;
      } else if (!res.ok) {
        errors++;
      }
    } catch {
      errors++;
    }
  }
  return { synced, errors };
}

export async function flushAllQueues(): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;
  for (const name of QUEUE_STORES) {
    const r = await flushQueue(name);
    synced += r.synced;
    errors += r.errors;
  }
  return { synced, errors };
}
