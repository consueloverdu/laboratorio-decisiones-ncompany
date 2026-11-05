const CACHE_NAME = "decisiones-demo-v7";
const CACHE_PREFIX = "decisiones-demo-";
const STATIC_ASSETS = ["./", "./index.html", "./styles.css?v=7", "./app.js?v=7", "./catalogo_modelos.json?v=7", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  const isFreshAsset = event.request.mode === "navigate" || /\.(?:html|js|css|json)$/.test(url.pathname);
  if (!isFreshAsset) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    return;
  }
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, { cache: "no-store" });
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      return (await caches.match(event.request)) || (event.request.mode === "navigate" ? await caches.match("./index.html") : Response.error());
    }
  })());
});
