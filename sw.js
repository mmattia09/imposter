const CACHE = 'impostore-v13';
const CORE = ['./index.html', './style.css', './script.js', './data/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // Cache all packet files listed in manifest
    try {
      const manifest = await fetch('./data/manifest.json').then(r => r.json());
      await cache.addAll(manifest.map(name => `./data/${name}.json`));
    } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only handle GET requests for same-origin resources
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
