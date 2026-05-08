// Sofra Service Worker
// Versiyon değiştir → istemcide eski cache temizlenir
const CACHE_VERSION = 'sofra-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  // Google Fonts CSS — offline için
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=DM+Sans:wght@300;400;500;600;700&display=swap',
];

// Yükleme: core asset'leri cache'le
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('cache fail', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// Aktivasyon: eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first, network'a düş
self.addEventListener('fetch', (event) => {
  // Sadece GET'i cache'le
  if (event.request.method !== 'GET') return;

  // chrome-extension vb. şemaları yoksay
  const url = new URL(event.request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          // Başarılı yanıtı arka planda cache'e güncelle (stale-while-revalidate)
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // network yoksa cache'e dön
      return cached || fetchPromise;
    })
  );
});
