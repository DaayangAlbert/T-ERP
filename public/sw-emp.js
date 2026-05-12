/**
 * Service Worker T-ERP Employé / Ouvrier — Bloc 0.
 *
 * Stratégies :
 *  - Assets statiques /emp + /_next/static → Cache First
 *  - API GET /api/emp/* (payslips, congés, profil) → Network First + cache
 *  - POST/PATCH : laissés au réseau (pas de saisie offline majeure côté EMP,
 *    contrairement au CC où le pointage offline est critique)
 *
 * Cache offline ciblé : derniers bulletins consultés + soldes congés + profil,
 * pour qu'un ouvrier en zone faible couverture (chantier Mfou par exemple) puisse
 * consulter son dernier bulletin sans réseau.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `terp-emp-static-${CACHE_VERSION}`;
const API_CACHE = `terp-emp-api-${CACHE_VERSION}`;

const PRECACHE_URLS = ["/emp", "/manifest-emp.json"];

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
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE && k.startsWith("terp-emp-"))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API GET /api/emp → Network First avec cache fallback (consultation offline)
  if (url.pathname.startsWith("/api/emp/")) {
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

  // Pages /emp + assets Next → Cache First avec revalidation arrière-plan
  if (url.pathname.startsWith("/emp") || url.pathname.startsWith("/_next/")) {
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

// Notifications push (bulletin disponible, congé validé, etc.)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "T-ERP", body: event.data.text() };
  }
  const title = payload.title || "T-ERP Employé";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/emp" },
    tag: payload.tag || "terp-emp",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/emp";
  event.waitUntil(self.clients.openWindow(target));
});
