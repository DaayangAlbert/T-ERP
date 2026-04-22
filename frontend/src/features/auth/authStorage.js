const AUTH_CHANGE_EVENT = "terp-auth-change";

const STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  tenantId: "tenantId",
  user: "authUser",
};

// Auth state is intentionally tab-scoped for now: tokens live in sessionStorage,
// while localStorage only remains as a one-time migration source for older sessions.
function hasLocalStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function hasSessionStorage() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function getLegacyStorage() {
  return hasLocalStorage() ? localStorage : null;
}

function getSessionStorageStore() {
  return hasSessionStorage() ? sessionStorage : null;
}

function parseUser(rawUser) {
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

function normalizeTenantId(user, tenantId) {
  if (user?.company_id != null && String(user.company_id).trim() !== "") {
    return String(user.company_id);
  }

  if (tenantId == null || String(tenantId).trim() === "") {
    return null;
  }

  return String(tenantId);
}

function readRawSession(storage) {
  if (!storage) {
    return null;
  }

  return {
    accessToken: storage.getItem(STORAGE_KEYS.accessToken),
    refreshToken: storage.getItem(STORAGE_KEYS.refreshToken),
    tenantId: storage.getItem(STORAGE_KEYS.tenantId),
    user: parseUser(storage.getItem(STORAGE_KEYS.user)),
  };
}

function normalizeSession(session) {
  const accessToken = session?.accessToken ?? session?.access_token ?? null;
  const refreshToken = session?.refreshToken ?? session?.refresh_token ?? null;
  const user = session?.user ?? null;

  if (!accessToken || !refreshToken || !user) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    user,
    tenantId: normalizeTenantId(user, session?.tenantId ?? session?.tenant_id ?? null),
  };
}

function removeSessionFromStorage(storage) {
  if (!storage) {
    return;
  }

  storage.removeItem(STORAGE_KEYS.accessToken);
  storage.removeItem(STORAGE_KEYS.refreshToken);
  storage.removeItem(STORAGE_KEYS.tenantId);
  storage.removeItem(STORAGE_KEYS.user);
}

function persistSessionToStorage(storage, session) {
  if (!storage || !session) {
    return;
  }

  storage.setItem(STORAGE_KEYS.accessToken, session.accessToken);
  storage.setItem(STORAGE_KEYS.refreshToken, session.refreshToken);
  storage.setItem(STORAGE_KEYS.user, JSON.stringify(session.user));

  if (session.tenantId) {
    storage.setItem(STORAGE_KEYS.tenantId, session.tenantId);
  } else {
    storage.removeItem(STORAGE_KEYS.tenantId);
  }
}

function migrateLegacySession() {
  const sessionStore = getSessionStorageStore();
  const legacyStore = getLegacyStorage();

  if (!sessionStore || !legacyStore) {
    return;
  }

  const existingSession = normalizeSession(readRawSession(sessionStore));
  if (existingSession) {
    removeSessionFromStorage(legacyStore);
    return;
  }

  const legacySession = normalizeSession(readRawSession(legacyStore));
  if (!legacySession) {
    removeSessionFromStorage(legacyStore);
    return;
  }

  persistSessionToStorage(sessionStore, legacySession);
  removeSessionFromStorage(legacyStore);
}

function emitAuthChange(session) {
  if (!hasLocalStorage() && !hasSessionStorage()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: session }));
}

export function getStoredSession() {
  if (!hasSessionStorage()) {
    return null;
  }

  migrateLegacySession();
  return normalizeSession(readRawSession(getSessionStorageStore()));
}

export function persistSession(session) {
  const normalized = normalizeSession(session);
  const sessionStore = getSessionStorageStore();
  const legacyStore = getLegacyStorage();

  if (!sessionStore) {
    return normalized;
  }

  if (!normalized) {
    clearStoredSession();
    return null;
  }

  persistSessionToStorage(sessionStore, normalized);
  removeSessionFromStorage(legacyStore);

  emitAuthChange(normalized);
  return normalized;
}

export function clearStoredSession() {
  const sessionStore = getSessionStorageStore();
  const legacyStore = getLegacyStorage();

  if (!sessionStore && !legacyStore) {
    return;
  }

  removeSessionFromStorage(sessionStore);
  removeSessionFromStorage(legacyStore);
  emitAuthChange(null);
}

export function getStoredAccessToken() {
  return getStoredSession()?.accessToken ?? null;
}

export function updateStoredAccessToken(accessToken) {
  const currentSession = getStoredSession();
  if (!currentSession || !accessToken) {
    clearStoredSession();
    return null;
  }

  return persistSession({ ...currentSession, accessToken });
}

export function updateStoredUser(user) {
  const currentSession = getStoredSession();
  if (!currentSession || !user) {
    return null;
  }

  return persistSession({ ...currentSession, user });
}

export function updateStoredTenantId(tenantId) {
  const currentSession = getStoredSession();
  if (!currentSession) {
    return null;
  }

  return persistSession({ ...currentSession, tenantId });
}

export function subscribeToAuthChanges(listener) {
  if (!hasLocalStorage() && !hasSessionStorage()) {
    return () => {};
  }

  const handleAuthEvent = (event) => {
    listener(event.detail ?? getStoredSession());
  };

  const handleStorageEvent = (event) => {
    if (event.key && Object.values(STORAGE_KEYS).includes(event.key)) {
      listener(getStoredSession());
    }
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handleAuthEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
