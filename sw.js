// sw.js
const CACHE_NAME = 'mark6-store-v7'; // bump this when you change caching logic

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        './',              // root entry
        './data.json',     // results data
        './manifest.json',
        './icon.png'
        // NOTE: DO NOT cache index.html explicitly here
      ])
    )
  );
  self.skipWaiting(); // activate this SW immediately [web:83]
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // remove old caches [web:84]
          }
        })
      )
    )
  );
  self.clients.claim(); // take control of existing clients [web:83]
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Network-first for HTML shell
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with the latest HTML for offline use
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          // If offline or network fails, fall back to cached HTML (if any)
          caches.match(event.request)
        )
    );
    return;
  }

  // 2. Cache-first for everything else (JSON, icon, manifest, etc.)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request);
    })
  );
});
