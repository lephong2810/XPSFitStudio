/* XPS Fit Studio service worker: install as an app and work offline.
   VERSION is updated by build_docs.py whenever the app files change. */
const VERSION = "50e41dfa91";
const CACHE = "xpsfit-" + VERSION;
const SHELL = [ "./", "index.html", "styles.css", "fonts.css", "i18n.js", "core.js", "app.js", "manifest.webmanifest", "vendor/plotly-2.27.0.min.js", "vendor/xlsx-0.18.5.full.min.js", "icons/logo.svg", "icons/favicon-64.png", "icons/icon-192.png", "icons/icon-512.png", "fonts/be-vietnam-pro-latin-400-normal.woff2", "fonts/be-vietnam-pro-latin-500-normal.woff2", "fonts/be-vietnam-pro-latin-600-normal.woff2", "fonts/be-vietnam-pro-latin-700-normal.woff2", "fonts/be-vietnam-pro-latin-ext-400-normal.woff2", "fonts/be-vietnam-pro-latin-ext-500-normal.woff2", "fonts/be-vietnam-pro-latin-ext-600-normal.woff2", "fonts/be-vietnam-pro-latin-ext-700-normal.woff2", "fonts/be-vietnam-pro-vietnamese-400-normal.woff2", "fonts/be-vietnam-pro-vietnamese-500-normal.woff2", "fonts/be-vietnam-pro-vietnamese-600-normal.woff2", "fonts/be-vietnam-pro-vietnamese-700-normal.woff2", "fonts/jetbrains-mono-latin-400-normal.woff2", "fonts/jetbrains-mono-latin-500-normal.woff2", "fonts/jetbrains-mono-latin-ext-400-normal.woff2", "fonts/jetbrains-mono-latin-ext-500-normal.woff2", "fonts/jetbrains-mono-vietnamese-400-normal.woff2", "fonts/jetbrains-mono-vietnamese-500-normal.woff2" ];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("xpsfit-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
    catch (err) { if (req.mode === "navigate") { const idx = await c.match("index.html"); if (idx) return idx; } throw err; }
  }));
});
