// ============ SERVICE WORKER: keeps the phrasebook on the phone so it opens and speaks without internet ============
// Typed-sentence translations go to MyMemory directly and are never cached. Bump VERSION after changing any file.
const VERSION = "malhae-v3";
const FONTS = "malhae-fonts";
const FILES = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Remove files from older versions (the font cache is kept)
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Google Fonts: saved copy first, so the typeface also shows offline
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONTS).then((c) => c.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        c.put(e.request, res.clone());
        return res;
      })))
    );
    return;
  }
  if (url.origin !== location.origin) return;
  // The app's own files: network first (so updates arrive), the saved copy when offline
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html")))
  );
});
