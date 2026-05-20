/**
 * Service Worker global T-ERP (scope "/").
 *
 * Rôle : rendre l'application installable (PWA) sur tous les appareils et
 * fournir un app-shell offline minimal. Les espaces métier qui ont des besoins
 * offline avancés gardent leurs propres SW à scope plus précis :
 *   - /employe         → sw-emp.js
 *   - /chef-chantier   → sw.js
 *   - espace ouvrier   → sw-ouv.js (scope "/")
 * Le composant d'enregistrement (RegisterSW) n'installe ce SW global QUE hors
 * de ces zones pour éviter les conflits de scope.
 *
 * Stratégies :
 *   - Navigations (HTML)        → Network First + page offline de secours
 *   - Assets immuables Next/static, icônes, polices → Cache First
 *   - API (/api/*)              → réseau direct, jamais de cache (auth/données fraîches)
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `terp-app-static-${CACHE_VERSION}`;

const PRECACHE = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

const OFFLINE_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>T-ERP — hors ligne</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    background:#2A1B3D;color:#fff;text-align:center;padding:24px}
  .box{max-width:340px}
  .bars{display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:20px}
  .bars span{height:12px;border-radius:3px;background:linear-gradient(135deg,#C084FC,#A855F7)}
  .bars span:nth-child(1){width:120px}.bars span:nth-child(2){width:84px}.bars span:nth-child(3){width:48px}
  h1{font-size:18px;margin:0 0 8px}p{color:#cbb8e0;font-size:14px;line-height:1.5;margin:0 0 20px}
  button{background:#A855F7;color:#fff;border:0;border-radius:8px;padding:12px 20px;font-size:15px;font-weight:600;cursor:pointer}
</style></head><body><div class="box">
  <div class="bars"><span></span><span></span><span></span></div>
  <h1>Vous êtes hors ligne</h1>
  <p>Impossible de joindre T-ERP. Vérifiez votre connexion puis réessayez.</p>
  <button onclick="location.reload()">Réessayer</button>
</div></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("terp-app-") && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // tiers : laisser passer
  if (url.pathname.startsWith("/api/")) return; // API : réseau direct, pas de cache

  // Navigations (pages HTML) → Network First, fallback page offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
      )
    );
    return;
  }

  // Assets immuables (Next static, icônes, polices, images) → Cache First
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|css|js)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
