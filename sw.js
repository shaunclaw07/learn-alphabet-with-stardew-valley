// Service Worker der Lese-Schule: Precache aller Seiten + Fonts für volles Offline-Erlebnis.
// Bei NEUER PHASE: Seite zu APP_SHELL ergänzen UND CACHE_VERSION erhöhen.
const CACHE_VERSION = "sv-lesen-v7";
const PRECACHE = "precache-" + CACHE_VERSION;
const RUNTIME = "runtime-" + CACHE_VERSION;

// ─── Google-Fonts-URL (muss mit den <link>-Tags im HTML übereinstimmen) ───
const FONTS_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@400;600;700;800&display=swap";

const APP_SHELL = [
  "/index.html",
  "/phase1/lese-schule.html",
  "/phase2/phase2-schule.html",
  "/phase3/phase3-schule.html",
  "/phase4/phase4-schule.html",
  "/lehrplan.html",
  "/phase1/phase1-druckversion.html",
  "/phase2/phase2-druckversion.html",
  "/phase3/phase3-druckversion.html",
  "/phase4/phase4-druckversion.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/icon-180.png",
  "/icons/favicon-32.png",
];

// ─── Font-Precaching: Lädt Google-Fonts-CSS und cached WOFF2-Dateien ───
async function precacheFonts(cache) {
  try {
    const cssResp = await fetch(FONTS_CSS_URL);
    if (!cssResp.ok) return;
    const css = await cssResp.text();

    // Parse alle url(...)-Referenzen (WOFF2-Dateien auf fonts.gstatic.com)
    const fontUrls = [];
    const urlRe = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
    let m;
    while ((m = urlRe.exec(css)) !== null) {
      fontUrls.push(m[1]);
    }

    if (fontUrls.length === 0) return;

    // Fonts parallel laden und cachen
    await Promise.all(
      fontUrls.map(async (fontUrl) => {
        try {
          const resp = await fetch(fontUrl);
          if (resp.ok) await cache.put(fontUrl, resp);
        } catch (_) {
          // Font-Ladefehler sind nicht fatal — fällt auf Runtime-Cache zurück
        }
      })
    );

    // Auch die CSS selbst cachen
    await cache.put(FONTS_CSS_URL, cssResp.clone());
  } catch (_) {
    // Wenn Font-Precaching fehlschlägt, ist das okay — Runtime-Cache fängt's
  }
}

// ─── Install ─────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then(async (cache) => {
      // Ausfallsicher: pro Ressource cachen. cache.addAll() ist atomar — eine
      // einzige fehlende Datei ließe sonst die GESAMTE SW-Installation scheitern
      // und Chrome bietet dann keine Installation an.
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            await cache.add(url);
          } catch (_) {
            // Einzelne Ressource darf fehlen — Rest wird trotzdem gecached.
          }
        })
      );
      await precacheFonts(cache);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: alte Caches aufräumen ─────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────
function isFont(url) {
  return url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts: stale-while-revalidate
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
