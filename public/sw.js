/**
 * Service Worker T-ERP Chef Chantier — offline-first.
 *
 * Stratégies :
 *  - Assets statiques (HTML/JS/CSS/fonts) → Cache First
 *  - API GET /api/cc/* → Network First avec fallback cache
 *  - API POST/PATCH /api/cc/* → délégué au client (IndexedDB queue + sync au retour réseau)
 *
 * Pas de Workbox (dépendance évitée). Implémentation minimale.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `terp-cc-static-${CACHE_VERSION}`;
const API_CACHE = `terp-cc-api-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(["/cc", "/manifest.json"]).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // POST/PATCH gérés côté client

  const url = new URL(request.url);

  // API GET → Network First + cache fallback
  if (url.pathname.startsWith("/api/cc/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Pages CC + assets → Cache First avec mise à jour réseau en arrière-plan
  if (url.pathname.startsWith("/cc") || url.pathname.startsWith("/_next/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

// Message handler : permet au client de demander la sync de la queue
self.addEventListener("message", (event) => {
  if (event.data === "SYNC_NOW") {
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: "SYNC_TRIGGERED" }));
    });
  }
});
