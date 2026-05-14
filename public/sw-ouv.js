/**
 * Service Worker T-ERP Ouvrier — Bloc 0 Ouvrier.
 *
 * Profil radicalement offline-first : les ouvriers BTP travaillent en 3G/4G
 * instable, parfois en zones sans réseau (carrières, chantiers reculés).
 * L'app doit fonctionner même 24h hors-ligne pour le pointage et la
 * consultation des bulletins/congés/missions.
 *
 * Stratégies :
 *   - Pages /ouv et assets statiques  → Stale While Revalidate
 *   - GET /api/ouv/*                  → Network First avec cache de secours
 *   - POST/PATCH pointage hors-ligne  → file IndexedDB + Background Sync
 *     (la file est gérée côté UI dans src/lib/ouv/offline-queue.ts ;
 *      ce SW expose juste l'event "sync" "ouv-clock-sync")
 *
 * Cache cible : derniers bulletins, soldes congés, missions actives,
 * affectation chantier, profil. Pas de selfies dans le cache (taille).
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `terp-ouv-static-${CACHE_VERSION}`;
const API_CACHE = `terp-ouv-api-${CACHE_VERSION}`;

const PRECACHE_URLS = ["/ouv-login", "/manifest-ouv.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE && k.startsWith("terp-ouv-"))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // POST /api/ouv/clock/* en cas de réseau coupé : retournés en 503 pour que
  // l'UI puisse les pousser dans la file IndexedDB. Le replay se fait via
  // l'event "sync" (Background Sync API).
  if (
    request.method !== "GET" &&
    url.pathname.startsWith("/api/ouv/")
  ) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ offline: true, queued: true }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  if (request.method !== "GET") return;

  // API GET /api/ouv → Network First avec cache fallback
  if (url.pathname.startsWith("/api/ouv/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Pages /ouv* + assets Next → Stale While Revalidate
  if (
    url.pathname.includes("/ouv") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname === "/manifest-ouv.json"
  ) {
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

// Background Sync — réservé pour le retry des pointages mis en file IndexedDB
// par l'UI (cf src/lib/ouv/offline-queue.ts livré en fn 1.2).
self.addEventListener("sync", (event) => {
  if (event.tag === "ouv-clock-sync") {
    event.waitUntil(
      self.clients
        .matchAll({ includeUncontrolled: true })
        .then((clients) =>
          clients.forEach((c) => c.postMessage({ type: "OUV_CLOCK_SYNC_REQUESTED" }))
        )
    );
  }
});
