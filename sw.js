const CACHE = "pdfcanvas-v23";
const LOCAL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(LOCAL).catch(()=>{}))); });
self.addEventListener("activate", e => { self.clients.claim(); e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => k===CACHE ? null : caches.delete(k))))); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isDoc = req.mode === "navigate" || (url.origin === location.origin && url.pathname.endsWith(".html"));
  if (isDoc) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
                  .catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(resp => { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return resp; })));
  }
});
