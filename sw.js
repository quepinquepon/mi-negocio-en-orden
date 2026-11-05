const CACHE_NAME = 'mneo-v7';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/storage.js',
  './js/inventory.js',
  './js/license.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalar y activar de inmediato
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(ASSETS.map(u => cache.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first para HTML/JS/CSS → siempre intenta traer la versión nueva
// Cache-first para el resto (íconos, etc.)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // No interceptar CDN externos
  if (url.includes('cdnjs.cloudflare.com') || url.includes('googleapis.com')) {
    return;
  }

  const isCore =
    event.request.mode === 'navigate' ||
    url.includes('.html') ||
    url.includes('.js') ||
    url.includes('.css') ||
    url.includes('manifest.json');

  if (isCore) {
    // NETWORK FIRST: pide al servidor, si falla usa caché
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
  } else {
    // CACHE FIRST para íconos y estáticos
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      }).catch(() => caches.match('./index.html'))
    );
  }
});

// Escuchar mensaje para forzar skipWaiting
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
