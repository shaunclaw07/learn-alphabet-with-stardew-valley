// Service Worker der Lese-Schule: Precache aller Seiten + Runtime-Cache für Fonts.
// Bei NEUER PHASE: Seite zu PRECACHE ergänzen UND CACHE_VERSION erhöhen.
const CACHE_VERSION = "sv-lesen-v2";
const PRECACHE = "precache-" + CACHE_VERSION;
const RUNTIME = "runtime-" + CACHE_VERSION;

const APP_SHELL = [
  "/index.html",
  "/phase1/lese-schule.html",
  "/phase2/phase2-schule.html",
  "/phase3/phase3-schule.html",
  "/phase4/phase4-schule.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/icon-180.png",
  "/icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isFont(url) {
  return url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts: stale-while-revalidate (opaque erlaubt)
  if (isFont(url)) {
    event.respondWith(
      caches.open(RUNTIME).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req).then((res) => {
            cache.put(req, res.clone()).catch(() => {});
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // Nur same-origin behandeln
  if (url.origin !== self.location.origin) return;

  // Cache-first, dann Netzwerk; Navigation offline → index.html
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        if (req.mode === "navigate") return caches.match("/index.html");
        return Response.error();
      });
    })
  );
});
