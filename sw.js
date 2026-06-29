const CACHE = "pdfcanvas-v28";
const LOCAL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
// NOTE: no skipWaiting() here — a new SW waits until the page tells it to take over (page posts SKIP_WAITING),
// so we never yank the rug out from under an open session. The page then reloads on controllerchange.
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(LOCAL).catch(()=>{}))); });
self.addEventListener("activate", e => { self.clients.claim(); e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => k===CACHE ? null : caches.delete(k))))); });
self.addEventListener("message", e => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isDoc = req.mode === "navigate" || (url.origin === location.origin && url.pathname.endsWith(".html"));
  if (isDoc) {
    // network-first, BYPASSING the HTTP cache (HTML is served max-age=600) so a reload always pulls the freshest build; fall back to cache when offline.
    // Only cache a GOOD same-origin shell (r.ok && basic) — a 404/5xx during a deploy window resolves (doesn't reject) and would otherwise poison the offline fallback.
    e.respondWith(fetch(new Request(req.url, {cache: "no-store"})).then(r => { if (r && r.ok && r.type === "basic") { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })
                  .catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
  } else {
    // cache-first assets; only store a usable response (skip error bodies) so a transient bad fetch can't stick permanently in cache
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(resp => { if (resp && (resp.ok || resp.type === "opaque") && resp.status !== 404) { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return resp; })));
  }
});
