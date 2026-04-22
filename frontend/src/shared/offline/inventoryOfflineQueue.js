const OFFLINE_QUEUE_KEY = "t-erp.inventory.offline.queue.v1";
const SUPPORT_SNAPSHOT_KEY = "t-erp.inventory.support.snapshot.v1";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function safeRead(key, fallback) {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function loadInventoryOfflineQueue() {
  const queue = safeRead(OFFLINE_QUEUE_KEY, []);
  return Array.isArray(queue) ? queue : [];
}

export function saveInventoryOfflineQueue(queue) {
  safeWrite(OFFLINE_QUEUE_KEY, Array.isArray(queue) ? queue : []);
}

export function enqueueInventoryOfflineAction(action) {
  const queue = loadInventoryOfflineQueue();
  const nextAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    created_at: new Date().toISOString(),
    retry_count: 0,
    ...action,
  };
  queue.push(nextAction);
  saveInventoryOfflineQueue(queue);
  return nextAction;
}

export function removeInventoryOfflineAction(actionId) {
  const nextQueue = loadInventoryOfflineQueue().filter((action) => action.id !== actionId);
  saveInventoryOfflineQueue(nextQueue);
  return nextQueue;
}

export function updateInventoryOfflineAction(actionId, updater) {
  const queue = loadInventoryOfflineQueue();
  const nextQueue = queue.map((action) => {
    if (action.id !== actionId) return action;
    return typeof updater === "function" ? updater(action) : { ...action, ...updater };
  });
  saveInventoryOfflineQueue(nextQueue);
  return nextQueue;
}

export function loadInventorySupportSnapshot() {
  return safeRead(SUPPORT_SNAPSHOT_KEY, null);
}

export function saveInventorySupportSnapshot(snapshot) {
  if (!snapshot) return;
  safeWrite(SUPPORT_SNAPSHOT_KEY, snapshot);
}

export function isOfflineRequestError(error) {
  if (!error) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!error.response) return true;
  const message = String(error.message || "").toLowerCase();
  return message.includes("network") || message.includes("timeout") || message.includes("failed");
}

export function buildOfflineActionSummary(action) {
  if (action.kind === "scan") {
    return `Scan ${action.payload?.scanned_value || ""}`.trim();
  }
  if (action.kind === "inventory") {
    return `Inventaire ${action.payload?.reference || action.payload?.inventory_date || ""}`.trim();
  }
  if (action.kind === "operation") {
    return `Operation ${action.payload?.reference || action.payload?.operation_kind || ""}`.trim();
  }
  return action.label || "Action hors ligne";
}
