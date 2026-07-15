declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "savepixie-shell-v2";
const ASSETS_TO_CACHE = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            void caches
              .open(CACHE_NAME)
              .then((cache) => cache.put("/index.html", response.clone()));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match("/index.html");
          return (
            cached ??
            new Response("SavePixie is offline. Please reconnect and try again.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return caches.open(CACHE_NAME).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === "basic") {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(async () => {
            const fallback = await caches.match("/index.html");
            return fallback ?? new Response(null, { status: 503 });
          })
      );
    })
  );
});

export {};
